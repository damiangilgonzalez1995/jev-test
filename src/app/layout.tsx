import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Jev explicado",
  description:
    "Playground interactivo que muestra, paso a paso, cómo funciona el modelo Jev System One de TypeSafe.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${geistMono.variable}`}>{children}</body>
    </html>
  );
}
