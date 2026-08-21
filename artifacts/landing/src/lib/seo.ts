import type { Article } from '@/data/articles';

export const siteUrl = 'https://yoki-yoki.replit.app/landing';
export const ogImageUrl = `${siteUrl}/og-image.png?v=2`;

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function upsertLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement('link');
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}

export function updateArticleSeo(article?: Article) {
  if (!article) return;
  const url = `${siteUrl}/articles/${article.slug}/`;
  document.title = `${article.title}｜YOKI YOKI`;
  upsertMeta('name', 'description', article.description);
  upsertMeta('property', 'og:title', `${article.title}｜YOKI YOKI`);
  upsertMeta('property', 'og:description', article.description);
  upsertMeta('property', 'og:url', url);
  upsertMeta('property', 'og:type', 'article');
  upsertMeta('name', 'twitter:title', `${article.title}｜YOKI YOKI`);
  upsertMeta('name', 'twitter:description', article.description);
  upsertLink('canonical', url);

  const existing = document.getElementById('article-jsonld');
  existing?.remove();
  const script = document.createElement('script');
  script.id = 'article-jsonld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.publishedAt,
    author: { '@type': 'Organization', name: 'YOKI YOKI' },
    publisher: { '@type': 'Organization', name: 'YOKI YOKI' },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: ogImageUrl,
    inLanguage: 'ja-JP',
  });
  document.head.appendChild(script);
}