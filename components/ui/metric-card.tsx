'use client';

import { ReactNode } from 'react';
import { Card } from './card-premium';
import { AnimatedNumber, AnimatedCurrency, AnimatedPercentage } from './animated-number';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  type?: 'number' | 'currency' | 'percentage';
  trend?: number;
  icon?: ReactNode;
  subtitle?: string;
  variant?: 'default' | 'glass' | 'premium';
  className?: string;
}

export function MetricCard({
  title,
  value,
  type = 'number',
  trend,
  icon,
  subtitle,
  variant = 'premium',
  className,
}: MetricCardProps) {
  const hasTrend = trend !== undefined;
  const isPositiveTrend = trend ? trend > 0 : false;
  const isNeutralTrend = trend === 0;

  const getTrendIcon = () => {
    if (isNeutralTrend) return <Minus className="w-4 h-4" />;
    return isPositiveTrend ? (
      <TrendingUp className="w-4 h-4" />
    ) : (
      <TrendingDown className="w-4 h-4" />
    );
  };

  const getTrendColor = () => {
    if (isNeutralTrend) return 'text-muted-foreground';
    return isPositiveTrend
      ? 'text-success-700 dark:text-success-500'
      : 'text-danger-700 dark:text-danger-500';
  };

  return (
    <Card
      variant={variant}
      className={cn(
        'hover:shadow-premium-lg transition-all duration-300 hover:scale-[1.02]',
        className
      )}
    >
      <div className="p-6 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && (
            <div className="p-2 rounded-lg bg-royal-500/10 text-royal-500">
              {icon}
            </div>
          )}
        </div>

        {/* Value */}
        <div className="space-y-1">
          <p className="text-3xl font-bold tracking-tight">
            {type === 'currency' && <AnimatedCurrency value={value} />}
            {type === 'percentage' && (
              <AnimatedPercentage value={value} showSign={false} />
            )}
            {type === 'number' && <AnimatedNumber value={value} />}
          </p>

          {/* Trend & Subtitle */}
          <div className="flex items-center gap-2">
            {hasTrend && (
              <div
                className={cn(
                  'flex items-center gap-1 text-sm font-medium',
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                <AnimatedPercentage value={Math.abs(trend)} showSign={false} />
              </div>
            )}
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

interface MetricGridProps {
  children: ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}

export function MetricGrid({ children, cols = 4, className }: MetricGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[cols], className)}>
      {children}
    </div>
  );
}
