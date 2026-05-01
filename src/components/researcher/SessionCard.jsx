import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Gamepad2, Copy, ArrowRight, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

const statusColors = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-primary/10 text-primary',
  completed: 'bg-accent/20 text-accent-foreground',
};

export default function SessionCard({ session, subjectCount, onDelete, onUpdate }) {
  const copyCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(session.session_code);
    toast.success('Session code copied!');
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete session "${session.title}"? This cannot be undone.`)) return;
    await base44.entities.Session.delete(session.id);
    toast.success('Session deleted');
    onDelete?.();
  };

  const handleMarkCompleted = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await base44.entities.Session.update(session.id, { status: 'completed' });
    toast.success('Session marked as completed');
    onUpdate?.();
  };

  return (
    <Link to={`/researcher/session/${session.id}`}>
      <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer group">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{session.title}</h3>
                <Badge className={statusColors[session.status] || statusColors.draft} variant="secondary">
                  {session.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1.5 font-mono bg-muted px-2 py-0.5 rounded hover:bg-muted/80 transition-colors"
                >
                  {session.session_code}
                  <Copy className="w-3 h-3" />
                </button>
                <span className="flex items-center gap-1">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  {session.total_games} games
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {subjectCount ?? '–'} subjects
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {session.status !== 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 opacity-0 group-hover:opacity-100 transition-opacity gap-1.5 text-muted-foreground hover:text-foreground text-xs"
                  onClick={handleMarkCompleted}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </Button>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}