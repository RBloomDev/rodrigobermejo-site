import React from "react";
import Link from "next/link";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  href?: string;
  external?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  href,
  external,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-heading font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

  const variants = {
    primary:
      "bg-brand-primary text-white hover:bg-[#104366] hover:shadow-lg hover:shadow-brand-primary/20 active:translate-y-0.5 focus:ring-brand-primary",
    secondary:
      "bg-brand-accent text-white hover:bg-[#0e8f93] hover:shadow-lg hover:shadow-brand-accent/20 active:translate-y-0.5 focus:ring-brand-accent",
    outline:
      "bg-transparent border border-border-default text-ink-default hover:border-ink-default hover:text-ink-default focus:ring-ink-muted dark:border-border-default",
    ghost:
      "bg-transparent text-ink-muted hover:bg-bg-section hover:text-ink-default focus:ring-ink-muted",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const styles = clsx(baseStyles, variants[variant], sizes[size], className);

  if (href) {
    const linkProps = external
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};
    return (
      <Link href={href} className={styles} {...linkProps}>
        {children}
      </Link>
    );
  }

  return (
    <button className={styles} {...props}>
      {children}
    </button>
  );
}
