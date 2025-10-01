import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SentimentIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const SentimentIndicator: React.FC<SentimentIndicatorProps> = ({
  score,
  size = 'md',
  showLabel = false,
  className
}) => {
  const getSentimentData = () => {
    if (score > 0.3) {
      return {
        label: 'Positive',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900/20',
        icon: TrendingUp
      };
    } else if (score < -0.3) {
      return {
        label: 'Negative',
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-100 dark:bg-red-900/20',
        icon: TrendingDown
      };
    } else {
      return {
        label: 'Neutral',
        color: 'text-yellow-600 dark:text-yellow-400',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
        icon: Minus
      };
    }
  };

  const sentiment = getSentimentData();
  const Icon = sentiment.icon;

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className={cn('rounded-full p-1', sentiment.bgColor)}>
        <Icon className={cn(sizeClasses[size], sentiment.color)} />
      </div>
      {showLabel && (
        <span className={cn('text-sm font-medium', sentiment.color)}>
          {sentiment.label}
        </span>
      )}
    </div>
  );
};
