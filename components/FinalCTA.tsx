import { Button } from "@/components/ui/Button";

export default function FinalCTA() {
  return (
    <section className="py-32 bg-brand-primary text-white text-center relative overflow-hidden">
      {/* Background Decoration */}
      <div
        className="absolute top-0 left-0 w-full h-full opacity-10"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      ></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl -z-10 transform translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -z-10 transform -translate-x-1/2 -translate-y-1/2"></div>

      <div className="container mx-auto px-6 relative z-10 max-w-4xl">
        <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl mb-8 leading-tight">
          ¿Listo para escalar sin el{" "}
          <span className="text-brand-accent">caos</span>?
        </h2>
        <p className="font-body text-xl md:text-2xl text-blue-100 mb-12 max-w-2xl mx-auto leading-relaxed">
          Deja de operar &quot;a mano&quot; y empieza a tener un sistema que
          corre todos los días. Agendemos un diagnóstico y vemos si tiene
          sentido automatizar tu caso.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <Button
            href="https://calendly.com"
            external
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto px-10 py-5 text-lg shadow-xl shadow-brand-accent/20"
          >
            Agendar diagnóstico
          </Button>
        </div>

        <p className="mt-8 text-sm text-blue-200/60 font-body">
          Respuesta en menos de 24 horas hábiles.
        </p>
      </div>
    </section>
  );
}
