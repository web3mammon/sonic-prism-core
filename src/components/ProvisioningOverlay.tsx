import { useState, useEffect } from 'react';

interface ProvisioningOverlayProps {
  isVisible: boolean;
  businessName: string;
}

const provisioningMessages = [
  "Building your new voice AI agent...",
  "Training it on your business...",
  "Generating custom audio files...",
  "Setting up your dashboard...",
  "Configuring voice recognition...",
  "Optimizing response times...",
  "Testing system connections...",
  "Almost ready to go live..."
];

export function ProvisioningOverlay({ isVisible, businessName }: ProvisioningOverlayProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [dots, setDots] = useState('');

  // Cycle through messages every 4 seconds
  useEffect(() => {
    if (!isVisible) return;

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % provisioningMessages.length);
    }, 4000);

    return () => clearInterval(messageInterval);
  }, [isVisible]);

  // Animate dots every 500ms
  useEffect(() => {
    if (!isVisible) return;

    const dotsInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(dotsInterval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0a0a0a] bg-opacity-90"
        style={{ backdropFilter: 'blur(4px)' }}
      />

      {/* Main Content Container - 60-70% of screen */}
      <div className="relative bg-[#1a1a1a] rounded-2xl p-12 mx-4 max-w-lg w-full shadow-2xl border border-gray-800">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium text-white mb-2 font-sans">
            Welcome to Klariqo, {businessName}!
          </h2>
          <p className="text-[#a0a0a0] text-base font-light font-sans">
            We're setting up your AI voice assistant
          </p>
        </div>

        {/* Loading Animation */}
        <div className="flex flex-col items-center space-y-8">

          {/* Spinning Circle */}
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#a0a0a0] border-opacity-20 rounded-full animate-spin border-t-white"></div>

            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Dynamic Status Text */}
          <div className="text-center min-h-[60px] flex flex-col justify-center">
            <p className="text-white text-lg font-normal font-sans mb-1">
              {provisioningMessages[currentMessageIndex]}{dots}
            </p>

            {/* Progress indicator */}
            <div className="flex justify-center space-x-2 mt-4">
              {provisioningMessages.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentMessageIndex
                      ? 'bg-white'
                      : index < currentMessageIndex
                        ? 'bg-[#a0a0a0]'
                        : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Estimated time */}
          <p className="text-[#a0a0a0] text-sm font-light font-sans">
            This usually takes 30-60 seconds
          </p>
        </div>

        {/* Subtle animation overlay */}
        <div className="absolute inset-0 rounded-2xl">
          <div className="absolute top-0 left-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-30"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-white rounded-full animate-ping opacity-20" style={{ animationDelay: '1s' }}></div>
          <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-25" style={{ animationDelay: '2s' }}></div>
        </div>
      </div>
    </div>
  );
}