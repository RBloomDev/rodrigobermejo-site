import Image from "next/image";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default function About() {
  return (
    <section id="sobre-mi" className="py-24 md:py-32 bg-bg-page">
      <div className="container mx-auto px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-16">
          <div className="w-64 h-64 md:w-80 md:h-80 relative flex-shrink-0">
            <div className="w-full h-full rounded-full overflow-hidden border-8 border-bg-section shadow-2xl relative z-10">
              <div className="absolute inset-0 bg-border-subtle animate-pulse -z-10"></div>
              <Image
                src="/images/profile.jpg"
                alt="Rodrigo Bermejo"
                fill
                className="object-cover relative z-10"
                unoptimized
              />
            </div>
            {/* Decorative element behind */}
            <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-brand-accent/10 rounded-full blur-2xl -z-0"></div>
            <div className="absolute -top-6 -left-6 w-48 h-48 bg-brand-primary/10 rounded-full blur-2xl -z-0"></div>
          </div>

          <div className="text-center md:text-left flex-1">
            <SectionHeader
              align="left"
              eyebrow="SOBRE MÍ"
              title="No soy una agencia. Soy tu consultor técnico."
              className="mb-8"
              // Override SectionHeader default margins handling if needed conceptually, but class passing works
            />

            <div className="font-body text-ink-muted space-y-6 text-lg leading-relaxed">
              <p>
                Llevo años trabajando en la intersección entre tecnología y
                negocios. He visto de primera mano cómo sistemas mal
                implementados pueden paralizar una empresa en lugar de
                impulsarla.
              </p>
              <p>
                Mi enfoque es quirúrgico: entre, diagnostico, construyo y opero
                el sistema para que tú te enfoques en vender, atender y crecer.
              </p>
              <p>
                Mi objetivo es devolverte tiempo y control: menos &quot;copiar y
                pegar&quot;, más decisiones con datos.
              </p>
            </div>

            <blockquote className="mt-10 pl-6 border-l-4 border-brand-accent text-ink-muted font-quote italic text-xl">
              &quot;La tecnología debe trabajar para ti, no tú para la
              tecnología.&quot;
            </blockquote>
          </div>
        </div>
      </div>
    </section>
  );
}
