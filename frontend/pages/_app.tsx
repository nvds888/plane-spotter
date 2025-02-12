"use client"


import { SessionProvider } from 'next-auth/react';
import type { AppProps } from 'next/app';
import { useState, useEffect } from 'react';
import SplashScreen from '../components/SplashScreen';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [showSplashScreen, setShowSplashScreen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplashScreen(false);
    }, 3000);
    return () => clearTimeout(timer);
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
      {showSplashScreen ? (
        <SplashScreen onAnimationComplete={() => {}} />
      ) : (
        <Component {...pageProps} />
      )}
    </SessionProvider>
  );
}

