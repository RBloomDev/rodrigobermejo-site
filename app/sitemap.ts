import { MetadataRoute } from 'next';
import { getSortedPostsData } from "@/lib/posts";
import { leerFeed } from "@/lib/proof/feed";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://rodrigobermejo.com';
  const posts = getSortedPostsData();

  const blogUrls = posts.map((post) => ({
    url: `${baseUrl}/blog/${post.id}`,
    lastModified: new Date(post.date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // La superficie de evidencia. `docs/05` (contrato de presentacion) es explicito en
  // que dejarla sin enlazar "haria la prueba de trabajo invisible justo para quien
  // evalua contratar" --- y quedarse fuera del sitemap es una forma de eso.
  //
  // Importar el feed aqui NO viola el invariante 4 de `docs/04` §4: el funnel comercial
  // es el conjunto de entrypoints que vigila `scripts/check-funnel-isolation.mjs`, y
  // `sitemap.ts` no es uno de ellos. La ruta de conversion sigue sin poder romperse
  // por un problema de evidencia.
  //
  // Si el feed esta ausente, las dos rutas indice siguen existiendo y renderizando su
  // superficie sin afirmaciones; lo que no existe son las fichas por proyecto. Si esta
  // corrupto, `leerFeed` lanza y el build se pone rojo --- que es el invariante 2, no
  // una regresion.
  const feed = leerFeed();
  const proyectoUrls =
    feed.estado === "presente"
      ? feed.feed.projects.map((p) => ({
          url: `${baseUrl}/proyectos/${p.id}`,
          lastModified: new Date(feed.feed.meta.generated_at),
          changeFrequency: "monthly" as const,
          priority: 0.6,
        }))
      : [];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/proyectos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/evidencia`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...proyectoUrls,
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...blogUrls,
  ];
}
