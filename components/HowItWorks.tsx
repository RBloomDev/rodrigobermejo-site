import { Button } from "@/components/ui/Button";

const steps = [
  {
    number: "01",
    title: "Diagnóstico Profundo",
    description:
      "Mapeo tu proceso actual, detecto cuellos de botella y defino la ruta crítica. Aquí priorizamos impacto y rapidez.",
  },
  {
    number: "02",
    title: "Construcción + Operación",
    description:
      "Construyo la automatización y la dejo corriendo en un entorno administrado por mí. Tú ves resultados sin interrumpir tu operación.",
  },
  {
    number: "03",
    title: "Monitoreo & Mejora Continua",
    description:
      "Medimos, ajustamos y escalamos por etapas. Tu sistema se mantiene vivo: no es un ‘proyecto’, es una capacidad operativa.",
  },
];

const deliverables = [
  "Mapa claro del proceso y puntos de fricción",
  "1 automatización clave funcionando en producción",
  "Tablero básico o reportes automáticos (según caso)",
  "Documentación breve de operación + cómo pedir cambios",
];

export default function HowItWorks() {
  return (
    <section id="solucion" className="py-24 md:py-32 bg-bg-page">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row gap-16 lg:gap-24 items-start max-w-6xl mx-auto">
          <div className="md:w-1/3 md:sticky md:top-32">
            <span className="block mb-3 font-heading font-semibold text-brand-accent uppercase tracking-wider text-sm">
              MI METODOLOGÍA
            </span>
            <h2 className="font-heading font-bold text-3xl md:text-4xl text-ink-default mb-6 leading-tight">
              Orden en 3 pasos simples
            </h2>
            <p className="font-body text-ink-muted text-lg mb-8 leading-relaxed">
              Mi enfoque es pragmático: resolver lo que más duele primero y
              dejar un sistema operando con claridad.
            </p>
            <Button
              href="https://calendly.com"
              external
              variant="ghost"
              className="pl-0 hover:bg-transparent hover:text-brand-accent"
            >
              Agendar llamada exploratoria
              <svg
                className="w-4 h-4 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Button>
          </div>

          <div className="md:w-2/3 space-y-12">
            <div className="space-y-8">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="flex gap-6 p-8 rounded-2xl bg-bg-page border border-border-subtle shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 group"
                >
                  {/* Number styling: using border-default color for a subtle gray that exists in palette */}
                  <span className="font-heading font-bold text-5xl text-border-default group-hover:text-blue-100 transition-colors duration-300">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-heading font-bold text-xl text-ink-default mb-3">
                      {step.title}
                    </h3>
                    <p className="font-body text-ink-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Entregables Section */}
            <div className="bg-bg-section p-8 rounded-2xl border border-border-subtle">
              <h3 className="font-heading font-bold text-xl text-ink-default mb-6">
                Lo que te llevas desde la primera semana
              </h3>
              <ul className="grid sm:grid-cols-2 gap-4">
                {deliverables.map((item, index) => (
                  <li key={index} className="flex items-start">
                    <svg
                      className="w-5 h-5 text-brand-accent mr-3 mt-0.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-ink-muted font-medium text-sm">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
