/**
 * L6 · cuenta y dinero (rediseño «Dos tintas»): /credits (precios como láminas, el popular con su sello),
 * /credits/success y /subscribe/success (un h1 en todos los estados, también sin session_id), /subscribe,
 * /settings y /referral. next-intl simulado: t(llave) devuelve la llave.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { CREDIT_PACKAGES, SUBSCRIPTION_PLANS } from "@/lib/pricing";

let parametros = new URLSearchParams();
const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn(), refresh: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => parametros,
  usePathname: () => "/credits",
}));

let sesion: { data: unknown; status: string } = { data: null, status: "unauthenticated" };
jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  useSession: () => sesion,
}));

import CreditsPage from "@/app/(main)/credits/page";
import CreditsSuccessPage from "@/app/(main)/credits/success/page";
import SubscribePage from "@/app/(main)/subscribe/page";
import SubscribeSuccessPage from "@/app/(main)/subscribe/success/page";
import SettingsPage from "@/app/(main)/settings/page";
import ReferralPage from "@/app/(main)/referral/page";

const fetchOriginal = global.fetch;

/** fetch simulado por ruta. */
function apis(respuestas: Record<string, { ok?: boolean; body: unknown }>) {
  const mock = jest.fn(async (url: string) => {
    const r = respuestas[url];
    if (!r) throw new Error(`fetch inesperado: ${url}`);
    return { ok: r.ok ?? true, json: async () => r.body };
  });
  global.fetch = mock as unknown as typeof fetch;
  return mock;
}

function unSoloH1() {
  const h1 = screen.getAllByRole("heading", { level: 1 });
  expect(h1).toHaveLength(1);
  return h1[0];
}

beforeEach(() => {
  parametros = new URLSearchParams();
  push.mockReset();
  sesion = { data: null, status: "unauthenticated" };
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = fetchOriginal;
  jest.restoreAllMocks();
});

describe("/credits", () => {
  beforeEach(() => {
    apis({ "/api/user/credits": { body: { credits: 7, freeReadingsLeft: 2 } } });
  });

  it("un solo h1 y el saldo en mono cuando llega", async () => {
    render(<CreditsPage />);
    expect(unSoloH1()).toHaveTextContent("title");
    const saldo = screen.getByRole("region", { name: "currentBalance" });
    await waitFor(() => expect(saldo).toHaveTextContent("7"));
    expect(saldo).toHaveAttribute("aria-busy", "false");
    expect(within(saldo).getByText("7", { exact: false })).toHaveClass("font-dato");
  });

  it("los costos de cada tirada son una lista de definiciones", () => {
    render(<CreditsPage />);
    const costos = screen.getByRole("region", { name: "costsTitle" });
    const dl = costos.querySelector("dl");
    expect(dl?.querySelectorAll("dt")).toHaveLength(4);
    expect(dl?.querySelectorAll("dd")).toHaveLength(4);
  });

  it("cada paquete es una lámina con su cifra en mono; sólo el popular lleva el sello rosa", () => {
    render(<CreditsPage />);
    const paquetes = within(screen.getByRole("region", { name: "packagesTitle" })).getAllByRole("listitem");
    expect(paquetes).toHaveLength(CREDIT_PACKAGES.length);

    CREDIT_PACKAGES.forEach((pkg, i) => {
      const lamina = paquetes[i];
      expect(within(lamina).getByRole("heading", { level: 3 })).toHaveTextContent(String(pkg.credits));
      expect(within(lamina).getByText(pkg.priceDisplay)).toHaveClass("font-dato");
      // El precio sigue en MXN, como hoy
      expect(pkg.priceDisplay).toMatch(/MXN/);
      if (pkg.popular) {
        expect(lamina).toHaveAttribute("data-popular", "true");
        const sello = within(lamina).getByText("popular");
        expect(sello).toHaveClass("bg-rosa-luz", "text-tinta");
        expect(lamina).toHaveClass("border-rosa");
      } else {
        expect(lamina).not.toHaveAttribute("data-popular");
        expect(within(lamina).queryByText("popular")).toBeNull();
      }
    });
    expect(CREDIT_PACKAGES.filter((p) => p.popular)).toHaveLength(1);
  });

  it("comprar llama al checkout con el paquete (cada botón nombra su paquete)", async () => {
    const mock = apis({
      "/api/user/credits": { body: { credits: 7, freeReadingsLeft: 0 } },
      "/api/stripe/checkout": { body: { error: "sin stripe en pruebas" } },
    });
    jest.spyOn(window, "alert").mockImplementation(() => {});
    render(<CreditsPage />);
    const botones = screen.getAllByRole("button", { name: /^buy · costCredits$/ });
    expect(botones).toHaveLength(CREDIT_PACKAGES.length);
    await act(async () => {
      fireEvent.click(botones[1]);
    });
    const llamada = mock.mock.calls.find(([url]) => url === "/api/stripe/checkout") as unknown as [string, RequestInit];
    expect(JSON.parse(String(llamada[1].body))).toEqual({ packageId: CREDIT_PACKAGES[1].id });
  });
});

