import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { ReactNode } from "react";

interface ChannelCardProps {
  icon: ReactNode;
  title: string;
  price: string;
  badge?: string;
  features: string[];
  onClick: () => void;
  delay?: number;
}

export function ChannelCard({
  icon,
  title,
  price,
  badge,
  features,
  onClick,
  delay = 0
}: ChannelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={onClick}
      className="group relative cursor-pointer"
    >
      <div className="relative rounded-2xl border-2 border-white/8 bg-white/[0.02] p-8 group-hover:border-primary/50 group-hover:bg-white/[0.04] transition-all duration-300 h-full flex flex-col"
      >
        {/* Badge */}
        {badge && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-white border-primary px-3 py-1">
              {badge}
            </Badge>
          </div>
        )}

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
        </div>

        {/* Title & Price */}
        <div className="text-center mb-6">
          <h3 className="text-2xl font-extralight mb-2">{title}</h3>
          <p className="text-3xl font-light text-primary">{price}</p>
          <p className="text-sm text-muted-foreground mt-1">per month</p>
        </div>

        {/* Features */}
        <div className="space-y-3 flex-1">
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-2">
              <div className="mt-1 flex-shrink-0">
                <svg
                  className="w-4 h-4 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground">{feature}</p>
            </div>
          ))}
        </div>

        {/* Arrow Indicator */}
        <div className="flex items-center justify-center mt-6">
          <div className="flex items-center gap-2 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none" />
      </div>
    </motion.div>
  );
}
