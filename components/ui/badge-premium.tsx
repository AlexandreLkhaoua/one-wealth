import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90',
        secondary:
          'border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-90',
        success:
          'border-transparent bg-[var(--chart-5)]/10 text-[var(--chart-5)] ring-1 ring-[color:var(--chart-5)]/20',
        warning:
          'border-transparent bg-[var(--accent)]/10 text-[var(--accent)] ring-1 ring-[color:var(--accent)]/20',
        danger:
          'border-transparent bg-[var(--destructive)]/10 text-[var(--destructive)] ring-1 ring-[color:var(--destructive)]/20',
        outline: 'text-[var(--foreground)] border-[var(--border)]',
        glass:
          'glass-effect text-[var(--foreground)] border-white/10',
        glow: 'border-[var(--accent)] bg-[var(--accent)]/20 text-[var(--accent-foreground)] shadow-glow',
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
