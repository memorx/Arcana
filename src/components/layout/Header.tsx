"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Badge, LanguageSelector } from "@/components/ui";
import { SoundToggle } from "@/components/SoundToggle";

export function Header() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const t = useTranslations("nav");
  const tDashboard = useTranslations("dashboard");

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-amber-500 blur-lg opacity-50" />
              <span className="relative text-2xl font-bold bg-gradient-to-r from-purple-400 via-amber-400 to-purple-400 bg-clip-text text-transparent">
                Arcana
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {status === "authenticated" && session?.user && (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                >
                  {t("dashboard")}
                </Link>
                <Link
                  href="/reading/new"
                  className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                >
                  {t("newReading")}
                </Link>
                <Link
                  href="/history"
                  className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                >
                  {t("history")}
                </Link>
              </>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* Sound Toggle */}
            <SoundToggle />

            {/* Language Selector */}
            <LanguageSelector />

            {status === "loading" ? (
              <div className="h-8 w-24 bg-slate-800 animate-pulse rounded-lg" />
            ) : status === "authenticated" && session?.user ? (
              <>
                {/* Credits & Free Readings */}
                <Link
                  href="/credits"
                  className="hidden sm:flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  {session.user.freeReadingsLeft > 0 && (
                    <Badge variant="success">
                      {session.user.freeReadingsLeft} {tDashboard("freeShort")}
                    </Badge>
                  )}
                  <Badge
                    variant={
                      session.user.credits === 0 &&
                      session.user.freeReadingsLeft === 0
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {tDashboard("credits", { count: session.user.credits })}
                  </Badge>
                </Link>

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-amber-500 flex items-center justify-center text-sm font-medium text-white">
                      {session.user.name?.[0]?.toUpperCase() ||
                        session.user.email?.[0]?.toUpperCase() ||
                        "?"}
                    </div>
                    <svg
                      className={`w-4 h-4 text-slate-400 transition-transform ${
                        isMenuOpen ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Dropdown */}
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-20 py-2">
                        <div className="px-4 py-2 border-b border-slate-800">
                          <p className="text-sm font-medium text-slate-100 truncate">
                            {session.user.name || tDashboard("welcomeDefault")}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {session.user.email}
                          </p>
                        </div>

                        {/* Mobile credits */}
                        <Link
                          href="/credits"
                          className="sm:hidden px-4 py-2 border-b border-slate-800 flex gap-2 hover:bg-slate-800/50"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          {session.user.freeReadingsLeft > 0 && (
                            <Badge variant="success">
                              {session.user.freeReadingsLeft} {tDashboard("freeShort")}
                            </Badge>
                          )}
                          <Badge
                            variant={
                              session.user.credits === 0 &&
                              session.user.freeReadingsLeft === 0
                                ? "warning"
                                : "secondary"
                            }
                          >
                            {tDashboard("credits", { count: session.user.credits })}
                          </Badge>
                        </Link>

                        <div className="py-1">
                          <Link
                            href="/dashboard"
                            className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {t("dashboard")}
                          </Link>
                          <Link
                            href="/reading/new"
                            className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {t("newReading")}
                          </Link>
                          <Link
                            href="/history"
                            className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50 md:hidden"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {t("history")}
                          </Link>
                        </div>

                        <div className="border-t border-slate-800 py-1">
                          <Link
                            href="/daily"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>&#128302;</span> {t("dailyCard")}
                          </Link>
                          <Link
                            href="/subscribe"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>&#10024;</span> {t("subscribe")}
                          </Link>
                          <Link
                            href="/profile/setup"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>&#128100;</span> {t("profile")}
                          </Link>
                          <Link
                            href="/referral"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800/50"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <span>&#127873;</span> {t("referral")}
                          </Link>
                        </div>

                        <div className="border-t border-slate-800 pt-1">
                          <button
                            onClick={() => signOut({ callbackUrl: "/" })}
                            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800/50"
                          >
                            {t("logout")}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    {t("login")}
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">{t("register")}</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
