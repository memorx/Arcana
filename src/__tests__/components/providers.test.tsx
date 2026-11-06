/**
 * La sesión del servidor llega al SessionProvider (Fable 10): el layout raíz llama a `auth()` y se la pasa a
 * <Providers session>, que la entrega a <SessionProvider session>. Con eso el primer render ya sabe si hay sesión: la
 * cabecera no pasa por «loading» (un hueco de 112 px) ni salta al enlace «Iniciar sesión».
 * El SessionProvider real (ESM) no carga en Jest; su comportamiento con `session` se comprueba en e2e
 * (auth.spec, flujos/registro.spec) y en la medida de CLS de la portada.
 */
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { render, screen } from "@testing-library/react";

const mockSessionProvider = jest.fn(({ children }: { children: ReactNode; session?: unknown }) => <>{children}</>);
jest.mock("next-auth/react", () => ({
  SessionProvider: (props: { children: ReactNode; session?: unknown }) => mockSessionProvider(props),
}));

const ANA = {
  user: { id: "u1", name: "Ana", email: "ana@example.com", credits: 3, freeReadingsLeft: 1 },
  expires: "2099-01-01T00:00:00.000Z",
};
let mockSesion: typeof ANA | null = null;
jest.mock("@/lib/auth", () => ({ auth: jest.fn(async () => mockSesion) }));
jest.mock("next-intl/server", () => ({
  getLocale: jest.fn(async () => "es"),
  getMessages: jest.fn(async () => ({})),
  getTranslations: jest.fn(async () => (key: string) => key),
}));

import { Providers } from "@/components/providers";
import RootLayout from "@/app/layout";

/** El elemento <Providers> dentro del árbol que devuelve el layout. */
function buscarProviders(nodo: ReactNode): ReactElement<{ session?: unknown }> | null {
  if (Array.isArray(nodo)) {
    for (const hijo of nodo) {
      const hallado = buscarProviders(hijo);
      if (hallado) return hallado;
    }
    return null;
  }
  if (!isValidElement(nodo)) return null;
  if (nodo.type === Providers) return nodo as ReactElement<{ session?: unknown }>;
  return buscarProviders((nodo.props as { children?: ReactNode }).children);
}

describe("Providers", () => {
  it("entrega la sesión tal cual al SessionProvider (también null: invitado)", () => {
    const { rerender } = render(
      <Providers session={null}>
        <p>hola</p>
      </Providers>
    );
    expect(screen.getByText("hola")).toBeInTheDocument();
    expect(mockSessionProvider.mock.calls.at(-1)![0]).toHaveProperty("session", null);

    rerender(
      <Providers session={ANA}>
        <p>hola</p>
      </Providers>
    );
    expect(mockSessionProvider.mock.calls.at(-1)![0]).toHaveProperty("session", ANA);
  });
});

describe("RootLayout", () => {
  it.each([
    ["invitado", null],
    ["con sesión", ANA],
  ])("pasa la sesión del servidor a <Providers> (%s)", async (_, sesion) => {
    mockSesion = sesion;
    const arbol = await RootLayout({ children: <main /> });
    const providers = buscarProviders(arbol);
    expect(providers).not.toBeNull();
    expect(providers!.props.session).toBe(sesion);
  });
});
