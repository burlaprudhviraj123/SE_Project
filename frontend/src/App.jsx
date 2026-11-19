import { useSelector } from 'react-redux';
import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useRouteError } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import { TooltipProvider } from './components/ui/tooltip';
import { Button } from './components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

const lazyWithRetry = (importer) =>
  lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      const hasReloaded = window.sessionStorage.getItem('chunk_reload');
      if (!hasReloaded) {
        window.sessionStorage.setItem('chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      window.sessionStorage.removeItem('chunk_reload');
      throw err;
    }
  });

const AdminGrievancesPage = lazyWithRetry(() => import('./pages/AdminGrievancesPage'));
const DashboardPage = lazyWithRetry(() => import('./pages/DashboardPage'));
const GrievanceDetailsPage = lazyWithRetry(() => import('./pages/GrievanceDetailsPage'));
const LoginPage = lazyWithRetry(() => import('./pages/LoginPage'));
const MyGrievancesPage = lazyWithRetry(() => import('./pages/MyGrievancesPage'));
const NewGrievancePage = lazyWithRetry(() => import('./pages/NewGrievancePage'));
const OfficerDashboardPage = lazyWithRetry(() => import('./pages/OfficerDashboardPage'));
const PrivacyPolicyPage = lazyWithRetry(() => import('./pages/PrivacyPolicyPage'));
const ProfilePage = lazyWithRetry(() => import('./pages/ProfilePage'));
const RecentGrievancesPage = lazyWithRetry(() => import('./pages/RecentGrievancesPage'));
const RegisterPage = lazyWithRetry(() => import('./pages/RegisterPage'));
const AcceptInvitePage = lazyWithRetry(() => import('./pages/AcceptInvitePage'));
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage'));

const RouteErrorBoundary = () => {
  const error = useRouteError();
  const isChunkError =
    error?.message?.includes('dynamically imported module') ||
    error?.message?.includes('Importing a module script failed');

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-surface border border-line rounded-3xl p-8 space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-accent-dim flex items-center justify-center text-accent mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-serif font-bold text-ink">
          {isChunkError ? 'New Update Available' : 'Something went wrong'}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isChunkError
            ? 'A new version of ResolveDesk was deployed. Please reload the page to load the latest updates.'
            : (error?.statusText || error?.message || 'An unexpected error occurred.')}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className="rounded-xl bg-accent text-white font-mono text-xs w-full"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Reload Page
        </Button>
      </div>
    </div>
  );
};

const RouteFallback = () => (
  <div className="min-h-[40vh] flex items-center justify-center px-4" role="status" aria-live="polite">
    <span className="text-sm text-muted-foreground">Loading page…</span>
  </div>
);

// Helper component for ScrollToTop in RouterProvider
const ScrollWrapper = () => (
  <>
    <ScrollToTop />
    <Outlet />
  </>
);

const PublicRoute = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

// Role-aware Dashboard Selector
const DashboardRoute = () => {
  const { user } = useSelector((state) => state.auth);
  if (user?.role === 'OFFICER') {
    return <OfficerDashboardPage />;
  }
  return <DashboardPage />;
};

const App = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const router = createBrowserRouter([
    {
      element: <ScrollWrapper />,
      errorElement: <RouteErrorBoundary />,
      children: [
        {
          element: <PublicRoute />,
          children: [
            { path: "/login", element: <LoginPage /> },
            { path: "/register", element: <RegisterPage /> },
            { path: "/accept-invite", element: <AcceptInvitePage /> }
          ]
        },
        {
          element: (
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          ),
          children: [
            { path: "/dashboard", element: <DashboardRoute /> },
            { path: "/officer", element: user?.role === 'OFFICER' ? <OfficerDashboardPage /> : <Navigate to="/dashboard" replace /> },
            { path: "/officer-dashboard", element: user?.role === 'OFFICER' ? <OfficerDashboardPage /> : <Navigate to="/dashboard" replace /> },
            { path: "/admin", element: user?.role === 'ADMIN' ? <DashboardPage /> : <Navigate to="/dashboard" replace /> },
            { path: "/admin/grievances", element: <ProtectedRoute allowedRoles={['ADMIN']}><AdminGrievancesPage /></ProtectedRoute> },
            { path: "/grievances", element: <MyGrievancesPage /> },
            { path: "/recent-grievances", element: <RecentGrievancesPage /> },
            { path: "/grievances/new", element: <NewGrievancePage /> },
            { path: "/grievances/:id", element: <GrievanceDetailsPage /> },
            { path: "/profile", element: <ProfilePage /> },
            { path: "/privacy-policy", element: <PrivacyPolicyPage /> }
          ]
        },
        {
          path: "/",
          element: <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        },
        {
          path: "/404",
          element: <NotFoundPage />
        },
        {
          path: "*",
          element: <NotFoundPage />
        }
      ]
    }
  ]);

  return (
    <TooltipProvider delayDuration={500} skipDelayDuration={400}>
      <Suspense fallback={<RouteFallback />}>
        <RouterProvider router={router} />
      </Suspense>
    </TooltipProvider>
  );
};

export default App;
