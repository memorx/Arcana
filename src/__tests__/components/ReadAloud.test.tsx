import { render, screen, fireEvent, act } from "@testing-library/react";
import { ReadAloud, pickVoice, splitForSpeech } from "@/components/reading/ReadAloud";

const voice = (lang: string, name = lang) => ({ lang, name }) as unknown as SpeechSynthesisVoice;

class MockUtterance {
  text: string;
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

const installSpeech = (voices: SpeechSynthesisVoice[]) => {
  const synth = {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn(() => voices),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: MockUtterance, configurable: true, writable: true });
  // The component creates utterances with the global constructor
  (global as unknown as { SpeechSynthesisUtterance: typeof MockUtterance }).SpeechSynthesisUtterance = MockUtterance;
  return synth;
};

const removeSpeech = () => {
  delete (window as unknown as Record<string, unknown>).speechSynthesis;
  delete (window as unknown as Record<string, unknown>).SpeechSynthesisUtterance;
};

describe("pickVoice (F-65)", () => {
  const voices = [voice("en-GB"), voice("es-ES"), voice("en-US"), voice("es_MX"), voice("es-US")];

  it("prefers es-MX for Spanish, accepting the underscore form", () => {
    expect(pickVoice(voices, "es")?.lang).toBe("es_MX");
  });

  it("falls back to Latin American Spanish, then any es-* voice", () => {
    expect(pickVoice([voice("es-ES"), voice("es-US")], "es")?.lang).toBe("es-US");
    expect(pickVoice([voice("en-US"), voice("es-ES")], "es")?.lang).toBe("es-ES");
  });

  it("prefers en-US for English, then any en-* voice", () => {
    expect(pickVoice(voices, "en")?.lang).toBe("en-US");
    expect(pickVoice([voice("es-MX"), voice("en-GB")], "en")?.lang).toBe("en-GB");
  });

  it("returns null when there's no voice for the language", () => {
    expect(pickVoice([voice("fr-FR")], "es")).toBeNull();
  });
});

describe("splitForSpeech (F-65)", () => {
  it("keeps each short paragraph as one utterance and drops empty lines", () => {
    expect(splitForSpeech("Primer párrafo.\n\n\nSegundo párrafo.")).toEqual(["Primer párrafo.", "Segundo párrafo."]);
  });

  it("strips markdown so it isn't read out loud", () => {
    expect(splitForSpeech("## La Torre\n**Cambio** y _calma_\n- una idea")).toEqual(["La Torre", "Cambio y calma", "una idea"]);
  });

  it("splits long paragraphs into chunks no longer than the limit, by sentence", () => {
    const sentence = "Esta es una oración de prueba con varias palabras.";
    const paragraph = Array.from({ length: 12 }, () => sentence).join(" ");

    const chunks = splitForSpeech(paragraph, 120);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(120);
      expect(chunk.endsWith(".")).toBe(true);
    }
    expect(chunks.join(" ")).toBe(paragraph);
  });

  it("cuts a single very long sentence at commas or spaces", () => {
    const long = Array.from({ length: 40 }, (_, i) => `palabra${i}`).join(", ");

    const chunks = splitForSpeech(long, 80);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.length).toBeLessThanOrEqual(80);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(long);
  });
});

describe("ReadAloud (F-65)", () => {
  afterEach(removeSpeech);

  it("renders nothing when the browser has no speech synthesis", () => {
    removeSpeech();

    const { container } = render(<ReadAloud text="Hola" locale="es" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("speaks the text in chunks with the es-MX voice", () => {
    const synth = installSpeech([voice("es-ES"), voice("es-MX"), voice("en-US")]);
    render(<ReadAloud text={"Primer párrafo.\n\nSegundo párrafo."} locale="es" />);

    fireEvent.click(screen.getByRole("button", { name: "play" }));

    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    const first = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(first.text).toBe("Primer párrafo.");
    expect(first.lang).toBe("es-MX");
    expect(first.voice?.lang).toBe("es-MX");
  });

  it("uses an English voice for the en locale", () => {
    const synth = installSpeech([voice("es-MX"), voice("en-GB"), voice("en-US")]);
    render(<ReadAloud text="Hello there." locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "play" }));

    expect((synth.speak.mock.calls[0][0] as MockUtterance).voice?.lang).toBe("en-US");
  });

  it("pauses, resumes and stops with labelled buttons", () => {
    const synth = installSpeech([voice("es-MX")]);
    render(<ReadAloud text="Uno. Dos." locale="es" />);

    fireEvent.click(screen.getByRole("button", { name: "play" }));
    fireEvent.click(screen.getByRole("button", { name: "pause" }));
    expect(synth.pause).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "resume" }));
    expect(synth.resume).toHaveBeenCalled();

    synth.cancel.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "stop" }));
    expect(synth.cancel).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "play" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "stop" })).not.toBeInTheDocument();
  });

  it("goes back to idle when the last utterance ends", () => {
    const synth = installSpeech([voice("es-MX")]);
    render(<ReadAloud text={"Uno.\n\nDos."} locale="es" />);

    fireEvent.click(screen.getByRole("button", { name: "play" }));
    const last = synth.speak.mock.calls[1][0] as MockUtterance;
    act(() => last.onend?.());

    expect(screen.getByRole("button", { name: "play" })).toBeInTheDocument();
  });

  it("stops speaking when unmounted", () => {
    const synth = installSpeech([voice("es-MX")]);
    const { unmount } = render(<ReadAloud text="Uno." locale="es" />);
    fireEvent.click(screen.getByRole("button", { name: "play" }));
    synth.cancel.mockClear();

    unmount();

    expect(synth.cancel).toHaveBeenCalledTimes(1);
  });

  it("doesn't cancel other speech on unmount if it wasn't speaking", () => {
    const synth = installSpeech([voice("es-MX")]);
    const { unmount } = render(<ReadAloud text="Uno." locale="es" />);

    unmount();

    expect(synth.cancel).not.toHaveBeenCalled();
  });
});
