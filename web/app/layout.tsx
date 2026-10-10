import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "@/styles/globals.css";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-mono", display: "swap" });

const SITE = "https://monkepay-arc-production.up.railway.app";
const DESCRIPTION =
  "Pay-per-request APIs for AI agents. Agents pay in USDC on Arc mainnet over x402, and each payment is split between seller and platform on-chain by a per-seller MonkeVault.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "MonkePay on Arc", template: "%s · MonkePay on Arc" },
  description: DESCRIPTION,
  applicationName: "MonkePay on Arc",
  keywords: ["MonkePay", "Arc", "Circle", "x402", "USDC", "AI agents", "HTTP 402", "EIP-3009", "pay per request"],
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "MonkePay on Arc",
    description: DESCRIPTION,
    url: SITE,
    siteName: "MonkePay on Arc",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "MonkePay on Arc: x402 payments for AI agents, settled in USDC on Arc" }],
  },
  twitter: { card: "summary_large_image", title: "MonkePay on Arc", description: DESCRIPTION, images: ["/og.svg"] },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080b10" },
    { media: "(prefers-color-scheme: light)", color: "#f4f6f8" },
  ],
};

// Applied before paint so the saved theme never flashes.
const THEME_SCRIPT = `try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.replace('dark','light')}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable} dark`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen overflow-x-hidden">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
