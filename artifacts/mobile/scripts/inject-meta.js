#!/usr/bin/env node
// Injects OGP/link-preview meta tags into the exported web index.html.
// Needed because app/+html.tsx is ignored with Expo's default "single" web output.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '../../../static-build/web/index.html');
let html = fs.readFileSync(file, 'utf8');

const META = `
    <meta name="google-site-verification" content="pz2YpceAZWVu-OXqardhMy8WmaPi_OXsSOugCiVPm2A" />
    <meta name="google-site-verification" content="4R-ZlbEXRH_5og-OkUNngJYN28bYCvVGXw5IY1m5UEw" />
    <meta property="og:title" content="YOKI YOKI｜毎日の気分記録・メンタルケアアプリ" />
    <meta property="og:site_name" content="YOKI YOKI" />
    <meta property="og:type" content="website" />
    <meta property="og:description" content="気分・感情を毎日記録して、AIとの会話でこころを育てるメンタルケアアプリ。日記・気分トラッカー・ストレス管理を楽しく続けられます。" />
    <meta property="og:url" content="https://yoki-yoki.replit.app/" />
    <meta name="description" content="気分・感情を毎日記録して、AIとの会話でこころを育てるメンタルケアアプリ。日記・気分トラッカー・ストレス管理を楽しく続けられます。" />
    <meta name="keywords" content="メンタルケア,気分記録,日記アプリ,感情トラッカー,ストレス管理,AIチャット,こころの健康,YOKI YOKI" />`;

if (html.includes('og:title')) {
  console.log('OGP meta already present, skipping');
  process.exit(0);
}
html = html.replace(/<title>[^<]*<\/title>/, '<title>YOKI YOKI｜毎日の気分記録・メンタルケアアプリ</title>');
html = html.replace('<title>', `${META}\n    <title>`);
html = html.replace('<html lang="en">', '<html lang="ja">');
fs.writeFileSync(file, html);
console.log('Injected OGP meta into', file);
