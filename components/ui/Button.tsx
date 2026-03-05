import Link from 'next/link';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'neon' | 'neon-violet';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-black hover:bg-white/90 focus:ring-white/30 active:scale-[0.98]',
  secondary:
    'bg-[#1e1e1e] hover:bg-[#262626] text-white border border-[#2d2d2d] hover:border-[#3a3a3a] focus:ring-[#3a3a3a] active:scale-[0.98]',
  outline:
    'bg-transparent border border-[#3a3a3a] text-[#9ca3af] hover:bg-[#1e1e1e] hover:text-white hover:border-[#3a3a3a] focus:ring-[#3a3a3a]',
  ghost:
    'bg-transparent text-[#666666] hover:text-white hover:bg-[#1e1e1e] focus:ring-[#3a3a3a]',
  danger:
    'bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 hover:bg-[#ef4444]/15 hover:border-[#ef4444]/30 focus:ring-[#ef4444]/30 active:scale-[0.98]',
  neon:
    'bg-[#7dd3fc] text-black hover:bg-[#93dffe] focus:ring-[#7dd3fc]/30 active:scale-[0.98] shadow-[0_0_12px_rgba(125,211,252,0.25)]',
  'neon-violet':
    'bg-[#a78bfa] text-black hover:bg-[#b79cfb] focus:ring-[#a78bfa]/30 active:scale-[0.98] shadow-[0_0_12px_rgba(167,139,250,0.25)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const baseStyles =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f0f0f] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

export interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'className'
> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', className = '', fullWidth = false, children, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
          fullWidth ? 'w-full' : ''
        } ${className}`.trim()}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export function buttonVariants(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]}`;
}

export { sizeStyles, variantStyles };

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
  variant = 'primary',
  size = 'md',
  className = '',
  fullWidth = false,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`.trim()}
    >
      {children}
    </Link>
  );
}
