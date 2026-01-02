import { Button } from "@/components/ui/Button";
import { SubscriptionBlock } from "@/components/SubscriptionBlock";

export default function Footer() {
  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com/rodrigobermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      ),
    },
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/rodrigolbermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      url: "https://x.com/rodrigobermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/rodrigolbermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"
          />
        </svg>
      ),
    },
    {
      name: "Threads",
      url: "https://www.threads.com/@rodrigolbermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M17.74 12.07c0-.28-.02-.55-.05-.81a6.63 6.63 0 0 0-4.08-5.74 6.78 6.78 0 0 0-7.3 1.9 6.7 6.7 0 0 0-1.74 5.37 7.04 7.04 0 0 0 3.74 5.56 5.8 5.8 0 0 0 4.16.52l-.24 1.93a7.88 7.88 0 0 1-5.18-.74 9.07 9.07 0 0 1-4.78-7.25A8.7 8.7 0 0 1 4.54 5.6a8.9 8.9 0 0 1 7.23-2.14 8.7 8.7 0 0 1 5.46 3.1A8.2 8.2 0 0 1 19 12.06v.71c0 1.25.13 1.63.4 1.63.22 0 .37-.3.37-1.56v-2.09a10.9 10.9 0 0 0-1.09-5.1 10.65 10.65 0 0 0-6.43-5.26A11.06 11.06 0 0 0 0 12.11a11 11 0 0 0 3.2 7.78 10.82 10.82 0 0 0 7.72 3.11c2.14 0 4.2-.6 6-1.75l-1-1.75a9.07 9.07 0 0 1-5 1.5 8.86 8.86 0 0 1-6.3-2.58A9.15 9.15 0 0 1 2 12.06 9 9 0 0 1 3.53 7a8.62 8.62 0 0 1 5.86-3.5 8.5 8.5 0 0 1 6.88 1.93 8.36 8.36 0 0 1 2.38 5.44v1.94c0 2.6-1 4.2-3.3 4.2-1.3 0-2.35-.97-2.35-2.9zm-2.07-.36c0 1.57-.6 2.08-1.28 2.08-.66 0-1.29-.6-1.29-2.08a2.53 2.53 0 0 1 .15-1 2.9 2.9 0 0 1 2.42 1z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/RodrigoBermejoIA",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      name: "YouTube",
      url: "https://www.youtube.com/@rodrigolbermejo",
      icon: (
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      ),
    },
  ];

  return (
    <footer className="bg-bg-page border-t border-border-subtle py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
          <div className="text-center md:text-left">
            <span className="font-display text-2xl text-ink-default block mb-2">
              rb
            </span>
            <p className="text-ink-muted text-sm">
              © 2026 Rodrigo Bermejo. Todos los derechos reservados.
            </p>
          </div>

          <div className="flex gap-4 flex-wrap justify-center">
            {socialLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-faint hover:text-brand-primary hover:scale-110 transition-all duration-200"
                aria-label={link.name}
              >
                {link.icon}
              </a>
            ))}
          </div>

          <div className="hidden md:block">
            <Button
              href="https://calendly.com"
              external
              variant="primary"
              size="sm"
            >
              Agendar
            </Button>
          </div>
        </div>

        {/* Subscription Block Integrated in Footer */}
        <div className="border-t border-border-subtle pt-12">
          <SubscriptionBlock source="footer" />
        </div>
      </div>
    </footer>
  );
}
