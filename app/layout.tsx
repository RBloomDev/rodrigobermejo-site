import type { Metadata } from "next";
import {
  Yellowtail,
  Josefin_Sans,
  Open_Sans,
  Libre_Baskerville,
} from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { baseUrl } from "@/lib/site";

const yellowtail = Yellowtail({
  weight: "400",
  subsets: ["latin"],
  variable: "--ff-signature",
});

const josefinSans = Josefin_Sans({
  subsets: ["latin"],
  variable: "--ff-heading",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--ff-body",
});

const libreBaskerville = Libre_Baskerville({
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--ff-quote",
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
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
    <html
      lang="es"
      className={`scroll-smooth ${yellowtail.variable} ${josefinSans.variable} ${openSans.variable} ${libreBaskerville.variable}`}
    >
      <body
        className={`font-sans antialiased bg-bg-page text-ink-default selection:bg-brand-accent selection:text-white min-h-screen flex flex-col`}
      >
        <Analytics />
        {/* El cromo vive aquí, no en cada página.
         *
         * Cuando cada `page.tsx` montaba el suyo, tres se lo saltaron:
         * `/proyectos`, `/proyectos/[slug]` y `/evidencia` quedaron sin Navbar
         * ni Footer —medido con grep y documentado en
         * `docs/brand/02-arquitectura-y-urls.md` §1—. Eran callejones sin
         * salida: se entraba por un enlace y no había forma de volver.
         *
         * Subirlo al layout convierte el olvido en imposible. §2 lo pide
         * explícitamente para las rutas que vienen —`/colaborar`, `/sobre-mi`,
         * `/noticias`, `/actividad`—: «las rutas nuevas montan el cromo desde
         * el primer commit». Aquí ya no tienen que acordarse.
         *
         * Que `Footer` monte `SubscriptionBlock` no vuelve cliente a este
         * layout: la frontera `"use client"` la cruza el componente, no quien
         * lo renderiza. */}
        <Navbar />
        {/* El `min-h-screen flex flex-col` del `body` y este `flex-grow` no son
         * estilo nuevo: reponen el que las páginas perdieron al subir el cromo
         * aquí. Antes, `app/page.tsx` y las dos de blog envolvían
         * `Navbar + main + Footer` en un `min-h-screen flex flex-col` propio, y
         * ese contenedor era el que empujaba el pie al fondo en una página
         * corta. Ahora `Navbar` y `Footer` son hermanos de `children`, no hijos
         * suyos: sin esto el documento mediría 100vh **más** el alto del cromo
         * —barra de scroll en toda página— y el pie caería bajo el pliegue.
         * Las tres páginas sueltan su `min-h-screen` por la misma razón. */}
        <div className="flex-grow">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
