"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-slate-800/50 bg-slate-950/50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-amber-400 bg-clip-text text-transparent">
              Arcana
            </span>
            <span className="text-slate-500 text-sm">
              &copy; {new Date().getFullYear()}
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <Link
              href="/cards"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("explore")}
            </Link>
            <Link
              href="/blog"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("blog")}
            </Link>
            <Link
              href="/subscribe"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("dailyOracle")}
            </Link>
            <Link
              href="/about"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("legal.about")}
            </Link>
            <Link
              href="/privacy"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("legal.privacy")}
            </Link>
            <Link
              href="/terms"
              className="text-slate-400 hover:text-slate-100 transition-colors"
            >
              {t("legal.terms")}
            </Link>
          </nav>

          {/* Tagline */}
          <div className="flex items-center gap-2 text-slate-500">
            <span className="text-lg">&#9788;</span>
            <span className="text-xs">{t("tagline")}</span>
            <span className="text-lg">&#9789;</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
