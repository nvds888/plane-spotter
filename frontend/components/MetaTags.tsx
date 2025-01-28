import Head from 'next/head'

export default function MetaTags() {
  return (
    <Head>
      <meta name="viewport" 
        content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" 
      />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="theme-color" content="#ffffff" />
      <meta name="format-detection" content="telephone=no" />
      
      {/* PWA Icons */}
      <link rel="icon" type="image/png" sizes="196x196" href="/icons/favicon-196.png" />
      <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      
      {/* Splash Screens */}
      <link rel="apple-touch-startup-image" href="/splash/apple-splash-2048-2732.jpg" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" />
      <link rel="apple-touch-startup-image" href="/splash/apple-splash-1668-2388.jpg" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" />
      <link rel="apple-touch-startup-image" href="/splash/apple-splash-1536-2048.jpg" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" />
      <link rel="apple-touch-startup-image" href="/splash/apple-splash-1125-2436.jpg" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" />
      <link rel="apple-touch-startup-image" href="/splash/apple-splash-1242-2688.jpg" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" />
    </Head>
  )
}