import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
  {/* PWA configurations */}
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <meta name="apple-mobile-web-app-title" content="Planeify" />
  <meta name="mobile-web-app-capable" content="yes" />
  
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