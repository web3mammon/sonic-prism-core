import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ChannelCardProps {
  icon: ReactNode;
  title: string;
  price: string;
  badge?: string;
  features: string[];
  onClick: () => void;
  delay?: number;
  emphasized?: boolean;
}

export function ChannelCard({
  icon,
  title,
  price,
  badge,
  features,
  onClick,
  delay = 0,
  emphasized = false
}: ChannelCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl transition-all duration-300 relative ${
        emphasized
          ? 'p-12 border border-[#ef4444] transform md:scale-105'
          : 'p-8 border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.2)]'
      }`}
      style={emphasized ? {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))',
        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.2)'
      } : {}}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-[#ef4444] text-white px-4 py-1 rounded-full text-xs font-medium">
            {badge.toUpperCase()}
          </span>
        </div>
      )}

      {/* Icon */}
      <div className="text-center mb-6">
        <div className={`inline-block p-3 rounded-xl mb-4 ${
          emphasized
            ? 'bg-gradient-to-br from-[#ef4444] to-[#dc2626]'
            : 'bg-[#0a0a0a]'
        }`}>
          {icon}
        </div>
        <h3 className="text-2xl font-medium mb-2">{title}</h3>
        <p className="text-[#a0a0a0] text-sm">AI for your business</p>
      </div>

      {/* Price */}
      <div className="text-center mb-8">
        <div className="text-5xl font-light mb-2">
          {price}
          <span className="text-2xl text-[#a0a0a0]">/mo</span>
        </div>
        <p className="text-[#a0a0a0] text-sm">{features[0]}</p>
      </div>

      {/* Features */}
      <div className="space-y-4 mb-8">
        {features.slice(1).map((feature, index) => (
          <div key={index} className="flex items-start gap-3">
            <i className="fas fa-check text-green-500 mt-1"></i>
            <span className="text-sm font-light">{feature}</span>
          </div>
        ))}
      </div>

      {/* CTA Button - styled like marketing site */}
      <button
        className={`block w-full px-6 py-3 rounded-full text-center font-medium transition-colors ${
          emphasized
            ? 'bg-[#ef4444] text-white hover:bg-[#dc2626]'
            : 'bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]'
        }`}
      >
        Start Free Trial
      </button>
    </motion.div>
  );
}
