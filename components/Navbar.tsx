import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-bg-page/95 backdrop-blur-sm border-b border-border-subtle transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-2">
          {/* Logo "rb" simplified text representation */}
          <span className="font-display text-4xl text-brand-primary group-hover:text-brand-accent transition-colors pb-1">
            rb
          </span>
          <span className="hidden sm:block font-heading font-bold text-lg text-ink-balance group-hover:text-brand-primary transition-colors mt-1">
            Rodrigo Bermejo
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {["Problemas", "Solución", "Ofertas", "Sobre mí", "Blog"].map(
            (item) => (
              <Link
                key={item}
                href={
                  item === "Blog"
                    ? "/blog"
                    : `/#${item
                        .toLowerCase()
                        .replace(" ", "-")
                        .replace("ó", "o")}`
                }
                className="px-4 py-2 font-heading font-medium text-ink-muted hover:text-brand-primary hover:bg-bg-section rounded-md transition-all text-sm"
              >
                {item}
              </Link>
            )
          )}
          <div className="ml-4 pl-4 border-l border-border-subtle">
            <Button
              href="https://calendly.com"
              external
              variant="primary"
              size="sm"
            >
              Agendar diagnóstico
            </Button>
          </div>
        </nav>

        {/* Mobile Menu Button - using ink-default icons */}
        <button className="md:hidden p-2 text-ink-default hover:bg-bg-section rounded-md">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
