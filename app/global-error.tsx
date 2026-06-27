"use client";

import { useEffect } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { reportWebException } from "@/lib/firebase-analytics";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportWebException(error, "next_global", true);
  }, [error]);

  return (
    <html lang="id">
      <body>
        <main className="error-page">
          <section className="error-panel">
            <span><CircleAlert size={22} /></span>
            <p className="eyebrow">Aplikasi berhenti</p>
            <h1>MyFinance mengalami kesalahan.</h1>
            <p>Kesalahan sudah dicatat. Coba jalankan aplikasi kembali.</p>
            <button className="primary-button" type="button" onClick={reset}>
              <RefreshCw size={17} />
              Jalankan lagi
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
