import { forwardRef } from 'react';

type CardVariant = 'default' | 'elevated' | 'outline' | 'ghost' | 'neon';

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[#161616] border border-[#2d2d2d]',
  elevated: 'bg-[#1e1e1e] border border-[#2d2d2d]',
  outline: 'bg-transparent border border-[#2d2d2d]',
  ghost: 'bg-[#1e1e1e]/30 border border-transparent hover:bg-[#1e1e1e]/50',
  neon: 'bg-[#161616] border border-[#7dd3fc]/20 shadow-neon-cyan-sm',
};

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'default', padding = 'md', className = '', children, ...props }, ref) => {
    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
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
  },
);

Card.displayName = 'Card';

export function CardHeader({
  icon,
  title,
  badge,
  description,
  className = '',
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
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {description && <p className="text-xs text-[#666666] mt-0.5">{description}</p>}
        </div>
        {badge && <span className="ml-auto shrink-0">{badge}</span>}
      </div>
    </div>
  );
}
