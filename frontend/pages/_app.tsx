// pages/_app.tsx
import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import SplashScreen from '../components/SplashScreen';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [showSplashScreen, setShowSplashScreen] = useState(true);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Hide splash screen after delay
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 2000); // Reduced time to account for exit animation

    // Set app ready with a slight delay to ensure smooth transition
    const readyTimer = setTimeout(() => {
      setAppReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      clearTimeout(readyTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Only register in production
      if (process.env.NODE_ENV === 'production') {
        window.addEventListener('load', () => {
          navigator.serviceWorker
            .register('/sw.js')
            .then((registration) => {
              console.log('SW registered:', registration);
              
              // Handle updates
              registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (newWorker) {
                  newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                      // New content is available, show refresh prompt if needed
                      if (confirm('New version available! Would you like to update?')) {
                        window.location.reload();
                      }
                    }
                  });
                }
              });
            })
            .catch((error) => {
              console.error('SW registration failed:', error);
            });
        });

        // Handle communication between SW and the page
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data && event.data.type === 'CACHE_UPDATED') {
            // Handle cache updates if needed
            console.log('Cache updated:', event.data);
          }
        });
      }
    }
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <AnimatePresence mode="wait">
        {showSplashScreen && (
          <SplashScreen
            onAnimationComplete={() => setShowSplashScreen(false)}
          />
        )}
      </AnimatePresence>
      <div style={{ opacity: appReady ? 1 : 0, transition: 'opacity 0.3s' }}>
        <Component {...pageProps} />
      </div>
    </SessionProvider>
  );
}

