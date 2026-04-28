import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Insight Engine — AI-Powered Stakeholder Request Analyzer",
  description: "Transform unstructured stakeholder requests into structured insights with AI-powered classification, issue extraction, and action recommendations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
