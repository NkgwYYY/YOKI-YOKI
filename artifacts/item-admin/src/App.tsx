import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ClerkProvider, Show, SignIn } from '@clerk/react';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import Dashboard from '@/pages/dashboard';

const queryClient = new QueryClient();

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route>
          <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-slate-500 font-medium">
            404 - Not Found
          </div>
        </Route>
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-slate-50 text-destructive text-sm font-medium">
        Missing VITE_CLERK_PUBLISHABLE_KEY environment variable.
      </div>
    );
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Show when="signed-in">
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Router />
            </WouterRouter>
          </Show>
          <Show when="signed-out">
            <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50">
              <SignIn routing="hash" />
            </div>
          </Show>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default App;
