"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export interface ReadAloudProps {
  /** Text to read (paragraphs separated by line breaks; light markdown is stripped). */
  text: string;
  /** "es" or "en": picks the voice. */
  locale: string;
  className?: string;
}

type Status = "idle" | "playing" | "paused";

/** Voice preference per language: exact locales first, then any voice of the language. */
const VOICE_PREFERENCES: Record<"es" | "en", string[]> = {
  es: ["es-mx", "es-us", "es-419"],
  en: ["en-us"],
};

const normalizeLang = (lang: string) => lang.replace(/_/g, "-").toLowerCase();

/** es-MX (then Latin American Spanish) > any es-*; en-US > any en-*. Null if there's no voice for the language. */
export function pickVoice<V extends { lang: string }>(voices: V[], locale: string): V | null {
  const language: "es" | "en" = locale.toLowerCase().startsWith("en") ? "en" : "es";

  for (const preferred of VOICE_PREFERENCES[language]) {
    const exact = voices.find((v) => normalizeLang(v.lang) === preferred);
    if (exact) return exact;
  }
  return voices.find((v) => normalizeLang(v.lang).split("-")[0] === language) ?? null;
}

/** Strips the markdown the model sometimes uses so it isn't read out loud. */
function cleanForSpeech(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/[*_`~]+/g, "")
    .replace(/[ \t]+/g, " ");
}

/**
 * Splits text into short utterances. Chrome stops speaking a single utterance
 * after ~15 seconds, so each paragraph is split into sentences and grouped into
 * chunks of at most `maxLength` characters (long sentences are cut at commas or spaces).
 */
export function splitForSpeech(text: string, maxLength = 220): string[] {
  const chunks: string[] = [];

  const pushLong = (sentence: string) => {
    let rest = sentence.trim();
    while (rest.length > maxLength) {
      const head = rest.slice(0, maxLength + 1);
      // Prefer a comma or semicolon in the second half, then a space, then a hard cut.
      const punctuation = Math.max(head.lastIndexOf(", "), head.lastIndexOf("; "));
      const space = head.lastIndexOf(" ");
      const end = punctuation >= maxLength / 2 ? punctuation + 1 : space > 0 ? space : maxLength;
      chunks.push(rest.slice(0, end).trim());
      rest = rest.slice(end).trim();
    }
    if (rest) chunks.push(rest);
  };

  for (const paragraph of cleanForSpeech(text).split(/\n+/)) {
    const clean = paragraph.trim();
    if (!clean) continue;
    if (clean.length <= maxLength) {
      chunks.push(clean);
      continue;
    }

    const sentences = clean.match(/[^.!?…]+[.!?…]+["'»”)\]]*|[^.!?…]+$/g) ?? [clean];
    let current = "";
    for (const raw of sentences) {
      const sentence = raw.trim();
      if (!sentence) continue;
      if (sentence.length > maxLength) {
        if (current) chunks.push(current);
        current = "";
        pushLong(sentence);
      } else if (!current) {
        current = sentence;
      } else if (current.length + 1 + sentence.length <= maxLength) {
        current = `${current} ${sentence}`;
      } else {
        chunks.push(current);
        current = sentence;
      }
    }
    if (current) chunks.push(current);
  }

  return chunks;
}

/**
 * Play / pause / stop reading a text aloud with the browser's speech synthesis.
 * Renders nothing where speechSynthesis isn't available (checked after mount, so
 * the server and first client render match). Stops speaking when unmounted.
 */
export function ReadAloud({ text, locale, className }: ReadAloudProps) {
  const t = useTranslations("readAloud");
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  // Each play gets an id; events from a cancelled run are ignored.
  const runRef = useRef(0);
  const speakingRef = useRef(false);

  useEffect(() => {
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance === "undefined") return;

    const synth = window.speechSynthesis;
    setSupported(true);

    const loadVoices = () => {
      voicesRef.current = synth.getVoices();
    };
    loadVoices();
    synth.addEventListener?.("voiceschanged", loadVoices);

    const stopIfSpeaking = () => {
      if (!speakingRef.current) return;
      runRef.current += 1;
      speakingRef.current = false;
      synth.cancel();
    };
    window.addEventListener("pagehide", stopIfSpeaking);

    return () => {
      synth.removeEventListener?.("voiceschanged", loadVoices);
      window.removeEventListener("pagehide", stopIfSpeaking);
      stopIfSpeaking();
    };
  }, []);

  if (!supported) return null;

  const finish = (run: number) => {
    if (runRef.current !== run) return;
    speakingRef.current = false;
    setStatus("idle");
  };

  const play = () => {
    const synth = window.speechSynthesis;
    const chunks = splitForSpeech(text);
    if (chunks.length === 0) return;

    const run = ++runRef.current;
    synth.cancel();

    const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
    const voice = pickVoice(voices, locale);
    const lang = voice?.lang ?? (locale.startsWith("en") ? "en-US" : "es-MX");

    chunks.forEach((chunk, index) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.lang = lang;
      if (voice) utterance.voice = voice;
      utterance.onerror = () => finish(run);
      if (index === chunks.length - 1) utterance.onend = () => finish(run);
      synth.speak(utterance);
    });

    speakingRef.current = true;
    setStatus("playing");
  };

  const pause = () => {
    window.speechSynthesis.pause();
    setStatus("paused");
  };

  const resume = () => {
    window.speechSynthesis.resume();
    setStatus("playing");
  };

  const stop = () => {
    runRef.current += 1;
    speakingRef.current = false;
    window.speechSynthesis.cancel();
    setStatus("idle");
  };

  const buttonClass =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 text-sm font-medium text-slate-200 hover:border-purple-500/50 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 motion-safe:transition-colors";

  return (
    <div role="group" aria-label={t("label")} className={cn("flex items-center gap-2", className)}>
      {status === "playing" ? (
        <button type="button" onClick={pause} aria-label={t("pause")} className={cn(buttonClass, "px-3")}>
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
          </svg>
          <span>{t("pauseShort")}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={status === "paused" ? resume : play}
          aria-label={status === "paused" ? t("resume") : t("play")}
          className={cn(buttonClass, "px-3")}
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <span>{status === "paused" ? t("resumeShort") : t("playShort")}</span>
        </button>
      )}

      {status !== "idle" && (
        <button type="button" onClick={stop} aria-label={t("stop")} className={cn(buttonClass, "w-9")}>
          <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h12v12H6z" />
          </svg>
        </button>
      )}

      {status === "playing" && (
        <span aria-hidden="true" className="flex h-4 items-end gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1 rounded-sm bg-amber-400/80 motion-safe:animate-pulse"
              style={{ height: `${[60, 100, 40][i]}%`, animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      )}

      <span className="sr-only" aria-live="polite">
        {status === "playing" ? t("playing") : status === "paused" ? t("paused") : ""}
      </span>
    </div>
  );
}
