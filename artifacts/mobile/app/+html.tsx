import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

const GA_ID = process.env.EXPO_PUBLIC_GA_MEASUREMENT_ID;
const ADSENSE_CLIENT_ID = 'ca-pub-7462386033661667';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Link preview (OGP) — LINE/SNS共有時のタイトル・説明 */}
        <meta property="og:title" content="YOKI YOKI" />
        <meta property="og:site_name" content="YOKI YOKI" />
        <meta property="og:type" content="website" />
        <meta property="og:description" content="こころを育てるメンタルケアアプリ" />
        <meta property="og:url" content="https://mental-muscle-trainer.replit.app/" />
        <meta name="description" content="こころを育てるメンタルケアアプリ" />

        <ScrollViewStyleReset />

        {/* Google AdSense automatic ads */}
        <script
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`}
          crossOrigin="anonymous"
        />

        {/* Google Analytics 4 */}
        {GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', { send_page_view: false });
                `,
              }}
            />
          </>
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
