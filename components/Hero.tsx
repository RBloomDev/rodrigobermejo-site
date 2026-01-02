import { Button } from "@/components/ui/Button";

export default function Hero() {
  return (
    <section className="relative py-28 md:py-36 overflow-hidden bg-brand-primary">
      {/* Subtle Grain/Noise Background - keeping opacity for texture */}
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      ></div>

      {/* Abstract Gradients - Adjusted using brand-accent and white */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-accent/20 rounded-full blur-3xl -z-10 animate-pulse transform translate-x-1/2 -translate-y-1/2"
        style={{ animationDuration: "8s" }}
      ></div>
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl -z-10 animate-pulse transform -translate-x-1/2 translate-y-1/2"
        style={{ animationDuration: "10s" }}
      ></div>

      <div className="container mx-auto px-6 text-center max-w-5xl relative z-10">
        {/* Badge: using brand-accent for text and subtle blue bg */}
        <span className="inline-block py-1.5 px-4 rounded-full bg-blue-900/40 text-brand-accent text-xs font-bold uppercase tracking-widest mb-8 border border-blue-700/50 backdrop-blur-sm">
          AUTOMATIZACIÓN DE NEGOCIOS
        </span>

        <h1 className="mb-8 font-heading font-bold text-5xl md:text-6xl lg:text-7xl leading-[1.1] text-white tracking-tight">
          Sistemas que eliminan el <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-brand-accent to-white">
            caos operativo
          </span>
        </h1>

        <p className="mb-12 font-body text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto leading-relaxed font-light">
          Diseño y opero automatizaciones para que tu negocio funcione con
          orden: seguimiento, reportes y procesos sin depender de memoria ni
          personas clave.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
          <Button
            href="https://calendly.com/rodrigo-bermejo08/30min"
            external
            variant="secondary"
            size="lg"
            className="w-full sm:w-auto min-w-[200px] shadow-xl shadow-brand-accent/10 font-bold"
          >
            Agendar diagnóstico
          </Button>
          {/* Outline Button on Dark background needs manual white text override or specific variant, using custom logic here for hero consistency */}
          <Button
            href="#ofertas"
            external
            variant="primary"
            className="w-full sm:w-auto min-w-[200px] shadow-xl shadow-brand-accent/10 font-bold border border-brand-accent"
          >
            Ver ofertas
          </Button>
        </div>

        <p className="mt-8 text-sm text-blue-300/80 font-body">
          * Sin compromiso. En 15 minutos identificamos si hay una oportunidad
          real de automatizar.
        </p>
      </div>
    </section>
  );
}
