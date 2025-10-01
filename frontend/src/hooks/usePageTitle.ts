import { useEffect } from 'react';

export function usePageTitle(title: string) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    // Cleanup: restore previous title when component unmounts
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}

export function formatBusinessTitle(businessName: string | null | undefined, fallback: string = "AI Agent Dashboard"): string {
  if (businessName) {
    return `${businessName} AI Dashboard`;
  }
  return `Klariqo ${fallback}`;
}