import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Try transparent status bar */}
        <meta name="theme-color" content="transparent" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Planeify" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        <meta name="color-scheme" content="light dark" />
        <link rel="apple-touch-icon" href="/pwa.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Extend gradient to cover status bar area */}
        <style>{`
          :root {
            --safe-area-inset-top: env(safe-area-inset-top, 0px);
          }
          
          body {
            background: linear-gradient(to right, #4F46E5, #2563EB);
            margin: 0;
            padding: 0;
            min-height: calc(100vh + var(--safe-area-inset-top));
            padding-top: var(--safe-area-inset-top);
          }
        `}</style>
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}