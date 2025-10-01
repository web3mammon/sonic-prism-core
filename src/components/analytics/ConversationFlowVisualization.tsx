import React from 'react';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationFlowVisualizationProps {
  currentStage: string;
  className?: string;
}

const stages = [
  { id: 'greeting', label: 'Greeting' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'booking', label: 'Booking' },
  { id: 'closing', label: 'Closing' }
];

export const ConversationFlowVisualization: React.FC<ConversationFlowVisualizationProps> = ({
  currentStage,
  className
}) => {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isUpcoming = index > currentIndex;

        return (
          <React.Fragment key={stage.id}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'rounded-full p-2 transition-all',
                  isCompleted && 'bg-green-100 dark:bg-green-900/20',
                  isCurrent && 'bg-primary/20 ring-2 ring-primary',
                  isUpcoming && 'bg-muted'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <Circle className={cn(
                    'h-4 w-4',
                    isCurrent && 'text-primary animate-pulse',
                    isUpcoming && 'text-muted-foreground'
                  )} />
                )}
              </div>
              <span className={cn(
                'text-xs font-medium',
                isCurrent && 'text-primary',
                isUpcoming && 'text-muted-foreground'
              )}>
                {stage.label}
              </span>
            </div>
            {index < stages.length - 1 && (
              <ArrowRight className={cn(
                'h-4 w-4 mb-5',
                index < currentIndex ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
