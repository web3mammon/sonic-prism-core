import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  onStepClick?: (step: number) => void;
}

export function ProgressSteps({ currentStep, totalSteps, labels, onStepClick }: ProgressStepsProps) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4">
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white/8 -translate-y-1/2 -z-10" />

        {/* Active Progress Line */}
        <motion.div
          className="absolute top-1/2 left-0 h-[2px] bg-primary -translate-y-1/2 -z-10"
          initial={{ width: '0%' }}
          animate={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`
          }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />

        {/* Steps */}
        {Array.from({ length: totalSteps }, (_, index) => {
          const step = index + 1;
          const isCompleted = step < currentStep;
          const isCurrent = step === currentStep;
          const isFuture = step > currentStep;

          return (
            <div key={step} className="flex flex-col items-center gap-2 relative">
              {/* Step Circle */}
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                onClick={() => onStepClick?.(step)}
                className={`
                  w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-medium text-xs md:text-sm
                  transition-all duration-300 relative z-10
                  ${onStepClick ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                  ${isCompleted ? 'bg-primary text-white' : ''}
                  ${isCurrent ? 'bg-primary text-white md:scale-110 ring-4 ring-primary/20' : ''}
                  ${isFuture ? 'bg-white/[0.02] border-2 border-white/8 text-muted-foreground' : ''}
                `}
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Check className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <span>{step}</span>
                )}
              </motion.button>

              {/* Step Label (optional, hidden on mobile) */}
              {labels && labels[index] && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 + 0.2 }}
                  className={`
                    hidden md:block text-xs font-medium absolute -bottom-6 whitespace-nowrap
                    ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}
                  `}
                >
                  {labels[index]}
                </motion.p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
