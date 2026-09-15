/**
 * Catalogo de fuentes del canal editorial.
 *
 * Autoridad: `docs/plataforma/02-editorial.md` §6. Este archivo es un derivado de esa
 * seccion, nunca al reves. Si una fuente de aqui no esta en §6, esta mal aqui.
 *
 * `uso` decide que se puede hacer con el contenido, y NO es negociable por conveniencia:
 *   - `reproducible`  licencia que permite reproducir con atribucion (CC BY / CC0).
 *   - `solo_detectar` el feed sirve para saber que un tema existe. Se guardan titulo,
 *                     URL y fecha. **Nunca el cuerpo.** (§4, §6)
 *
 * `estado`:
 *   - `activa`      entra en la deteccion por defecto.
 *   - `descartada`  §6 la midio rota o vetada. NO entra por defecto. Solo se incluye con
 *                   `--incluir <id>`, y existe aqui precisamente para poder demostrar que
 *                   un error de acceso queda registrado y no fabrica una noticia (§5.5).
 */

export const CATALOGO = [
  {
    id: 'observatorio-tec',
    medio: 'Observatorio del Instituto para el Futuro de la Educación (Tec de Monterrey)',
    url: 'https://observatorio.tec.mx/feed/',
    formato: 'rss',
    licencia: 'CC BY 4.0',
    uso: 'reproducible',
    estado: 'activa',
    nota: '§6: la fuente mas valiosa del conjunto — IA + educacion + Mexico, y permite reproducir.',
  },
  {
    id: 'arxiv-cs-cy',
    medio: 'arXiv cs.CY (Computers and Society)',
    url: 'https://rss.arxiv.org/rss/cs.CY',
    formato: 'rss',
    licencia: 'Metadatos CC0; la licencia del articulo se verifica pieza por pieza',
    uso: 'reproducible',
    estado: 'activa',
    nota: '§6: metadatos CC0. El PDF no se descarga ni se reproduce.',
  },
  {
    id: 'openai-news',
    medio: 'OpenAI News',
    url: 'https://openai.com/news/rss.xml',
    formato: 'rss',
    licencia: 'No declarada — tratar como reservada',
    uso: 'solo_detectar',
    estado: 'activa',
    nota: '§6: blog primario de laboratorio. Sirve para detectar, no para reproducir.',
  },

  // --- Descartadas en §6, con la falla medida. Fuera de la deteccion por defecto. ---
  {
    id: 'el-economista',
    medio: 'El Economista',
    url: 'https://www.eleconomista.com.mx/rss/tecnologia',
    formato: 'rss',
    licencia: 'Todos los derechos reservados',
    uso: 'solo_detectar',
    estado: 'descartada',
    nota: '§6: 403 AccessDenied. Se conserva en el catalogo para ejercitar §5.5.',
  },
  {
    id: 'forbes-mx',
    medio: 'Forbes Mexico',
    url: 'https://www.forbes.com.mx/feed/',
    formato: 'rss',
    licencia: 'Todos los derechos reservados',
    uso: 'solo_detectar',
    estado: 'descartada',
    nota: '§6: 403 «invalid or missing feed token» — requiere autorizacion.',
  },
  {
    id: 'anthropic',
    medio: 'Anthropic',
    url: 'https://www.anthropic.com/news/rss.xml',
    formato: 'rss',
    licencia: 'No declarada',
    uso: 'solo_detectar',
    estado: 'descartada',
    nota: '§6: no tiene RSS — 404 en todas las rutas probadas.',
  },
];

/** Fuentes vetadas por terminos, aunque respondan. No se consumen nunca. */
export const VETADAS = [
  {
    id: 'contxto',
    medio: 'Contxto',
    motivo:
      'Su robots.txt veta GPTBot, Google-Extended y CCBot. Queda fuera por terminos, no por fallo tecnico (§6).',
  },
];

export function porId(id) {
  const f = CATALOGO.find((x) => x.id === id);
  if (!f) {
    const vetada = VETADAS.find((x) => x.id === id);
    if (vetada) throw new Error(`Fuente vetada por terminos: ${id} — ${vetada.motivo}`);
    throw new Error(`Fuente desconocida: ${id}`);
  }
  return f;
}

export function activas() {
  return CATALOGO.filter((f) => f.estado === 'activa');
}
