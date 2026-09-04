import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { getArticleBySlug } from '@/data/articles';
import ArticleDetail from '@/pages/ArticleDetail';
import Articles from '@/pages/Articles';
import Home from '@/pages/Home';
import NotFound from '@/pages/not-found';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Support from '@/pages/Support';

const queryClient = new QueryClient();

function getRoute() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = window.location.pathname.replace(new RegExp(`^${basePath}`), '') || '/';
  const normalized = path.endsWith('/') ? path : `${path}/`;
  if (normalized === '/articles/') return { type: 'index' as const };
  const match = normalized.match(/^\/articles\/([^/]+)\/$/);
  if (match) return { type: 'detail' as const, article: getArticleBySlug(match[1]) };
  if (normalized === '/support/') return { type: 'support' as const };
  if (normalized === '/privacy/') return { type: 'privacy' as const };
  if (normalized === '/') return { type: 'home' as const };
  return { type: 'not-found' as const };
}

function App() {
  const route = getRoute();
  const content = route.type === 'home'
    ? <Home />
    : route.type === 'index'
      ? <Articles />
      : route.type === 'detail' && route.article
        ? <ArticleDetail article={route.article} />
        : route.type === 'support'
          ? <Support />
          : route.type === 'privacy'
            ? <PrivacyPolicy />
            : <NotFound />;
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary resetKey="landing">
          {content}
        </ErrorBoundary>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;