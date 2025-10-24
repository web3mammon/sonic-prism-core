import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ModernCardProps extends React.ComponentProps<typeof Card> {
  variant?: "default" | "gradient" | "glass" | "elevated";
  hover?: boolean;
  delay?: number;
}

export function ModernCard({
  children,
  className,
  variant = "default",
  hover = true,
  delay = 0,
  ...props
}: ModernCardProps) {
  const variants = {
    default: "bg-card border-border",
    gradient: "bg-gradient-to-br from-card via-card to-secondary/30 border-border/50",
    glass: "bg-card/50 backdrop-blur-xl border-white/10",
    elevated: "bg-card border-border shadow-lg shadow-primary/5"
  };

  const hoverClass = hover
    ? "hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
    : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card
        className={cn(
          "transition-all duration-300",
          variants[variant],
          hoverClass,
          className
        )}
        {...props}
      >
        {children}
      </Card>
    </motion.div>
  );
}
