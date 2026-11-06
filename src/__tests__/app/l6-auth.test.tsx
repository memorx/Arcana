/**
 * L6 · pantallas de cuenta (rediseño «Dos tintas»): cada una con un solo h1 (el título del pliego), campos
 * con id explícito y su etiqueta, errores semánticos, y la lógica de siempre (signIn, Google condicionado).
 * next-intl está simulado en jest.setup.ts: t(llave) devuelve la llave.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { signIn } from "next-auth/react";

let parametros = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => parametros,
  usePathname: () => "/login",
}));

import LoginPage from "@/app/(auth)/login/page";
import RegisterPage from "@/app/(auth)/register/page";
import ForgotPasswordPage from "@/app/(auth)/forgot-password/page";
import ResetPasswordPage from "@/app/(auth)/reset-password/page";

const signInMock = signIn as jest.Mock;

function unSoloH1(texto: string) {
  const h1 = screen.getAllByRole("heading", { level: 1 });
  expect(h1).toHaveLength(1);
  expect(h1[0]).toHaveTextContent(texto);
  return h1[0];
}

const fetchOriginal = global.fetch;

afterEach(() => {
  global.fetch = fetchOriginal;
});

beforeEach(() => {
  parametros = new URLSearchParams();
  signInMock.mockReset();
  delete process.env.NEXT_PUBLIC_GOOGLE_ENABLED;
});

describe("/login", () => {
  it("tiene un solo h1 y nombra su sección con él", () => {
    render(<LoginPage />);
    const h1 = unSoloH1("loginTitle");
    expect(h1.id).toBe("login-titulo");
    expect(screen.getByRole("region", { name: "loginTitle" })).toBeInTheDocument();
  });

  it("los campos tienen id explícito, etiqueta y autocompletado", () => {
    render(<LoginPage />);
    const correo = screen.getByLabelText("email");
    const clave = screen.getByLabelText("password");
    expect(correo).toHaveAttribute("id", "login-email");
    expect(correo).toHaveAttribute("autocomplete", "email");
    expect(clave).toHaveAttribute("id", "login-password");
    expect(clave).toHaveAttribute("autocomplete", "current-password");
    expect(correo).toBeRequired();
  });

  it("conserva los enlaces a recuperar contraseña y a crear cuenta", () => {
    render(<LoginPage />);
    expect(screen.getByRole("link", { name: "forgotPassword" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.getByRole("link", { name: "registerButton" })).toHaveAttribute("href", "/register");
  });

  it("credenciales inválidas → aviso semántico (role=alert)", async () => {
    signInMock.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "loginButton" }));

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("errors.invalidCredentials");
    expect(signInMock).toHaveBeenCalledWith("credentials", { email: "a@b.c", password: "x", redirect: false });
  });

  it("el botón de Google sólo existe si está encendido", () => {
    const { unmount } = render(<LoginPage />);
    expect(screen.queryByRole("button", { name: /continueWithGoogle/ })).not.toBeInTheDocument();
    unmount();

    process.env.NEXT_PUBLIC_GOOGLE_ENABLED = "true";
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /continueWithGoogle/ }));
    expect(signInMock).toHaveBeenCalledWith("google", { callbackUrl: "/dashboard" });
  });

  it("un ?error= de Auth.js también se avisa", () => {
    parametros = new URLSearchParams("error=CredentialsSignin");
    render(<LoginPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("errors.invalidCredentials");
  });
});

describe("/register", () => {
  it("un solo h1 y los cuatro campos con id explícito", () => {
    render(<RegisterPage />);
    unSoloH1("registerTitle");
    expect(screen.getByLabelText("nameOptional")).toHaveAttribute("id", "register-name");
    expect(screen.getByLabelText("email")).toHaveAttribute("id", "register-email");
    expect(screen.getByLabelText("password")).toHaveAttribute("id", "register-password");
    expect(screen.getByLabelText("confirmPassword")).toHaveAttribute("id", "register-confirm");
  });

  it("contraseñas distintas → aviso, sin llamar a la API", () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    render(<RegisterPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "a@b.c" } });
    fireEvent.change(screen.getByLabelText("password"), { target: { value: "123456" } });
    fireEvent.change(screen.getByLabelText("confirmPassword"), { target: { value: "654321" } });
    fireEvent.click(screen.getByRole("button", { name: "registerButton" }));

    expect(screen.getByRole("alert")).toHaveTextContent("errors.passwordMismatch");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enlaza términos, privacidad e iniciar sesión", () => {
    render(<RegisterPage />);
    expect(screen.getByRole("link", { name: "termsLink" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "privacyLink" })).toHaveAttribute("href", "/privacy");
    expect(screen.getByRole("link", { name: "loginButton" })).toHaveAttribute("href", "/login");
  });
});

describe("/forgot-password", () => {
  it("un solo h1; al enviar, el h1 pasa a «revisa tu correo» y queda el enlace de vuelta", async () => {
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({}) })) as jest.Mock;
    render(<ForgotPasswordPage />);
    unSoloH1("forgotPasswordTitle");
    expect(screen.getByLabelText("email")).toHaveAttribute("id", "forgot-email");

    fireEvent.change(screen.getByLabelText("email"), { target: { value: "a@b.c" } });
    fireEvent.click(screen.getByRole("button", { name: "sendResetLink" }));

    await waitFor(() => unSoloH1("resetLinkSent"));
    // Un <Link> con aspecto de botón, no un <button> dentro de un <a>
    const volver = screen.getByRole("link", { name: "backToLogin" });
    expect(volver).toHaveAttribute("href", "/login");
    expect(volver.querySelector("button")).toBeNull();
  });

  it("un error de la API se avisa traducido", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, json: async () => ({}) })) as jest.Mock;
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("email"), { target: { value: "a@b.c" } });
    fireEvent.click(screen.getByRole("button", { name: "sendResetLink" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.generic");
  });
});

describe("/reset-password", () => {
  it("sin token: un solo h1 (enlace no válido) y el enlace para pedir otro", () => {
    render(<ResetPasswordPage />);
    unSoloH1("invalidLinkTitle");
    expect(screen.getByRole("link", { name: "requestNewLink" })).toHaveAttribute("href", "/forgot-password");
  });

  it("con token: un solo h1 y los dos campos con id explícito", () => {
    parametros = new URLSearchParams("token=abc");
    render(<ResetPasswordPage />);
    unSoloH1("resetPasswordTitle");
    expect(screen.getByLabelText("newPassword")).toHaveAttribute("id", "reset-password");
    expect(screen.getByLabelText("confirmNewPassword")).toHaveAttribute("id", "reset-confirm");
  });
});

describe("pliego en dos tintas", () => {
  it("sin clases de la paleta vieja en las cuatro pantallas", () => {
    for (const Pantalla of [LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage]) {
      const { container, unmount } = render(<Pantalla />);
      expect(container.innerHTML).not.toMatch(/\b(?:bg|text|border|from|to|via|ring)-(?:slate|purple|amber|red)-\d/);
      unmount();
    }
  });

  it("el grabado de adorno va con alt vacío", () => {
    const { container } = render(<LoginPage />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    expect(img?.getAttribute("src")).toMatch(/^\/cartas\/rws-tarot-01-magician-tinta\.webp$/);
  });
});
