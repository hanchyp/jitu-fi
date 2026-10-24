import type { Metadata } from "next";
import { Bree_Serif, Nunito } from "next/font/google";
import { DummyWalletProvider } from "@/components/shell/DummyWallet";
import { Footer } from "@/components/shell/Footer";
import { SiteNav } from "@/components/shell/SiteNav";
import { TestnetBanner } from "@/components/shell/TestnetBanner";
import { WrongNetworkGate } from "@/components/shell/WrongNetwork";
import "./globals.css";

const bree = Bree_Serif({
  variable: "--font-bree",
  weight: "400",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "jitu.fi",
  description: "The on-chain deposit you can play, on Monad. Your principal stays safe; sharp calls win the bonus.",
};

// Shared shell: testnet banner, nav, page, footer. The landing renders its own floating nav
// inside the 3D title screen (see SiteNav). Pages put their content in <main className="flex-1">.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${bree.variable} ${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <DummyWalletProvider>
          <TestnetBanner />
          <SiteNav />
          <div className="flex flex-1 flex-col">{children}</div>
          <Footer />
          <WrongNetworkGate />
        </DummyWalletProvider>
      </body>
    </html>
  );
}
