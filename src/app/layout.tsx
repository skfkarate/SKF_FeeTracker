import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Newsreader } from "next/font/google";
import PwaServiceWorker from "@/components/common/PwaServiceWorker";
import { ToastProvider } from "@/lib/use-toast";
import { ToastContainer } from "@/components/common/ToastContainer";
import "./globals.css";

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Newsreader({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SKF Karate FeeTrack",
  description: "Dojo fee, admission and operations ledger",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SKF Fees",
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export const viewport = {
  themeColor: "#0c100e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${body.variable} ${display.variable} ${mono.variable} antialiased`}>
        <a href="#main-content" className="skip-to-content">Skip to main content</a>
        <PwaServiceWorker />
        <ToastProvider>
          <div id="main-content">{children}</div>
          <ToastContainer />
        </ToastProvider>
      </body>
    </html>
  );
}
