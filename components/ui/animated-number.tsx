'use client';

import { useEffect, useRef } from 'react';
import CountUp from 'react-countup';
import { cn } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
  separator?: string;
}

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 2,
  prefix = '',
  suffix = '',
  className,
  separator = ' ',
}: AnimatedNumberProps) {
  const prevValue = useRef(value);

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return (
    <CountUp
      start={prevValue.current}
      end={value}
      duration={duration}
      decimals={decimals}
      decimal=","
      separator={separator}
      prefix={prefix}
      suffix={suffix}
      preserveValue
      className={cn('tabular-nums', className)}
    />
  );
}

export function AnimatedCurrency({
  value,
  currency = 'EUR',
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  return (
    <AnimatedNumber
      value={value}
      decimals={2}
      suffix={` ${currency}`}
      className={className}
    />
  );
}

export function AnimatedPercentage({
  value,
  className,
  showSign = true,
}: {
  value: number;
  className?: string;
  showSign?: boolean;
}) {
  const isPositive = value >= 0;
  const colorClass = isPositive
    ? 'text-success-700 dark:text-success-500'
    : 'text-danger-700 dark:text-danger-500';

  return (
    <AnimatedNumber
      value={value}
      decimals={2}
      prefix={showSign && isPositive ? '+' : ''}
      suffix="%"
      className={cn(colorClass, className)}
    />
  );
}
