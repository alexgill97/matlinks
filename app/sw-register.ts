'use client'

// This script registers the service worker for offline functionality

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('SW registered: ', registration);
          
          // Try to sync offline check-ins whenever we get online
          window.addEventListener('online', () => {
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({
                type: 'SYNC_CHECKINS'
              });
            }
          });
        })
        .catch(registrationError => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

// Export a component to use in layout or pages
export function ServiceWorkerRegistration() {
  if (typeof window !== 'undefined') {
    registerServiceWorker();
  }
  return null;
} 