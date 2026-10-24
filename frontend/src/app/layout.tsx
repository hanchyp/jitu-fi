import type { Metadata } from "next";
import { Nunito, Titan_One } from "next/font/google";
import "./globals.css";

const titan = Titan_One({
  variable: "--font-titan",
  weight: "400",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "jitu.fi",
  description: "Deposito on-chain di Monad. Pokok aman, bunga bisa berlipat.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${titan.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
