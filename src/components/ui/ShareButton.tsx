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
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        {translations.share}
      </Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalHeader>
          <h2 className="text-xl font-bold text-slate-100">
            {translations.shareReading}
          </h2>
        </ModalHeader>
        <ModalBody>
          <p className="text-slate-400 mb-6">{translations.shareDescription}</p>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full ${
                  isPublic ? "bg-green-500" : "bg-slate-500"
                }`}
              />
              <span className="text-slate-200">
                {isPublic
                  ? translations.publicReading
                  : translations.privateReading}
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
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Share link:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-300"
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
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
