import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Mic, Phone, Settings, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Profile } from '@/types/profiles';

interface Notification {
  id: string;
  type: 'welcome' | 'phone-setup' | 'complete';
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  dismissible: boolean;
}

export function NotificationBanner() {
  const { profile } = useAuth();
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!profile) return;

    const newNotifications: Notification[] = [];

    // Welcome notification for first-time users  
    // Using type assertion since types might not be fully updated yet
    const extendedProfile = profile as any;
    if (extendedProfile.onboarding_completed && !dismissedNotifications.includes('welcome')) {
      newNotifications.push({
        id: 'welcome',
        type: 'welcome',
        title: '🎉 Congratulations! Your AI agent is ready',
        description: 'Click the demo button below to hear your custom AI agent in action',
        actionText: 'Listen to Demo',
        onAction: () => {
          const demoButton = document.querySelector('[data-demo-button]') as HTMLElement;
          if (demoButton) {
            demoButton.scrollIntoView({ behavior: 'smooth' });
            demoButton.focus();
          }
        },
        dismissible: true
      });
    }

    // Phone setup notification (shown after welcome is dismissed)
    if (extendedProfile.onboarding_completed && 
        dismissedNotifications.includes('welcome') && 
        !extendedProfile.phone_number && 
        !dismissedNotifications.includes('phone-setup')) {
      newNotifications.push({
        id: 'phone-setup',
        type: 'phone-setup',
        title: '📞 Get your dedicated phone number',
        description: 'Set up call forwarding to start receiving customer calls through your AI agent',
        actionText: 'Setup Phone',
        onAction: () => {
          // Navigate to phone setup section
          const phoneSection = document.querySelector('[data-phone-setup]') as HTMLElement;
          if (phoneSection) {
            phoneSection.scrollIntoView({ behavior: 'smooth' });
          }
        },
        dismissible: true
      });
    }

    setNotifications(newNotifications);
  }, [profile, dismissedNotifications]);

  const handleDismiss = (notificationId: string) => {
    setDismissedNotifications(prev => [...prev, notificationId]);
  };

  const currentNotification = notifications.find(n => !dismissedNotifications.includes(n.id));

  if (!currentNotification) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'welcome':
        return <Mic className="h-5 w-5" />;
      case 'phone-setup':
        return <Phone className="h-5 w-5" />;
      case 'complete':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'welcome':
        return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200';
      case 'phone-setup':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200';
      case 'complete':
        return 'bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-200';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Card className={`mb-6 ${getColors(currentNotification.type)}`}>
      <div className="p-4 flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(currentNotification.type)}
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{currentNotification.title}</h3>
            <p className="text-sm mt-1 opacity-90">{currentNotification.description}</p>
            
            {currentNotification.actionText && currentNotification.onAction && (
              <Button
                onClick={currentNotification.onAction}
                size="sm"
                className="mt-2"
                variant="outline"
              >
                {currentNotification.actionText}
              </Button>
            )}
          </div>
        </div>
        
        {currentNotification.dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss(currentNotification.id)}
            className="flex-shrink-0 opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
}