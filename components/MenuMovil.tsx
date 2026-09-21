"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { Destino } from "@/lib/navegacion";

/**
 * El menú móvil, que hasta hoy no existía.
 *
 * ## El defecto que cierra
 *
 * `components/Navbar.tsx` dibujaba un botón hamburguesa sin `onClick`, sin
 * `aria-expanded`, sin estado y sin panel que abrir, dentro de un archivo que
 * no declaraba `"use client"` —así que no podía tener handler aunque se le
 * escribiera uno—. La navegación real vivía en un `<nav className="hidden
 * md:flex">`, oculta por completo debajo del breakpoint `md`.
 *
 * Consecuencia medida: **en móvil el sitio no tenía navegación.** Lo único
 * clicable era el logo. Un afordance muerto es peor que ningún afordance: el
 * botón ocupaba su lugar y prometía un comportamiento que no ocurría.
 *
 * ## Por qué este archivo es el único cliente
 *
 * `"use client"` marca una **frontera**, no un archivo suelto: todo lo que se
 * importa desde aquí entra al bundle del cliente, y todo lo que importa a este
 * archivo sigue siendo servidor. Por eso el estado vive aquí y no en `Navbar`,
 * que sigue siendo Server Component, y por eso los destinos llegan como prop
 * serializable en vez de leerse aquí.
 *
 * ## Por qué el panel se renderiza siempre y se oculta con `hidden`
 *
 * `aria-controls` tiene que resolver **también con el menú cerrado**. Si el
 * panel solo existiera mientras está abierto, el botón en reposo apuntaría a un
 * `id` inexistente, que es exactamente la clase de contrato a medias que este
 * componente vino a arreglar.
 *
 * ## El botón de Calendly que ya no está aquí
 *
 * El panel cerraba con un «Agendar diagnóstico» a Calendly, gemelo del que tenía
 * `Navbar`. `docs/brand/02-arquitectura-y-urls.md` §2 manda los dos a
 * `/colaborar` —«la portada de identidad no lleva CTA de agenda en el cromo»—, y
 * el cromo se renderiza en **todas** las rutas desde que vive en el layout.
 * Quitarlo del escritorio y dejarlo en móvil habría dejado la mitad del defecto.
 * El destino comercial sigue en el menú, como «Trabajar conmigo» → `/colaborar`.
 */

/** Literal y no `useId()`: `aria-controls` se comprueba desde fuera, y un id
 *  generado (`:r0:`) no se puede escribir en una prueba ni en un selector. */
const PANEL_ID = "menu-movil";

export function MenuMovil({ destinos }: { destinos: readonly Destino[] }) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!abierto) return;

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return;
      setAbierto(false);
      // El foco vuelve al botón. Si se quedara en un panel que acaba de
      // ocultarse, el siguiente Tab empezaría desde el principio del documento
      // y quien navega con teclado perdería el sitio.
      botonRef.current?.focus();
    };

    document.addEventListener("keydown", alPulsarTecla);
    return () => document.removeEventListener("keydown", alPulsarTecla);
  }, [abierto]);

  return (
    <div className="md:hidden">
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto((previo) => !previo)}
        aria-expanded={abierto}
        aria-controls={PANEL_ID}
        aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        className="p-2 text-ink-default hover:bg-bg-section rounded-md"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={abierto ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
          />
        </svg>
      </button>

      {/* Sin utilidad de `display` en este elemento: una clase como `block`
          ganaría por especificidad al `[hidden]` de la hoja del navegador y el
          panel se quedaría visible con el menú cerrado. */}
      <div
        id={PANEL_ID}
        hidden={!abierto}
        className="absolute top-full left-0 right-0 bg-bg-page border-b border-border-subtle shadow-lg"
      >
        <nav aria-label="Navegación principal" className="container mx-auto px-6 py-4">
          <ul>
            {destinos.map((destino) => (
              <li key={destino.href}>
                <Link
                  href={destino.href}
                  // Sin esto el panel sobrevive a la navegación: el layout no
                  // se desmonta entre rutas, así que el menú se quedaría
                  // abierto encima de la página nueva.
                  onClick={() => setAbierto(false)}
                  className="block px-2 py-3 font-heading font-medium text-ink-muted hover:text-brand-primary"
                >
                  {destino.etiqueta}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