describe("/credits/success", () => {
  it("sin session_id: un solo h1 (error del pago) y el aviso semántico", async () => {
    render(<CreditsSuccessPage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("error.title"));
    expect(screen.getByRole("alert")).toHaveTextContent("error.sessionNotFound");
    expect(screen.getByRole("link", { name: "error.retry" })).toHaveAttribute("href", "/credits");
  });

  it("con sesión pagada: un solo h1, los créditos en mono y el monto en MXN", async () => {
    parametros = new URLSearchParams("session_id=cs_test_1");
    apis({ "/api/stripe/session/cs_test_1": { body: { credits: 15, amountTotal: 9900, status: "complete" } } });
    render(<CreditsSuccessPage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("success.title"));
    expect(screen.getByText("+15")).toHaveClass("font-dato");
    expect(screen.getByText(/\$99\.00 MXN/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "success.startReading" })).toHaveAttribute("href", "/reading/new");
  });
});

describe("/subscribe/success", () => {
  it("sin session_id: un solo h1 y el aviso", async () => {
    render(<SubscribeSuccessPage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("success.errorTitle"));
    expect(screen.getByRole("alert")).toHaveTextContent("success.noSession");
  });

  it("pagada con créditos (?method=credits): da la bienvenida sin buscar una sesión de Stripe", async () => {
    parametros = new URLSearchParams("method=credits");
    const mock = apis({});
    render(<SubscribeSuccessPage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("success.title"));
    expect(screen.getByText("paidWithCredits")).toBeInTheDocument();
    expect(mock).not.toHaveBeenCalled();
  });

  it("con session_id válido: un solo h1 de bienvenida", async () => {
    parametros = new URLSearchParams("session_id=cs_sub");
    apis({ "/api/stripe/session/cs_sub": { body: {} } });
    render(<SubscribeSuccessPage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("success.title"));
    expect(screen.getByRole("link", { name: "success.goToDaily" })).toHaveAttribute("href", "/daily");
  });
});

describe("/subscribe", () => {
  const perfil = { fullName: "Ana López", zodiacSign: "Taurus", focusArea: "love", emailTime: "08:00" };

  it("sin suscripción: un h1, la lámina del plan con lo que incluye y el precio en mono", async () => {
    apis({
      "/api/profile": { body: { profile: perfil } },
      "/api/subscription": { body: { subscription: null } },
      "/api/user/credits": { body: { credits: 3 } },
    });
    render(<SubscribePage />);
    await waitFor(() => expect(screen.getByRole("region", { name: SUBSCRIPTION_PLANS[0].nameEs })).toBeInTheDocument());
    expect(unSoloH1()).toHaveTextContent("title");
    const plan = screen.getByRole("region", { name: SUBSCRIPTION_PLANS[0].nameEs });
    expect(within(plan).getAllByRole("listitem")).toHaveLength(SUBSCRIPTION_PLANS[0].featuresEs.length);
    expect(within(plan).getByText(SUBSCRIPTION_PLANS[0].priceDisplay)).toHaveClass("font-dato");
    // Con 3 créditos no alcanza: el botón de créditos está deshabilitado y aparece «comprar créditos»
    expect(screen.getByRole("button", { name: "needMoreCredits" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "buyCredits" })).toHaveAttribute("href", "/credits");
  });

  it("ya suscrito: un h1 y el portal de Stripe como enlace real (no <Link><Button/>)", async () => {
    apis({
      "/api/profile": { body: { profile: perfil } },
      "/api/subscription": {
        body: { subscription: { id: "s", status: "active", currentPeriodEnd: "2026-12-01T00:00:00Z", cancelAtPeriodEnd: true } },
      },
      "/api/user/credits": { body: { credits: 3 } },
    });
    render(<SubscribePage />);
    await waitFor(() => expect(unSoloH1()).toHaveTextContent("alreadySubscribed"));
    expect(screen.getByText("cancelsAtPeriodEnd")).toBeInTheDocument();
    const portal = screen.getByRole("link", { name: "manageSubscription" });
    expect(portal).toHaveAttribute("href", "/api/stripe/portal");
    expect(portal.querySelector("button")).toBeNull();
  });
});

