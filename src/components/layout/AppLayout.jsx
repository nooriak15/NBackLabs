import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Brain, LayoutDashboard, PlusCircle, LogOut, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navItems = [
    { path: '/researcher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/researcher/stimulus-sets', label: 'Stimulus Sets', icon: Layers },
    { path: '/researcher/create-session', label: 'New Session', icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/researcher/dashboard" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg tracking-tight">N-Back Lab</span>
            </Link>
            <nav className="flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
              {user?.email && (
                <span className="hidden md:inline text-xs text-muted-foreground ml-2 mr-1">
                  {user.email}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="ml-2 text-muted-foreground"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}