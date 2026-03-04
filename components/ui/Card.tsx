import { forwardRef } from "react";

type CardVariant = "default" | "elevated" | "outline" | "ghost";

const variantStyles: Record<CardVariant, string> = {
  default: "bg-zinc-900 border border-zinc-800",
  elevated: "bg-zinc-900 border border-zinc-800",
  outline: "bg-transparent border border-zinc-800",
  ghost: "bg-zinc-800/30 border border-transparent hover:bg-zinc-800/50",
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      padding = "md",
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const paddingStyles = {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    };
    return (
      <div
        ref={ref}
        className={`rounded-2xl ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export function CardHeader({
  icon,
  title,
  badge,
  description,
  className = "",
}: {
  icon?: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center gap-2.5">
        {icon && <div className="shrink-0">{icon}</div>}
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          {description && (
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          )}
        </div>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
      </div>
    </div>
  );
}
