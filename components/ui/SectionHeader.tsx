import { clsx } from "clsx";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  light?: boolean;
}

export function SectionHeader({ eyebrow, title, subtitle, align = "center", className, light = false }: SectionHeaderProps) {
  return (
    <div className={clsx("max-w-3xl mb-16", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      {eyebrow && (
        <span className={clsx("block mb-3 font-heading font-semibold uppercase tracking-wider text-sm", light ? "text-accent-teal" : "text-accent-teal")}>
          {eyebrow}
        </span>
      )}
      <h2 className={clsx("font-heading font-bold text-3xl md:text-4xl mb-6", light ? "text-white" : "text-gray-900")}>
        {title}
      </h2>
      {subtitle && (
        <p className={clsx("font-body text-lg md:text-xl leading-relaxed", light ? "text-blue-100" : "text-gray-600")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
