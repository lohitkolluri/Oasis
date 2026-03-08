import Link from 'next/link';
import { forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'neon' | 'neon-violet';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-uber-green text-white hover:bg-uber-green/90 focus:ring-uber-green/30 active:scale-[0.98]',
  secondary:
    'bg-[#171717] hover:bg-[#262626] text-white border border-[#333] hover:border-[#404040] focus:ring-[#404040] active:scale-[0.98]',
  outline:
    'bg-transparent border border-[#404040] text-[#a3a3a3] hover:bg-[#171717] hover:text-white hover:border-[#404040] focus:ring-[#404040]',
  ghost:
    'bg-transparent text-[#737373] hover:text-white hover:bg-[#171717] focus:ring-[#404040]',
  danger:
    'bg-uber-red/10 text-uber-red border border-uber-red/20 hover:bg-uber-red/15 hover:border-uber-red/30 focus:ring-uber-red/30 active:scale-[0.98]',
  neon:
    'bg-uber-blue text-white hover:bg-uber-blue/90 focus:ring-uber-blue/30 active:scale-[0.98] shadow-[0_0_12px_rgba(39,110,241,0.25)]',
  'neon-violet':
    'bg-uber-purple text-white hover:bg-uber-purple/90 focus:ring-uber-purple/30 active:scale-[0.98] shadow-[0_0_12px_rgba(115,86,191,0.25)]',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
};

const baseStyles =
  'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

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
