import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/researcher/Dashboard';
import CreateSession from './pages/researcher/CreateSession';
import SessionDetail from './pages/researcher/SessionDetail';
import SubjectDetail from './pages/researcher/SubjectDetail';
import StimulusSetManager from './pages/researcher/StimulusSetManager';
import ResultsOverview from './pages/researcher/ResultsOverview';
import GamePlay from './pages/GamePlay';
import AppLayout from './components/layout/AppLayout';

const LoadingSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
  </div>
);

// Wraps the researcher routes — bounces to /login if no session.
const RequireAuth = ({ children }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const AppRoutes = () => {
  const { isLoadingAuth } = useAuth();
  if (isLoadingAuth) return <LoadingSpinner />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/play/:sessionCode/:subjectId" element={<GamePlay />} />

      {/* Researcher routes — gated by RequireAuth */}
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/researcher/dashboard" element={<Dashboard />} />
        <Route path="/researcher/create-session" element={<CreateSession />} />
        <Route path="/researcher/session/:id" element={<SessionDetail />} />
        <Route path="/researcher/session/:id/subject/:subjectId" element={<SubjectDetail />} />
        <Route path="/researcher/stimulus-sets" element={<StimulusSetManager />} />
        <Route path="/researcher/session/:id/results-overview" element={<ResultsOverview />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AppRoutes />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
