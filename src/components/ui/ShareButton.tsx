"use client";

import { useState, useEffect } from "react";
import { Button } from "./button";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./modal";

interface ShareButtonProps {
  readingId: string;
  translations: {
    share: string;
    shareReading: string;
    shareDescription: string;
    makePublic: string;
    makePrivate: string;
    copyLink: string;
    linkCopied: string;
    publicReading: string;
    privateReading: string;
    /** Opcionales: textos que antes estaban fijos en inglés. */
    shareLink?: string;
    close?: string;
  };
}

export function ShareButton({ readingId, translations }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchShareStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mismo comportamiento de siempre: se consulta al abrir
  }, [isOpen, readingId]);

  const fetchShareStatus = async () => {
    try {
      const res = await fetch(`/api/readings/${readingId}/share`);
      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Failed to fetch share status:", error);
    }
  };

  const toggleShare = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/readings/${readingId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsPublic(data.isPublic);
        setShareUrl(data.shareUrl);
      }
    } catch (error) {
      console.error("Failed to toggle share:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {translations.share}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader>
          <h2 className="font-titulo text-2xl leading-tight text-papel">{translations.shareReading}</h2>
        </ModalHeader>
        <ModalBody>
          <p className="mb-6 font-lectura text-niebla">{translations.shareDescription}</p>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-papel/15 p-4">
            <div className="flex items-center gap-3">
              <span
                className={`h-2.5 w-2.5 rounded-full ${isPublic ? "bg-rosa-luz" : "bg-niebla"}`}
                aria-hidden="true"
              />
              <span className="font-dato text-xs uppercase tracking-[0.1em] text-papel">
                {isPublic ? translations.publicReading : translations.privateReading}
              </span>
            </div>
            <Button
              variant={isPublic ? "secondary" : "primary"}
              size="sm"
              onClick={toggleShare}
              isLoading={isLoading}
            >
              {isPublic ? translations.makePrivate : translations.makePublic}
            </Button>
          </div>

          {isPublic && shareUrl && (
            <div className="rounded-[10px] border border-papel/15 p-4">
              <p className="mb-2 font-dato text-[11px] uppercase tracking-[0.12em] text-niebla">
                {translations.shareLink ?? "Share link:"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  aria-label={translations.shareLink ?? "Share link"}
                  className="min-w-0 flex-1 border-0 border-b border-papel/30 bg-transparent px-1 py-2 font-dato text-sm text-papel focus:border-rosa-luz focus:outline-none"
                />
                <Button size="sm" onClick={copyLink}>
                  {copied ? translations.linkCopied : translations.copyLink}
                </Button>
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            {translations.close ?? "Close"}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
