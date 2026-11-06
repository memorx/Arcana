/**
 * InstallPWA en dos tintas: sólo aparece cuando el navegador ofrece instalar; es una banda de tinta sticky
 * (no fixed: al final de la página ocupa su lugar y no tapa contenido en móvil), con nombre accesible y
 * botones de 44 px; instalar y «después» conservan su lógica.
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { InstallPWA } from "@/components/ui/InstallPWA";

function ofrecerInstalar(outcome: "accepted" | "dismissed" = "accepted") {
  const evento = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: string }>;
  };
  evento.prompt = jest.fn(async () => {});
  evento.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(evento);
  });
  return evento;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe("InstallPWA", () => {
  it("no se ve hasta que el navegador ofrece instalar", () => {
    render(<InstallPWA />);
    expect(screen.queryByRole("complementary")).toBeNull();
    const evento = ofrecerInstalar();
    expect(evento.defaultPrevented).toBe(true);
    expect(screen.getByRole("complementary", { name: "installTitle" })).toBeInTheDocument();
  });

  it("es una banda de tinta sticky al pie (no fixed) y con botones de 44 px", () => {
    render(<InstallPWA />);
    ofrecerInstalar();
    const banda = screen.getByRole("complementary");
    expect(banda).toHaveClass("suelo-tinta", "sticky", "bottom-0");
    expect(banda.className).not.toMatch(/\bfixed\b/);
    expect(banda.className).not.toMatch(/purple|text-white/);
    for (const boton of screen.getAllByRole("button")) expect(boton).toHaveClass("min-h-11");
  });

  it("instalar abre el diálogo del navegador y, si acepta, se va", async () => {
    render(<InstallPWA />);
    const evento = ofrecerInstalar("accepted");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "install" }));
    });
    expect(evento.prompt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("complementary")).toBeNull();
  });

  it("«después» la cierra y lo recuerda en la sesión", () => {
    render(<InstallPWA />);
    ofrecerInstalar();
    fireEvent.click(screen.getByRole("button", { name: "later" }));
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(sessionStorage.getItem("pwa-install-dismissed")).toBe("true");
  });
});
