import { MetadataRoute } from 'next';

import { baseUrl as hostCanonico } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = hostCanonico();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // `/private/` estuvo aquí desde la plantilla, con el comentario «Example
      // exclusions» al lado. Esa ruta no existe en este repositorio: un
      // `Disallow` sobre nada no protege nada y sí documenta que el archivo
      // nunca se revisó (`docs/brand/05-seo-y-llms.md` §1.3 y §6.1, cambio 1).
      // `/api/` se queda: existe, maneja PII (`app/api/subscribe/route.ts`) y no
      // es una página.
      //
      // Lo que §6.1 pide y aquí NO se hace: las reglas por crawler de IA
      // (GPTBot, ClaudeBot, PerplexityBot…). §6.2 las plantea como propuesta con
      // su contrapunto —entrenamiento irreversible y respuesta sin visita— y esa
      // es una decisión de Rodrigo sobre qué se expone, no del Builder.
      disallow: ['/api/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
