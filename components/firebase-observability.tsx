"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics, reportWebException } from "@/lib/firebase-analytics";

export function FirebaseObservability() {
  useEffect(() => {
    void getFirebaseAnalytics();

    function handleWindowError(event: ErrorEvent) {
      void reportWebException(event.error ?? event.message, "window");
    }

    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      void reportWebException(event.reason, "promise");
    }

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
