import type { Metadata, Viewport } from "next";
import {
  Inter, Rubik, Oswald, Bangers, Roboto_Condensed, Pangolin, Neucha,
  Montserrat, Playfair_Display, Lora, Nunito, Ubuntu, Caveat, Lobster,
  Amatic_SC, Russo_One, Press_Start_2P, Comfortaa, Exo_2, Marck_Script,
  Bad_Script, Fira_Sans, Balsamiq_Sans
} from "next/font/google";
import Script from "next/script";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { Toaster } from "sonner";
import "./globals.css";
import { ModeratorTracker } from "@/components/admin/ModeratorTracker";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin", "cyrillic"] });
const rubik = Rubik({ subsets: ["latin", "cyrillic"], variable: "--font-rubik" });
const oswald = Oswald({ subsets: ["latin", "cyrillic"], variable: "--font-oswald" });
const bangers = Bangers({ weight: "400", subsets: ["latin"], variable: "--font-bangers" });
const robotoCondensed = Roboto_Condensed({ subsets: ["latin", "cyrillic"], variable: "--font-roboto-condensed" });
const pangolin = Pangolin({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-pangolin" });
const neucha = Neucha({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-neucha" });

// New Mongolian-compatible fonts
const montserrat = Montserrat({ weight: ["400", "700", "900"], subsets: ["latin", "cyrillic"], variable: "--font-montserrat" });
const playfair = Playfair_Display({ weight: ["400", "700", "900"], subsets: ["latin", "cyrillic"], variable: "--font-playfair" });
const lora = Lora({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-lora" });
const nunito = Nunito({ weight: ["400", "700", "900"], subsets: ["latin", "cyrillic"], variable: "--font-nunito" });
const ubuntu = Ubuntu({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-ubuntu" });
const caveat = Caveat({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-caveat" });
const lobster = Lobster({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-lobster" });
const amatic = Amatic_SC({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-amatic" });
const russo = Russo_One({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-russo" });
const pressStart = Press_Start_2P({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-press-start" });
const comfortaa = Comfortaa({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-comfortaa" });
const exo2 = Exo_2({ weight: ["400", "700", "900"], subsets: ["latin", "cyrillic"], variable: "--font-exo2" });
const marck = Marck_Script({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-marck" });
const badScript = Bad_Script({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-bad-script" });
const firaSans = Fira_Sans({ weight: ["400", "700"], subsets: ["latin", "cyrillic"], variable: "--font-fira" });
const balsamiq = Balsamiq_Sans({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-balsamiq" });

export const metadata: Metadata = {
  metadataBase: new URL("https://pom.site"),
  title: "POM - 18+ Видео Платформ",
  description: "Хамгийн халуухан 18+ видеонуудыг 4K ба Full HD чанараар хүлээн авч үзээрэй.",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POM",
  },
  other: {
    "google-site-verification": "verification_token",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "POM",
  "url": "https://pom.site",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://pom.site/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export const viewport: Viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className={`${inter.className} ${rubik.variable} ${oswald.variable} ${bangers.variable} ${robotoCondensed.variable} ${pangolin.variable} ${neucha.variable} ${montserrat.variable} ${playfair.variable} ${lora.variable} ${nunito.variable} ${ubuntu.variable} ${caveat.variable} ${lobster.variable} ${amatic.variable} ${russo.variable} ${pressStart.variable} ${comfortaa.variable} ${exo2.variable} ${marck.variable} ${badScript.variable} ${firaSans.variable} ${balsamiq.variable} overflow-x-hidden bg-background text-foreground notranslate`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script id="chunk-error-handler" strategy="beforeInteractive">
          {`
            window.addEventListener('error', function(e) {
              if (e && e.message && (e.message.indexOf('Loading chunk') !== -1 || e.message.indexOf('Failed to fetch dynamically imported module') !== -1 || e.message.indexOf('404') !== -1)) {
                if (!sessionStorage.getItem('chunk_retry')) {
                  sessionStorage.setItem('chunk_retry', 'true');
                  window.location.reload();
                }
              }
            });
            try { sessionStorage.removeItem('chunk_retry'); } catch(err) {}
          `}
        </Script>

        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').then(
                  function(registration) {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                  },
                  function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  }
                );
              });
            }
          `}
        </Script>

        <AuthProvider>
          <ClientLayout>
            {/* <ModeratorTracker /> DISABLED FOR RECOVERY */}
            {children}
            <Toaster
              position="bottom-right"
              theme="dark"
              closeButton
              expand={false}
              richColors
              toastOptions={{
                style: {
                  background: 'rgba(10, 10, 10, 0.8)',
                  backdropFilter: 'blur(16px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '1.5rem',
                  color: '#fff',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                  padding: '1rem 1.5rem',
                },
                className: "font-bold",
              }}
            />
          </ClientLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
