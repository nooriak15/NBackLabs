import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Brain, ArrowRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function JoinForm() {
  const [sessionCode, setSessionCode] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!sessionCode.trim() || !subjectId.trim()) {
      toast.error('Please enter both session code and subject ID');
      return;
    }

    setLoading(true);
    const sessions = await base44.entities.Session.filter({ session_code: sessionCode.trim().toUpperCase() });

    if (sessions.length === 0) {
      toast.error('Session not found. Please check your code.');
      setLoading(false);
      return;
    }

    const session = sessions[0];
    if (session.status !== 'active') {
      toast.error('This session is not currently active.');
      setLoading(false);
      return;
    }

    const subjects = await base44.entities.Subject.filter({
      session_id: session.id,
      subject_id: subjectId.trim(),
    });

    if (subjects.length === 0) {
      toast.error('Subject ID not found in this session. Please contact your researcher.');
      setLoading(false);
      return;
    }

    navigate(`/play/${sessionCode.trim().toUpperCase()}/${subjectId.trim()}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto flex items-center justify-center mb-4">
            <Brain className="w-9 h-9 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">N-Back Lab</h1>
          <p className="text-muted-foreground mt-2">Cognitive assessment platform</p>
        </div>

        <Card className="shadow-lg border-0 bg-card">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Join a Session</CardTitle>
            <CardDescription>Enter the code and ID provided by your researcher</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="session-code">Session Code</Label>
                <Input
                  id="session-code"
                  placeholder="e.g. ABC123"
                  value={sessionCode}
                  onChange={e => setSessionCode(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-widest uppercase"
                  maxLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject-id">Subject ID</Label>
                <Input
                  id="subject-id"
                  placeholder="e.g. S001"
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  className="text-center text-lg font-mono"
                />
              </div>
              <Button type="submit" className="w-full gap-2" size="lg" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Join Session
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Are you a researcher?{' '}
          <a href="/researcher/dashboard" className="text-primary font-medium hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}