import type { Metadata } from "next";
import { FirebaseObservability } from "@/components/firebase-observability";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyFinance Dashboard",
  description: "Dashboard pencatatan dan literasi finansial personal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <FirebaseObservability />
        {children}
      </body>
    </html>
  );
}
