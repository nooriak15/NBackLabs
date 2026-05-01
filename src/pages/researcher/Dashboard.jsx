import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { PlusCircle, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import SessionCard from '@/components/researcher/SessionCard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.Session.list('-created_date'),
    initialData: [],
  });

  const { data: subjects } = useQuery({
    queryKey: ['all-subjects'],
    queryFn: () => base44.entities.Subject.list(),
    initialData: [],
  });

  const subjectCountMap = {};
  subjects.forEach(s => {
    subjectCountMap[s.session_id] = (subjectCountMap[s.session_id] || 0) + 1;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sessions</h1>
          <p className="text-muted-foreground mt-1">Manage your N-back experiments</p>
        </div>
        <Link to="/researcher/create-session">
          <Button className="gap-2">
            <PlusCircle className="w-4 h-4" />
            New Session
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <Brain className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No sessions yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">Create your first N-back session to get started</p>
          <Link to="/researcher/create-session">
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Create Session
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard
              key={session.id}
              session={session}
              subjectCount={subjectCountMap[session.id] || 0}
              onDelete={() => queryClient.invalidateQueries({ queryKey: ['sessions'] })}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['sessions'] })}
            />
          ))}
        </div>
      )}
    </div>
  );
}