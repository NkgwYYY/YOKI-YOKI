import articleData from './articles.json';

export type ArticleSubsection = {
  heading: string;
  paragraphs: string[];
};

export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  subsections?: ArticleSubsection[];
};

export type Article = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  category: string;
  readingTime: string;
  sections: ArticleSection[];
};

export const ARTICLES = articleData as Article[];
export const ARTICLE_CATEGORIES = ['すべて', ...Array.from(new Set(ARTICLES.map((article) => article.category)))];
export const getArticleBySlug = (slug: string) => ARTICLES.find((article) => article.slug === slug);