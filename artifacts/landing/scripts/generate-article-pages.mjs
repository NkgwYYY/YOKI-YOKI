import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist/public');
const articles = JSON.parse(await readFile(path.join(root, 'src/data/articles.json'), 'utf8'));
const siteUrl = 'https://yoki-yoki.replit.app/landing';
const ogImageUrl = `${siteUrl}/og-image.png?v=2`;

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function articleJsonLd(article) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: { '@type': 'Organization', name: 'YOKI YOKI' },
    publisher: { '@type': 'Organization', name: 'YOKI YOKI' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${siteUrl}/articles/${article.slug}/` },
    image: ogImageUrl,
    inLanguage: 'ja-JP',
  });
}

function articleMarkup(article) {
  const sections = article.sections.map((section) => `
    <section>
      <h2>${escapeHtml(section.heading)}</h2>
      ${section.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      ${(section.subsections ?? []).map((subsection) => `
        <section>
          <h3>${escapeHtml(subsection.heading)}</h3>
          ${subsection.paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}
        </section>`).join('')}
    </section>`).join('');

  return `<main>
    <header><a href="/landing/">YOKI YOKI</a><nav><a href="/landing/articles/">読みもの一覧</a></nav></header>
    <article>
      <p>${escapeHtml(article.category)} · <time datetime="${article.publishedAt}">${article.publishedAt}</time> · 読了目安 ${escapeHtml(article.readingTime)}</p>
      <h1>${escapeHtml(article.title)}</h1>
      <p>${escapeHtml(article.description)}</p>
      ${sections}
      <aside><h2>毎日の小さな変化を、記録してみませんか？</h2><p>YOKI YOKIは、毎日の小さな頑張りや気持ちを記録し、自分の変化を見える化するメンタルケアアプリです。</p><a href="https://yoki-yoki.replit.app/">YOKI YOKIを使ってみる</a></aside>
    </article>
  </main>`;
}

function indexMarkup() {
  return `<main>
    <header><a href="/landing/">YOKI YOKI</a></header>
    <section><p>YOKI YOKI JOURNAL</p><h1>心を整える、小さな読みもの。</h1><p>自分を責めるためではなく、少しだけ自分に気づくために。毎日の心に寄り添うヒントをお届けします。</p></section>
    <section><h2>記事一覧</h2>${articles.map((article) => `<article><p>${escapeHtml(article.category)} · <time datetime="${article.publishedAt}">${article.publishedAt}</time></p><h2><a href="/landing/articles/${article.slug}/">${escapeHtml(article.title)}</a></h2><p>${escapeHtml(article.description)}</p></article>`).join('')}</section>
  </main>`;
}

function replaceTag(html, pattern, replacement) {
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace('</head>', `${replacement}\n</head>`);
}

function pageShell(template, { title, description, url, type = 'website', jsonLd, body }) {
  let html = template;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  html = replaceTag(html, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeHtml(description)}" />`);
  html = replaceTag(html, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${url}" />`);
  html = replaceTag(html, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapeHtml(title)}" />`);
  html = replaceTag(html, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapeHtml(description)}" />`);
  html = replaceTag(html, /<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${type}" />`);
  html = replaceTag(html, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${url}" />`);
  html = replaceTag(html, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapeHtml(title)}" />`);
  html = replaceTag(html, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapeHtml(description)}" />`);
  html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return html.replace('</head>', `  <script id="article-jsonld" type="application/ld+json">${jsonLd}</script>\n  </head>`);
}

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const journalDescription = '心の調子に気づき、自分を大切にするための読みもの。メンタルケアやセルフケアを、YOKI YOKIがやさしく紹介します。';
const journalUrl = `${siteUrl}/articles/`;
await mkdir(path.join(dist, 'articles'), { recursive: true });
await writeFile(path.join(dist, 'articles/index.html'), pageShell(template, {
  title: '読みもの｜心を整えるヒント｜YOKI YOKI',
  description: journalDescription,
  url: journalUrl,
  jsonLd: JSON.stringify({ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'YOKI YOKI 読みもの', description: journalDescription, url: journalUrl, inLanguage: 'ja-JP' }),
  body: indexMarkup(),
}));

for (const article of articles) {
  const outputDir = path.join(dist, 'articles', article.slug);
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'index.html'), pageShell(template, {
    title: `${article.title}｜YOKI YOKI`,
    description: article.description,
    url: `${siteUrl}/articles/${article.slug}/`,
    type: 'article',
    jsonLd: articleJsonLd(article),
    body: articleMarkup(article),
  }));
}

console.log(`Generated static HTML for ${articles.length} articles and the article index.`);