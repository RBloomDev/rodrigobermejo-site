import Link from "next/link";
import { MenuMovil } from "@/components/MenuMovil";
import { DESTINOS_VISIBLES } from "@/lib/navegacion";

/**
 * El cromo superior. Sigue siendo Server Component.
 *
 * El estado del menú móvil vive en `MenuMovil`, que es el único archivo cliente
 * del cromo. La frontera está ahí a propósito: `"use client"` aquí arrastraría
 * al bundle todo lo que este componente monta.
 *
 * Los destinos salen de `lib/navegacion.ts`, que los declara con su etiqueta.
 * Este archivo ya no construye ninguna URL. La expresión que tenía derivaba el
 * href del texto del menú y producía `/#sobre-mí` **con acento** contra un `id`
 * que es `sobre-mi` sin él; está transcrita y explicada en `lib/navegacion.ts`.
 *
 * ## Enlazar sí, importar no
 *
 * `Navbar` es entrada de `guard:funnel`. La frontera del funnel es de **datos**,
 * no de navegación: `docs/brand/02-arquitectura-y-urls.md` §3 y
 * `docs/05-feed-contract.md` lo dicen literalmente. Un `<Link href="/proyectos">`
 * no importa nada; un `import` de `lib/proof` desde aquí sí rompería el
 * invariante. Dejar las rutas de evidencia sin enlace haría la prueba de
 * trabajo invisible justo para quien evalúa contratar.
 *
 * ## El botón de Calendly que ya no está aquí
 *
 * `docs/brand/02-arquitectura-y-urls.md` §2 lo dice literal: «el botón de
 * Calendly duplicado en `Navbar` y en `Footer` es parte del funnel y se mueve
 * con él a `/colaborar`: la portada de identidad no lleva CTA de agenda en el
 * cromo». Desde que el cromo vive en el layout, ese botón se renderizaba en
 * **todas** las rutas, portada de identidad incluida.
 *
 * No se pierde la vía de contacto y no se toca el compromiso de servicio: la
 * cita sigue en `/colaborar` —`HowItWorks`, `Offers` y `FinalCTA` la montan— y
 * el destino comercial entra al menú como «Trabajar conmigo», que es lo que
 * `docs/brand/03-copy-deck.md` §9 asigna a la fila «Navegación».
 *
 * **El pie tampoco lo conserva.** La tabla de §9 del copy deck le asignaba
 * «Agendar» a la fila «Pie de página», y eso contradecía al párrafo de §2 citado
 * arriba. Rodrigo resolvió la divergencia el 2026-09-21 a favor de `02` —§9
 * asigna textos a apariciones, no decide cuáles existen— y la fila se retiró del
 * copy deck. Ver `components/Footer.tsx`.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-bg-page/95 backdrop-blur-sm border-b border-border-subtle transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2">
          {/* Logo "rb" simplified text representation */}
          <span className="firma text-4xl text-brand-primary group-hover:text-brand-accent transition-colors pb-1">
            rb
          </span>
          <span className="hidden sm:block font-heading font-bold text-lg text-ink-balance group-hover:text-brand-primary transition-colors mt-1">
            Rodrigo Bermejo
          </span>
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-1">
          {DESTINOS_VISIBLES.map((destino) => (
            <Link
              key={destino.href}
              href={destino.href}
              className="px-4 py-2 font-heading font-medium text-ink-muted hover:text-brand-primary hover:bg-bg-section rounded-md transition-all text-sm"
            >
              {destino.etiqueta}
            </Link>
          ))}
        </nav>

        <MenuMovil destinos={DESTINOS_VISIBLES} />
      </div>
    </header>
  );
}
