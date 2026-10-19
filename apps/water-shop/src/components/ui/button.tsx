import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-bold transition-[transform,background-color,box-shadow,opacity] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-brand-700 text-white shadow-[0_6px_16px_-6px_rgb(14_94_111/0.6)] hover:bg-brand-600',
        success: 'bg-pos-600 text-white shadow-[0_6px_16px_-6px_rgb(20_135_75/0.55)] hover:bg-pos-700',
        danger: 'bg-neg-600 text-white hover:bg-neg-700',
        secondary: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
        outline: 'border border-line bg-surface text-ink hover:bg-surface-2',
        ghost: 'text-ink-2 hover:bg-surface-2',
        'danger-soft': 'bg-neg-50 text-neg-700 hover:bg-neg-50/70',
      },
      size: {
        sm: 'h-10 px-3 text-sm [&_svg]:size-4',
        md: 'h-12 px-4 text-base [&_svg]:size-5',
        lg: 'h-14 px-5 text-lg [&_svg]:size-6',
        xl: 'h-16 px-6 text-xl [&_svg]:size-6',
        icon: 'size-12 [&_svg]:size-6',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, block, type = 'button', ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
));
Button.displayName = 'Button';
