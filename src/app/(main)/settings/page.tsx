"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("settings");
  const locale = useLocale();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (status === "loading") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/3" />
          <div className="h-40 bg-slate-800 rounded" />
          <div className="h-40 bg-slate-800 rounded" />
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
    } catch (err) {
      setError(t("deleteError"));
      setIsDeleting(false);
    }
  };

  const memberSince = session?.user?.id
    ? new Date().toLocaleDateString(locale === "es" ? "es-ES" : "en-US", {
        year: "numeric",
        month: "long",
      })
    : "";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-100">{t("title")}</h1>
      </div>

      {/* Account Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">
            {t("accountInfo")}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {t("email")}
              </label>
              <p className="text-slate-100">{session?.user?.email}</p>
            </div>
            {session?.user?.name && (
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  {t("name")}
                </label>
                <p className="text-slate-100">{session.user.name}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/30">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            {t("dangerZone")}
          </h2>
          <p className="text-slate-400 text-sm mb-4">{t("deleteWarning")}</p>
          <Button variant="danger" onClick={() => setIsDeleteModalOpen(true)}>
            {t("deleteAccount")}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setConfirmText("");
            setError(null);
          }
        }}
      >
        <ModalHeader>
          <h2 className="text-xl font-semibold text-red-400">
            {t("deleteConfirmTitle")}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-slate-300 mb-4">{t("deleteWarning")}</p>
          <Input
            label={t("deleteConfirmText")}
            placeholder={t("deleteConfirmPlaceholder")}
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
          />
          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setConfirmText("");
              setError(null);
            }}
            disabled={isDeleting}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="danger"
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
