"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@/components/ui";
import { getZodiacSign, getZodiacEmoji, getZodiacSignEs } from "@/lib/zodiac";
import { FOCUS_AREAS, EMAIL_TIMES } from "@/lib/pricing";

interface ProfileData {
  fullName: string;
  birthDate: string;
  birthTime: string;
  focusArea: string;
  emailTime: string;
  zodiacSign: string;
}

export default function ProfileSetupPage() {
  const router = useRouter();
  const t = useTranslations("profile");
  const locale = useLocale();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<ProfileData>({
    fullName: "",
    birthDate: "",
    birthTime: "",
    focusArea: "general",
    emailTime: "08:00",
    zodiacSign: "",
  });

  // Fetch existing profile if any
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setFormData({
              fullName: data.profile.fullName || "",
              birthDate: data.profile.birthDate
                ? new Date(data.profile.birthDate).toISOString().split("T")[0]
                : "",
              birthTime: data.profile.birthTime || "",
              focusArea: data.profile.focusArea || "general",
              emailTime: data.profile.emailTime || "08:00",
              zodiacSign: data.profile.zodiacSign || "",
            });
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Calculate zodiac sign when birth date changes
  useEffect(() => {
    if (formData.birthDate) {
      const date = new Date(formData.birthDate);
      const sign = getZodiacSign(date);
      setFormData((prev) => ({ ...prev, zodiacSign: sign }));
    }
  }, [formData.birthDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.fullName,
          birthDate: formData.birthDate,
          birthTime: formData.birthTime || null,
          focusArea: formData.focusArea,
          emailTime: formData.emailTime,
          locale,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error saving profile");
      }

      setSuccess(true);
      // Keep loading state while showing success and navigating
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error saving profile");
      setIsSaving(false);
    }
  };

  const getLocalizedFocusArea = (value: string) => {
    const area = FOCUS_AREAS.find((a) => a.value === value);
    return locale === "en" ? area?.labelEn : area?.labelEs;
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-1/2 mx-auto" />
          <div className="h-4 bg-slate-800 rounded w-2/3 mx-auto" />
          <div className="h-64 bg-slate-800 rounded mt-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">&#9788;</div>
        <h1 className="text-3xl font-bold text-slate-100">{t("title")}</h1>
        <p className="text-slate-400 mt-2">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-amber-400">&#10022;</span>
            {t("title")}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {t("saved")}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <Input
              label={t("fullName")}
              type="text"
              placeholder={t("fullNamePlaceholder")}
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              required
            />

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("birthDate")}
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthDate: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
                required
              />
            </div>

            {/* Birth Time (optional) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("birthTime")}
                <span
                  className="ml-2 text-slate-500 cursor-help"
                  title={t("birthTimeTooltip")}
                >
                  &#9432;
                </span>
              </label>
              <input
                type="time"
                value={formData.birthTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    birthTime: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500"
              />
            </div>

            {/* Zodiac Sign Display */}
            {formData.zodiacSign && (
              <div className="p-4 bg-gradient-to-r from-purple-900/30 to-amber-900/20 rounded-lg border border-purple-500/20">
                <p className="text-sm text-slate-400 mb-1">{t("zodiacSign")}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {getZodiacEmoji(formData.zodiacSign)}
                  </span>
                  <span className="text-xl font-semibold text-slate-100">
                    {locale === "en"
                      ? formData.zodiacSign
                      : getZodiacSignEs(formData.zodiacSign)}
                  </span>
                </div>
              </div>
            )}

            {/* Focus Area */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("focusArea")}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t("focusAreaDescription")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, focusArea: area.value }))
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.focusArea === area.value
                        ? "border-purple-500 bg-purple-500/10 text-slate-100"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {locale === "en" ? area.labelEn : area.labelEs}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Time */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {t("emailTime")}
              </label>
              <p className="text-xs text-slate-500 mb-3">
                {t("emailTimeDescription")}
              </p>
              <div className="flex flex-wrap gap-2">
                {EMAIL_TIMES.map((time) => (
                  <button
                    key={time.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, emailTime: time.value }))
                    }
                    className={`px-4 py-2 rounded-lg border transition-all ${
                      formData.emailTime === time.value
                        ? "border-purple-500 bg-purple-500/10 text-slate-100"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600"
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-amber-400/70 mt-2">
                {locale === "en"
                  ? "⚠️ Times are in UTC. Mexico City is UTC-6."
                  : "⚠️ Los horarios están en UTC. Ciudad de México es UTC-6."}
              </p>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSaving}
            >
              {isSaving ? t("saving") : t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
