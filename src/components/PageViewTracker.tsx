import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Tracks page views in Google Analytics
 * Automatically sends page_view event when route changes
 */
export function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    // Send page view to Google Analytics whenever location changes
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title
      });

      console.log('[GA] Page view tracked:', location.pathname);
    }
  }, [location]);

  return null; // This component doesn't render anything
}
