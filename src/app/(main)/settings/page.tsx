"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui";
import { Etiqueta } from "@/components/tinta/Etiqueta";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("settings");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const encabezado = (
    <header className="grid gap-3.5">
      <Etiqueta>{t("eyebrow")}</Etiqueta>
      <h1 className="text-[clamp(2rem,1.4rem+2vw,3.2rem)] leading-[1.05]">{t("title")}</h1>
    </header>
  );

  // Redirect if not authenticated
  if (status === "loading") {
    return (
      <div aria-busy="true" className="grid max-w-[760px] gap-10">
        {encabezado}
        <div aria-hidden="true" className="grid gap-6">
          <div className="h-40 bg-papel-hondo motion-safe:animate-pulse" />
          <div className="h-40 bg-papel-hondo motion-safe:animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const expectedConfirmText = t("deleteConfirmWord");
  const isConfirmValid = confirmText.toUpperCase() === expectedConfirmText;

  const handleDeleteAccount = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error deleting account");
      }

      // Sign out and redirect to home
      await signOut({ callbackUrl: "/" });
    } catch {
      setError(t("deleteError"));
      setIsDeleting(false);
    }
  };

  const cerrarModal = () => {
    setIsDeleteModalOpen(false);
    setConfirmText("");
    setError(null);
  };

  return (
    <div className="grid max-w-[760px] gap-[clamp(40px,7vh,64px)]">
      {encabezado}

      {/* Datos de la cuenta */}
      <section aria-labelledby="cuenta-titulo" className="grid gap-5">
        <h2 id="cuenta-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1]">
          {t("accountInfo")}
        </h2>
        <dl className="border-y border-tinta">
          <div className="grid gap-1 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
            <dt className="font-dato text-xs tracking-[0.12em] text-grafito uppercase">{t("email")}</dt>
            <dd className="break-words text-[1.0625rem]">{session?.user?.email}</dd>
          </div>
          {session?.user?.name && (
            <div className="grid gap-1 border-t border-tinta/15 py-4 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-baseline sm:gap-6">
              <dt className="font-dato text-xs tracking-[0.12em] text-grafito uppercase">{t("name")}</dt>
              <dd className="break-words text-[1.0625rem]">{session.user.name}</dd>
            </div>
          )}
        </dl>
      </section>

      {/* Zona de peligro */}
      <section aria-labelledby="peligro-titulo" className="grid gap-4 border-t-2 border-error pt-6">
        <h2 id="peligro-titulo" className="text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1] text-error">
          {t("dangerZone")}
        </h2>
        <p className="max-w-[60ch] text-grafito">{t("deleteWarning")}</p>
        <div>
          <Button variant="peligro" onClick={() => setIsDeleteModalOpen(true)}>
            {t("deleteAccount")}
          </Button>
        </div>
      </section>

      {/* Delete Confirmation Modal (sobre tinta) */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) cerrarModal();
        }}
      >
        <ModalHeader>
          <h2 className="text-[1.6rem] leading-tight text-letra-error">{t("deleteConfirmTitle")}</h2>
        </ModalHeader>
        <ModalBody>
          <p className="mb-6 text-letra-suave">{t("deleteWarning")}</p>
          <Input
            id="settings-delete-confirm"
            label={t("deleteConfirmText")}
            placeholder={t("deleteConfirmPlaceholder")}
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
          />
          {error && (
            <p role="alert" className="mt-3 text-sm text-letra-error">
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="linea" onClick={cerrarModal} disabled={isDeleting}>
            {t("cancel")}
          </Button>
          <Button
            variant="peligro"
            onClick={handleDeleteAccount}
            disabled={!isConfirmValid || isDeleting}
            isLoading={isDeleting}
          >
            {isDeleting ? t("deleting") : t("deleteAccount")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
