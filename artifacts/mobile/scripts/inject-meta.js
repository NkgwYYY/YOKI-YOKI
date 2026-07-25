#!/usr/bin/env node
// Injects OGP/link-preview meta tags into the exported web index.html.
// Needed because app/+html.tsx is ignored with Expo's default "single" web output.
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || path.join(__dirname, '../../../static-build/web/index.html');
let html = fs.readFileSync(file, 'utf8');

const META = `
    <meta property="og:title" content="YOKI YOKI" />
    <meta property="og:site_name" content="YOKI YOKI" />
    <meta property="og:type" content="website" />
    <meta property="og:description" content="こころを育てるメンタルケアアプリ" />
    <meta property="og:url" content="https://mental-muscle-trainer.replit.app/" />
    <meta name="description" content="こころを育てるメンタルケアアプリ" />`;

if (html.includes('og:title')) {
  console.log('OGP meta already present, skipping');
  process.exit(0);
}
html = html.replace('<title>', `${META}\n    <title>`);
html = html.replace('<html lang="en">', '<html lang="ja">');
fs.writeFileSync(file, html);
console.log('Injected OGP meta into', file);
