# Estructura Sugerida para Blog Futuro

Para escalar el sitio a un blog, recomiendo la siguiente estructura de archivos y rutas:

## Estructura de Carpetas

ap/
├── blog/
│   ├── page.tsx          // Índice del blog (Lista de artículos)
│   ├── layout.tsx        // Layout específico del blog (Sidebar, Suscripción, etc.)
│   └── [slug]/
│       ├── page.tsx      // Página de artículo individual (Renderiza MDX o datos de CMS)
│       └── opengraph-image.tsx // Imágenes dinámicas para cada post

## Tecnologías Recomendadas

1.  **Contenido**: Markdown/MDX es ideal para desarrolladores.
    -   Instala `@next/mdx` o usa `next-mdx-remote` si cargas desde archivos externos.
    -   Alternativa: CMS Headless como Sanity o Contentful si prefieres un editor visual.

2.  **Rutas**:
    -   `/blog`: Muestra lista paginada de posts.
    -   `/blog/como-automatizar-whatsapp`: Slug dinámico para SEO.

## Ejemplo de Configuración Futura

Si usas archivos locales (`content/posts/*.mdx`):

1.  Crear carpeta raíz `content/posts`.
2.  Usar una librería como `gray-matter` para leer frontmatter (título, fecha, autor).
3.  En `app/blog/page.tsx`, usar `fs.readdir` para listar posts.
4.  En `app/blog/[slug]/page.tsx`, usar `fs.readFileSync` para leer el contenido y renderizar.

Esto mantiene tu sitio rápido (Static Generation) y fácil de mantener.
