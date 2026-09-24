import Link from 'next/link';
import { getSortedPostsData } from '@/lib/posts';
import { Metadata } from 'next';
import { parseISO, format } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata: Metadata = {
  title: "Escribo",
  description:
    "Notas sobre sistemas, decisiones técnicas y lo que se aprende operando lo que uno construye.",
};

export default function BlogIndex() {
  const allPostsData = getSortedPostsData();

  return (
    <div className="flex flex-col flex-grow">
      <main className="flex-grow py-24 bg-gray-50">
        <div className="container mx-auto px-6 max-w-4xl">
          {/*
            Era un SectionHeader, que SIEMPRE renderiza <h2>: esta pagina se quedo sin h1
            --- la unica de las ocho rutas --- y su encabezado visible seguia diciendo
            "Insights de Automatizacion" con una bajada sobre "negocios digitales
            eficientes", copy comercial de la plantilla que contradice el reposicionamiento
            entero. El `metadata.title` ya decia "Escribo"; lo que se ve, no.

            Se usa el mismo h1 explicito que /proyectos y /evidencia en vez de anadirle un
            prop `as` a SectionHeader: ese componente lo usan cuatro secciones del funnel,
            donde <h2> es lo correcto. El texto sale de docs/brand/03-copy-deck.md, que es
            la autoridad de las etiquetas.
          */}
          <div className="mb-16 max-w-3xl">
            <h1 className="text-4xl leading-tight text-ink-default sm:text-5xl">Escribo</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-balance">
              Notas sobre sistemas, decisiones técnicas y lo que se aprende operando lo que
              uno construye.
            </p>
          </div>

          <div className="grid gap-8">
            {allPostsData.map(({ id, date, title, excerpt }) => (
              <article key={id} className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="mb-2 text-sm text-gray-500 font-medium font-body flex items-center gap-2">
                   <span className="w-1 h-1 rounded-full bg-brand-accent"></span>
                   <time dateTime={date}>{format(parseISO(date), 'd LLLL, yyyy', { locale: es })}</time>
                </div>
                <Link href={`/blog/${id}`} className="block group-hover:text-brand-primary transition-colors">
                  <h2 className="text-2xl font-heading font-bold mb-3 text-gray-900">{title}</h2>
                </Link>
                <p className="text-gray-600 font-body mb-4 leading-relaxed">
                  {excerpt}
                </p>
                <Link href={`/blog/${id}`} className="text-brand-primary font-semibold hover:text-brand-accent transition-colors inline-flex items-center">
                  Leer artículo
                  <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
