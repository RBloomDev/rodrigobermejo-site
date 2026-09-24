import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Problems from "@/components/Problems";
import HowItWorks from "@/components/HowItWorks";
import Offers from "@/components/Offers";
import About from "@/components/About";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";

/**
 * El funnel comercial, íntegro.
 *
 * Esta ruta no es un resumen de lo que había en la portada: es **la misma
 * cadena, en el mismo orden, con los mismos componentes**. `docs/brand/03` §4 es
 * explícito: «el funnel se traslada con su copy intacto. No se reescribe la
 * oferta: lo que cambia es dónde vive y cómo se ve». Ningún precio, plazo ni
 * compromiso cambia por una decisión de diseño.
 *
 * ## Los `id` que se conservan, y por qué importa
 *
 * `problemas`, `solucion`, `ofertas`, `faq` y `sobre-mi` viajan dentro de sus
 * componentes y no se tocan. Un fragmento de URL **no se envía al servidor** —el
 * navegador lo retiene y lo aplica localmente—, así que `/#ofertas` no se puede
 * redirigir a `/colaborar#ofertas` ni desde `next.config.ts` ni con una cabecera
 * `Location:`. Conservar los `id` es lo único que hace que un enlace antiguo se
 * arregle cambiando una palabra en vez de reconstruyendo la página
 * (`docs/brand/02` §4).
 *
 * ## `About` viaja con el funnel
 *
 * `docs/brand/02` §1 enumera seis componentes para esta ruta y no nombra
 * `About`. Aun así viene aquí, por dos razones medidas y no por inercia:
 * `docs/brand/02` §4 → *Mitigación 2* habla de «corregir `sobre-mi` **al
 * moverlo**», lo que solo tiene sentido si la sección se mueve a esta ruta; y
 * `docs/brand/03` §4 ordena corregir la errata de `About.tsx` dentro del trabajo
 * de `/colaborar`, que sería trabajo sobre código muerto si el componente
 * quedara sin montar. Su copy es comercial —«No soy una agencia. Soy tu
 * consultor técnico»—, así que su lugar es este y no la portada de identidad:
 * la trayectoria la cuenta `/sobre-mi` con el copy de §5.
 *
 * ## Esta ruta sí es entrada de `guard:funnel`
 *
 * Está añadida a `FUNNEL_ENTRYPOINTS`. `docs/brand/02` §3 lo marca como tarea
 * obligatoria del mismo commit que mueve el funnel: el guard fija nombres de
 * archivo literales y no se entera solo de que la cadena cambió de casa.
 */

export const metadata: Metadata = {
  // `docs/brand/03-copy-deck.md` §7. El `template` del layout es
  // «%s | Rodrigo Bermejo», así que el título no repite el nombre.
  title: "Trabajar conmigo",
  description:
    "Diseño, construyo y opero sistemas de automatización para negocios que sostienen su operación a mano.",
  // Sin esto la ruta heredaría `canonical: "/"` del layout raíz y declararía
  // ser la portada (`docs/brand/02` §5).
  alternates: { canonical: "/colaborar" },
};

export default function Colaborar() {
  return (
    <main className="flex flex-col flex-grow">
      <Hero />

      {/* La entradilla que §4 del copy deck añade «porque ahora es una página y
       * no una sección». Va bajo el hero —que se conserva íntegro— como lead de
       * la ruta: es lo primero que se lee después del titular. */}
      <section className="py-14 md:py-16 bg-bg-section border-b border-border-subtle">
        <div className="container mx-auto px-6">
          <p className="max-w-3xl mx-auto text-center font-body text-lg md:text-xl leading-relaxed text-ink-muted">
            Trabajo con negocios que ya tienen operación y la están sosteniendo
            a mano. Diseño el sistema, lo construyo y lo opero.
          </p>
        </div>
      </section>

      <Problems />
      <HowItWorks />
      <Offers />
      <About />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
