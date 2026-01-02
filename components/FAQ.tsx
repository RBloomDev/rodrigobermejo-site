import { SectionHeader } from "@/components/ui/SectionHeader";

export default function FAQ() {
  const faqs = [
    {
      q: "¿Necesito tener conocimientos técnicos?",
      a: "No. Yo me encargo de la operación y el mantenimiento. Tú solo defines el proceso y validas resultados. Si tu equipo necesita acceso, se configura con permisos claros.",
    },
    {
      q: "¿Dónde vive la automatización?",
      a: "Yo la alojo y la administro en un entorno seguro. Esto evita que dependas de configuraciones frágiles o de ‘la compu de alguien’. Tú tienes visibilidad y control operativo, y yo me encargo de que funcione.",
    },
    {
      q: "¿Cuánto tiempo toma ver resultados?",
      a: "En el Sprint, en una semana tienes una automatización clave funcionando. En el plan mensual, construimos y mejoramos por etapas, priorizando impacto.",
    },
    {
      q: "¿Qué pasa si mis procesos cambian?",
      a: "Está pensado para cambiar. Los sistemas se construyen por módulos: si algo cambia, ajustamos el bloque correspondiente sin rehacer todo.",
    },
    {
      q: "¿Puedo quedarme con el sistema y operarlo por mi cuenta?",
      a: "En la mayoría de casos no, porque el valor está en que yo lo opere y mantenga estable. En proyectos muy específicos, sí puedo entregarlo como implementación cerrada con documentación, pero se cotiza distinto.",
    },
  ];

  return (
    <section className="py-24 bg-bg-section border-t border-border-default">
      <div className="container mx-auto px-6 max-w-4xl">
        <SectionHeader
          eyebrow="DUDAS COMUNES"
          title="Preguntas Frecuentes"
          subtitle="Lo esencial para entender cómo trabajamos juntos."
          className="mb-12"
        />

        <div className="grid gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-bg-page p-8 rounded-xl border border-border-default shadow-sm hover:border-brand-accent/50 transition-colors duration-200"
            >
              <h3 className="font-heading font-bold text-lg text-ink-default mb-3 flex items-start">
                <span className="text-brand-accent mr-3 text-xl">?</span>
                {faq.q}
              </h3>
              <p className="font-body text-ink-muted leading-relaxed pl-7">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
