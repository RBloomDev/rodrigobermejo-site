import type { Metadata } from "next";
import {
  Yellowtail,
  Josefin_Sans,
  Open_Sans,
  Libre_Baskerville,
} from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const yellowtail = Yellowtail({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-quote",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://rodrigobermejo.com"
  ),
  title: {
    default: "Rodrigo Bermejo | Consultor Técnico en Automatización",
    template: "%s | Rodrigo Bermejo",
  },
  description:
    "Diseño y opero sistemas de automatización para negocios. Modelo de servicios gestionados: elimina el caos operativo sin infraestructura propia.",
  keywords: [
    "automatización de negocios",
    "consultoría técnica",
    "operación de sistemas",
    "business process automation",
    "managed services",
    "integración de apis",
    "flujos de trabajo",
    "sin fricción",
  ],
  authors: [{ name: "Rodrigo Bermejo" }],
  creator: "Rodrigo Bermejo",
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "/",
    title: "Rodrigo Bermejo | Consultor Técnico",
    description:
      "Infraestructura de automatización operada por expertos. Elimina tareas manuales y recupera el control operativo.",
    siteName: "Rodrigo Bermejo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rodrigo Bermejo | Consultor Técnico",
    description:
      "Infraestructura de automatización operada por expertos. Elimina tareas manuales y recupera el control operativo.",
    creator: "@rodrigobermejo",
  },
  icons: {
    icon: "/icon.svg",
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${yellowtail.variable} ${josefinSans.variable} ${openSans.variable} ${libreBaskerville.variable} font-sans antialiased bg-bg-page text-ink-default selection:bg-brand-accent selection:text-white`}
      >
        <Analytics />
        {children}
      </body>
    </html>
  );
}
