import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Base theme color for browser */}
        <meta name="theme-color" content="#FFFFFF" />
        
        {/* PWA specific configurations */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Planeify" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Add color-scheme to ensure dark mode works correctly */}
        <meta name="color-scheme" content="light dark" />
        
        <link rel="apple-touch-icon" href="/pwa.png" />
        <link rel="manifest" href="/manifest.json" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}