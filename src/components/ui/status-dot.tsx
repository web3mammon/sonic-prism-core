import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatusDotProps {
  status: "active" | "idle" | "error" | "success";
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusDot({ status, label, size = "md" }: StatusDotProps) {
  const colors = {
    active: "bg-green-500",
    success: "bg-green-500",
    idle: "bg-yellow-500",
    error: "bg-red-500"
  };

  const sizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3"
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <motion.div
          className={cn("rounded-full", colors[status], sizes[size])}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.8, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className={cn("absolute inset-0 rounded-full", colors[status], sizes[size])}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.5, 0, 0.5]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      {label && <span className="text-sm font-medium text-muted-foreground">{label}</span>}
    </div>
  );
}
