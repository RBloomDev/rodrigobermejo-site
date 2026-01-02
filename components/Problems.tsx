import { SectionHeader } from "@/components/ui/SectionHeader";

const problems = [
  {
    icon: "📉",
    title: "Leads que se pierden",
    description:
      "Clientes potenciales que quedan en el olvido porque nadie les dio seguimiento a tiempo o se perdieron entre mensajes, notas y hojas de cálculo.",
  },
  {
    icon: "🔑",
    title: "Dependencia de personas clave",
    description:
      "Si tu mejor empleado se enferma o renuncia, los procesos se detienen y el conocimiento se va con él.",
  },
  {
    icon: "🫣",
    title: "Cero visibilidad",
    description:
      "Decisiones con suposiciones en lugar de datos, porque armar reportes toma horas o días.",
  },
];

export default function Problems() {
  return (
    <section
      id="problemas"
      className="py-24 bg-bg-section border-y border-border-subtle"
    >
      <div className="container mx-auto px-6">
        <SectionHeader
          eyebrow="EL PROBLEMA"
          title="¿Te suena familiar esta situación?"
          subtitle="El costo oculto de operar manualmente no es solo tiempo: es el crecimiento que estás dejando sobre la mesa todos los días."
        />

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {problems.map((problem, index) => (
            <div
              key={index}
              className="group bg-bg-page p-8 rounded-2xl shadow-sm border border-border-subtle hover:shadow-lg hover:border-border-default transition-all duration-300"
            >
              <div className="text-4xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
                {problem.icon}
              </div>
              <h3 className="font-heading font-bold text-xl text-ink-default mb-3">
                {problem.title}
              </h3>
              <p className="font-body text-ink-muted leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
