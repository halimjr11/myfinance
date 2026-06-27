"use client";

import { useEffect } from "react";
import { CircleAlert, RefreshCw } from "lucide-react";
import { reportWebException } from "@/lib/firebase-analytics";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    void reportWebException(error, "next_route");
  }, [error]);

  return (
    <main className="error-page">
      <section className="error-panel">
        <span><CircleAlert size={22} /></span>
        <p className="eyebrow">Terjadi kendala</p>
        <h1>Halaman tidak dapat ditampilkan.</h1>
        <p>Kesalahan sudah dicatat. Coba muat ulang bagian ini.</p>
        <button className="primary-button" type="button" onClick={reset}>
          <RefreshCw size={17} />
          Coba lagi
        </button>
      </section>
    </main>
  );
}