describe("/settings", () => {
  beforeEach(() => {
    sesion = { data: { user: { id: "u1", email: "ana@arcana.local", name: "Ana" } }, status: "authenticated" };
  });

  it("un h1 y los datos como lista de definiciones con filetes", () => {
    render(<SettingsPage />);
    expect(unSoloH1()).toHaveTextContent("title");
    const cuenta = screen.getByRole("region", { name: "accountInfo" });
    expect(within(cuenta).getByText("ana@arcana.local").tagName).toBe("DD");
    expect(within(cuenta).getByText("Ana").tagName).toBe("DD");
  });

  it("el modal de borrar cuenta tiene su h2 y un campo con id explícito; confirma sólo con la palabra", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "deleteAccount" }));
    const dialogo = screen.getByRole("dialog");
    expect(within(dialogo).getByRole("heading", { level: 2 })).toHaveTextContent("deleteConfirmTitle");
    const campo = within(dialogo).getByLabelText("deleteConfirmText");
    expect(campo).toHaveAttribute("id", "settings-delete-confirm");
    const borrar = within(dialogo).getByRole("button", { name: "deleteAccount" });
    expect(borrar).toBeDisabled();
    // t() simulado devuelve la llave: la palabra de confirmación es "deleteConfirmWord"
    fireEvent.change(campo, { target: { value: "DELETECONFIRMWORD" } });
    expect(borrar).toBeDisabled();
  });
});

describe("/referral", () => {
  beforeEach(() => {
    sesion = { data: { user: { id: "u1" } }, status: "authenticated" };
    apis({ "/api/referral": { body: { referralCode: "ANA2026", referralCount: 2, referralCredits: 6 } } });
  });

  it("un h1, el código en mono y el enlace en un campo de sólo lectura con su etiqueta", async () => {
    render(<ReferralPage />);
    expect(unSoloH1()).toHaveTextContent("title");
    const codigo = await screen.findByText("ANA2026");
    expect(codigo).toHaveClass("font-dato");
    const campo = screen.getByLabelText("linkLabel");
    expect(campo).toHaveAttribute("readonly");
    expect((campo as HTMLInputElement).value).toMatch(/\/register\?ref=ANA2026$/);
    expect(screen.getByText("2").tagName).toBe("DD");
  });

  it("copiar escribe el enlace en el portapapeles y lo anuncia en una región viva", async () => {
    const writeText = jest.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ReferralPage />);
    await screen.findByText("ANA2026");
    const estado = screen.getByRole("status");
    expect(estado).toHaveTextContent("");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "copy" }));
    });
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/register\?ref=ANA2026$/));
    expect(estado).toHaveTextContent("copied");
    expect(screen.getByRole("button", { name: "copied" })).toBeInTheDocument();
  });
});

describe("dos tintas", () => {
  it("ninguna de estas pantallas pinta clases de la paleta vieja", async () => {
    apis({
      "/api/user/credits": { body: { credits: 7, freeReadingsLeft: 1 } },
      "/api/referral": { body: { referralCode: "X", referralCount: 0, referralCredits: 0 } },
    });
    sesion = { data: { user: { id: "u1", email: "a@b.c" } }, status: "authenticated" };
    for (const Pantalla of [CreditsPage, CreditsSuccessPage, SubscribeSuccessPage, SettingsPage, ReferralPage]) {
      const { container, unmount } = render(<Pantalla />);
      await act(async () => {});
      expect(container.innerHTML).not.toMatch(
        /\b(?:bg|text|border|from|to|via|ring|shadow)-(?:slate|purple|violet|amber|green|sky|red|pink)-\d|text-white|prose/
      );
      unmount();
    }
  });
});
