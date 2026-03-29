"use client";

import { useEffect, useMemo, useState } from "react";

function encodeMailto(value: string) {
  return encodeURIComponent(value).replace(/%20/g, "%20");
}

export function GuideActions() {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const sharePayload = useMemo(() => {
    if (!origin) {
      return {
        guideUrl: "/panduan",
        pdfUrl: "/api/guide/export?format=pdf",
        whatsappUrl: "#",
        emailUrl: "#",
        text: ""
      };
    }

    const guideUrl = `${origin}/panduan`;
    const pdfUrl = `${origin}/api/guide/export?format=pdf`;
    const text = [
      "Panduan KAKOR SENTINEL SUPPLY siap dibuka dan diunduh.",
      `Buka web: ${guideUrl}`,
      `Unduh PDF: ${pdfUrl}`
    ].join("\n");

    return {
      guideUrl,
      pdfUrl,
      text,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(text)}`,
      emailUrl: `mailto:?subject=${encodeMailto("Panduan KAKOR SENTINEL SUPPLY")}&body=${encodeMailto(text)}`
    };
  }, [origin]);

  const openWhatsApp = () => {
    if (typeof window === "undefined" || sharePayload.whatsappUrl === "#") {
      return;
    }

    window.open(sharePayload.whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const openEmail = () => {
    if (typeof window === "undefined" || sharePayload.emailUrl === "#") {
      return;
    }

    window.location.href = sharePayload.emailUrl;
  };

  const sharePdf = async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (!navigator.share) {
      window.open(sharePayload.pdfUrl, "_blank", "noopener,noreferrer");
      return;
    }

    try {
      const response = await fetch(sharePayload.pdfUrl, { credentials: "include" });
      const blob = await response.blob();
      const file = new File([blob], "panduan-kakor-sentinel-supply.pdf", { type: "application/pdf" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Panduan KAKOR SENTINEL SUPPLY",
          text: "Panduan operasional lengkap siap dibagikan.",
          files: [file]
        });
        return;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      // Fallback ke URL PDF di bawah.
    }

    try {
      await navigator.share({
        title: "Panduan KAKOR SENTINEL SUPPLY",
        text: sharePayload.text,
        url: sharePayload.guideUrl
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("cancellation of share")) {
        return;
      }

      window.open(sharePayload.pdfUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={sharePayload.pdfUrl}
        className="action-brand rounded-full px-5 py-3 text-sm font-semibold shadow-neon"
      >
        Unduh PDF
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Cetak
      </button>
      <button
        type="button"
        onClick={() => void sharePdf()}
        className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Bagikan PDF
      </button>
      <button
        type="button"
        onClick={openWhatsApp}
        className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Kirim ke WhatsApp
      </button>
      <button
        type="button"
        onClick={openEmail}
        className="action-ghost rounded-full px-5 py-3 text-sm font-medium text-white"
      >
        Kirim via Email
      </button>
    </div>
  );
}
