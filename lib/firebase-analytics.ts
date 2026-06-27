import type { Analytics, EventParams } from "firebase/analytics";
import { firebaseApp } from "@/lib/firebase";

let analyticsPromise: Promise<Analytics | null> | null = null;

export function getFirebaseAnalytics() {
  if (!firebaseApp || typeof window === "undefined") {
    return Promise.resolve(null);
  }
  const app = firebaseApp;

  analyticsPromise ??= import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) => {
      if (!await isSupported()) {
        if (process.env.NODE_ENV === "development") {
          console.warn("Firebase Analytics tidak didukung oleh browser ini.");
        }
        return null;
      }
      return getAnalytics(app);
    })
    .catch((error) => {
      if (process.env.NODE_ENV === "development") {
        console.warn("Firebase Analytics gagal diinisialisasi.", error);
      }
      return null;
    });

  return analyticsPromise;
}

export async function trackAnalyticsEvent(name: string, params?: EventParams) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  const { logEvent } = await import("firebase/analytics");
  logEvent(analytics, name, params);
}

export async function setFirebaseAnalyticsUserId(userId: string | null) {
  const analytics = await getFirebaseAnalytics();
  if (!analytics) return;

  const { setUserId } = await import("firebase/analytics");
  setUserId(analytics, userId);
}

function safeErrorDescription(value: unknown) {
  const raw = value instanceof Error ? `${value.name}: ${value.message}` : String(value);
  return raw
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/\b\d{4,}\b/g, "[number]")
    .slice(0, 180);
}

export function reportWebException(error: unknown, source: string, fatal = false) {
  return trackAnalyticsEvent("exception", {
    description: safeErrorDescription(error),
    fatal,
    error_source: source.slice(0, 40),
  });
}
