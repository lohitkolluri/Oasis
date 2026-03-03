import { forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/25 focus:ring-emerald-500/50 active:scale-[0.98]",
  secondary:
    "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50 focus:ring-zinc-500/50 active:scale-[0.98]",
  outline:
    "bg-transparent border border-zinc-600 text-zinc-200 hover:bg-zinc-800/50 hover:border-zinc-500 focus:ring-zinc-500/50",
  ghost:
    "bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 focus:ring-zinc-500/50",
  danger:
    "bg-red-600/90 hover:bg-red-500 text-white focus:ring-red-500/50 active:scale-[0.98]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2.5 text-sm rounded-xl",
  lg: "px-6 py-3 text-base rounded-xl",
};

const baseStyles =
  "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      className = "",
      fullWidth = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
          fullWidth ? "w-full" : ""
        } ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

/** Utility to style a Link as a button */
export function buttonVariants(variant: ButtonVariant = "primary", size: ButtonSize = "md") {
  return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;
}

// Export for use in className
export { variantStyles, sizeStyles };

export interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  fullWidth = false,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? "w-full" : ""
      } ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
