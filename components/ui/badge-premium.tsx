import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        success:
          'border-transparent bg-success-500/10 text-success-700 dark:text-success-500 ring-1 ring-success-500/20',
        warning:
          'border-transparent bg-warning-500/10 text-warning-700 dark:text-warning-500 ring-1 ring-warning-500/20',
        danger:
          'border-transparent bg-danger-500/10 text-danger-700 dark:text-danger-500 ring-1 ring-danger-500/20',
        outline: 'text-foreground border-border',
        glass:
          'glass-effect text-foreground border-white/10',
        glow: 'border-royal-500 bg-royal-500/20 text-royal-400 shadow-glow',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
