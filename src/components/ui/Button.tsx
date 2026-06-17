import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-btn transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary-dark text-white shadow-sm',
        secondary:
          'bg-surface-light dark:bg-surface-dark text-current border border-border-light dark:border-border-dark hover:bg-bg-light dark:hover:bg-bg-dark',
        ghost: 'text-muted-light dark:text-muted-dark hover:bg-bg-light dark:hover:bg-bg-dark hover:text-current',
        danger: 'bg-danger hover:bg-danger/90 text-white',
        success: 'bg-success hover:bg-success/90 text-white',
        whatsapp: 'bg-whatsapp hover:bg-whatsapp/90 text-white shadow-sm',
      },
      size: {
        sm: 'h-8 px-3 text-small',
        md: 'h-10 px-4 text-body',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
        iconSm: 'h-8 w-8',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = 'Button';
