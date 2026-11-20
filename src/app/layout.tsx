import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import PwaServiceWorker from "@/components/common/PwaServiceWorker";
import { ToastProvider } from "@/lib/use-toast";
import { ToastContainer } from "@/components/common/ToastContainer";
import "./globals.css";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
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
  themeColor: "#030407",
  width: "device-width",
  initialScale: 1,
};

const themeBootstrap = `
(function(){
  try {
    var theme = localStorage.getItem('aurora-theme');
    if (theme === 'day') document.documentElement.dataset.theme = 'day';
    var fx = localStorage.getItem('aurora-fx');
    if (fx === 'lite') document.documentElement.dataset.fx = 'lite';
  } catch (error) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className={`${body.variable} ${display.variable} antialiased`}>
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
