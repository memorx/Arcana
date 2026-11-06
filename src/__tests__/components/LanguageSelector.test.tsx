import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LanguageSelector } from "@/components/ui/LanguageSelector";
import { recargarPagina } from "@/components/ui/recargar-pagina";

// jest.setup.ts: useLocale() devuelve "es" y useTranslations() la llave.
jest.mock("@/components/ui/recargar-pagina", () => ({ recargarPagina: jest.fn() }));

const recargar = recargarPagina as jest.Mock;
const fetchSimulado = jest.fn();

beforeEach(() => {
  recargar.mockReset();
  fetchSimulado.mockReset();
  global.fetch = fetchSimulado as unknown as typeof fetch;
});

describe("LanguageSelector", () => {
  it("al elegir otro idioma guarda la cookie y recarga la página completa (no depende del refresh RSC)", async () => {
    fetchSimulado.mockResolvedValue({ ok: true, status: 200 });
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("button", { name: /\bEN$/ }));

    await waitFor(() => expect(recargar).toHaveBeenCalledTimes(1));
    expect(fetchSimulado).toHaveBeenCalledWith(
      "/api/locale",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ locale: "en" }) })
    );
    // Mientras recarga, el selector no acepta otro clic.
    expect(screen.getByRole("button", { name: "Change language" })).toBeDisabled();
  });

  it("el idioma actual no hace nada: cierra la lista sin pedir ni recargar", () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("button", { name: /\bES$/ }));
    expect(fetchSimulado).not.toHaveBeenCalled();
    expect(recargar).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /\bEN$/ })).toBeNull();
  });

  it("si el servidor no guarda el idioma, no recarga y el selector vuelve a estar disponible", async () => {
    const consola = jest.spyOn(console, "error").mockImplementation(() => {});
    fetchSimulado.mockResolvedValue({ ok: false, status: 500 });
    render(<LanguageSelector />);
    fireEvent.click(screen.getByRole("button", { name: "Change language" }));
    fireEvent.click(screen.getByRole("button", { name: /\bEN$/ }));

    await waitFor(() => expect(consola).toHaveBeenCalled());
    expect(recargar).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Change language" })).toBeEnabled();
    consola.mockRestore();
  });

  it("la variante del menú móvil usa el mismo camino", async () => {
    fetchSimulado.mockResolvedValue({ ok: true, status: 200 });
    render(<LanguageSelector variant="inline" />);
    expect(screen.getByRole("button", { name: /Español ES/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /English EN/ }));
    await waitFor(() => expect(recargar).toHaveBeenCalledTimes(1));
  });
});
