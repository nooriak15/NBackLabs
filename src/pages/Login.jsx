import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Brain, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already logged in? Skip the form.
  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/researcher/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error || 'Sign in failed');
      return;
    }
    toast.success('Signed in');
    navigate('/researcher/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Researcher Sign In</CardTitle>
          <p className="text-sm text-muted-foreground">
            Participants don&apos;t need an account — they join sessions from the home page.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="researcher@example.com"
                disabled={submitting}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
