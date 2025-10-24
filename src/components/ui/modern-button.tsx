import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface ModernButtonProps extends React.ComponentProps<typeof Button> {
  variant?: "default" | "gradient" | "ghost" | "outline" | "secondary" | "destructive" | "link";
}

export const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ children, className, variant = "default", ...props }, ref) => {
    const gradientClass = variant === "gradient"
      ? "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25 text-primary-foreground"
      : "";

    return (
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-block"
      >
        <Button
          ref={ref}
          className={cn(
            "transition-all duration-200",
            gradientClass,
            className
          )}
          variant={variant === "gradient" ? "default" : variant}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

ModernButton.displayName = "ModernButton";
