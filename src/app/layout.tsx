import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Support Ticket System - Daybel Diaz",
  description: "Sistema inteligente de gestión de tickets impulsado por IA para resolución rápida y eficiente.",
  openGraph: {
    title: "Support Ticket System",
    description: "Sistema inteligente de gestión de tickets",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-scroll-behavior="smooth">
      <body className={inter.className}>
        <LanguageProvider>
          <Navbar />
          <main>{children}</main>
        </LanguageProvider>
      </body>
    </html>
  );
}
