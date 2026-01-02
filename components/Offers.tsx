import { Button } from "@/components/ui/Button";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function Offers() {
  return (
    <section
      id="ofertas"
      className="py-24 bg-brand-primary text-white relative overflow-hidden"
    >
      {/* Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      ></div>

      <div className="container mx-auto px-6 relative z-10">
        <SectionHeader
          light
          eyebrow="MODELO DE SERVICIO"
          title="Infraestructura operada por expertos"
          subtitle="No solo construyo tu sistema, lo opero y mantengo para que nunca te detengas. Paga por resultados, no por horas."
          className="mb-16"
        />

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card 1: Sprint */}
          <div className="bg-bg-page text-ink-default rounded-2xl p-8 lg:p-10 flex flex-col shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-brand-primary to-brand-accent"></div>

            <h3 className="font-heading font-bold text-2xl mb-2">
              Sprint de Validación
            </h3>
            <p className="text-ink-muted mb-8 text-sm uppercase tracking-wide font-semibold">
              Para probar sin riesgo alto
            </p>

            <div className="mb-10 flex-grow space-y-4">
              <ul className="space-y-4">
                {[
                  "Diagnóstico y puesta en marcha rápida",
                  "1 flujo automatizado crítico funcionado",
                  "Infraestructura gestionada y segura",
                  "Entregable: Sistema operando",
                  "Soporte técnico estándar",
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
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
                    <span className="text-ink-default font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border-subtle pt-8 mt-auto">
              <p className="text-sm text-ink-muted mb-1 font-semibold">
                Operación mensual
              </p>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold font-heading text-brand-primary">
                  $1,800
                </span>
                <span className="ml-1 text-ink-muted">MXN / mes</span>
              </div>
              <p className="text-xs text-ink-muted/80 mb-6 font-medium">
                + Setup inicial: $6,500 MXN (pago único)
              </p>
              <Button
                href="https://calendly.com/rodrigo-bermejo08/30min"
                external
                variant="primary"
                className="w-full"
              >
                Iniciar Sprint
              </Button>
            </div>
          </div>

          {/* Card 2: Mensual - Using Brand Primary as BG */}
          <div className="bg-brand-primary text-white rounded-2xl p-8 lg:p-10 flex flex-col border border-blue-400/30 shadow-xl relative">
            <div className="absolute top-4 right-4 bg-brand-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              RECOMENDADO
            </div>

            <h3 className="font-heading font-bold text-2xl mb-2">
              Socio Operativo
            </h3>
            <p className="text-blue-100 mb-8 text-sm uppercase tracking-wide font-semibold">
              Tranquilidad total y escala
            </p>

            <div className="mb-10 flex-grow space-y-4">
              <ul className="space-y-4">
                {[
                  "Todo lo del Sprint + Mejoras continuas",
                  "Mantenimiento proactivo de flujos",
                  "Dashboards de rendimiento en vivo",
                  "Soporte prioritario (WhatsApp directo)",
                  "Consultoría mensual de optimización",
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
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
                    <span className="text-blue-50 font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-blue-400/30 pt-8 mt-auto">
              <p className="text-sm text-blue-200 mb-1 font-semibold">
                Operación mensual
              </p>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-bold font-heading">$3,500</span>
                <span className="ml-1 text-blue-300">MXN / mes</span>
              </div>
              <p className="text-xs text-blue-300/80 mb-6 font-medium">
                + Setup inicial: $6,500 MXN (pago único)
              </p>
              <Button
                href="https://calendly.com/rodrigo-bermejo08/30min"
                external
                variant="secondary"
                className="w-full"
              >
                Agendar Entrevista
              </Button>
            </div>
          </div>
        </div>

        <p className="text-center text-blue-200/60 text-sm mt-12 max-w-2xl mx-auto italic">
          * Nota: El sistema opera en mi infraestructura para garantizar
          estabilidad. Si requieres entrega de código fuente (self-hosted), se
          cotiza como implementación personalizada.
        </p>
      </div>
    </section>
  );
}
