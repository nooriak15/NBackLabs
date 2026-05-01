import { useParams } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Gamepad2, Clock, Eye, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import SubjectManager from '@/components/researcher/SubjectManager';
import SubjectResults from '@/components/researcher/SubjectResults';
import EditSessionDialog from '@/components/researcher/EditSessionDialog';

export default function SessionDetail() {
  const { id } = useParams();
  const [showDetails, setShowDetails] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const results = await base44.entities.Session.filter({ id });
      return results[0];
    },
  });

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects', id],
    queryFn: () => base44.entities.Subject.filter({ session_id: id }),
    initialData: [],
  });

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['results', id],
    queryFn: () => base44.entities.GameResult.filter({ session_id: id }),
    initialData: [],
  });

  const refreshSubjects = () => queryClient.invalidateQueries({ queryKey: ['subjects', id] });

  if (loadingSession) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  }

  if (!session) {
    return <p className="text-center py-20 text-muted-foreground">Session not found</p>;
  }

  const copyCode = () => {
    navigator.clipboard.writeText(session.session_code);
    toast.success('Code copied!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{session.title}</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">{session.status}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Gamepad2 className="w-4 h-4" /> {session.total_games} games
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {session.time_between_stimuli}ms interval
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> {session.trials_per_game} trials/game
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4" /> Edit Session
        </Button>
      </div>

      {/* Session Code */}
      <Card className="bg-primary/5 border-primary/10">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Session Code</p>
            <p className="text-2xl font-mono font-bold tracking-widest">{session.session_code}</p>
          </div>
          <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5">
            <Copy className="w-4 h-4" /> Copy
          </Button>
        </CardContent>
      </Card>

      {/* Distribution Summary */}
      <Card>
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-3">N-Back Distribution</p>
          <div className="flex gap-3">
            {[
              { label: '1-back', value: session.distribution_1back },
              { label: '2-back', value: session.distribution_2back },
              { label: '3-back', value: session.distribution_3back },
            ].map(d => (
              <div key={d.label} className="flex-1 text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-xl font-bold">{d.value}{session.distribution_mode === 'percentage' ? '%' : ''}</div>
                <div className="text-xs text-muted-foreground">{d.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session Details collapsible */}
      <Card>
        <button
          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-xl"
          onClick={() => setShowDetails(v => !v)}
        >
          <span className="font-semibold text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" /> Session Parameters
          </span>
          {showDetails ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showDetails && (
          <CardContent className="pt-0 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Total Games', value: session.total_games },
              { label: 'Trials / Game', value: session.trials_per_game },
              { label: 'Target Rate', value: `${session.target_rate}%` },
              { label: 'Stimulus Display', value: `${session.stimulus_display_time}ms` },
              { label: 'ISI', value: `${session.time_between_stimuli}ms` },
              { label: 'Distribution Mode', value: session.distribution_mode },
              { label: '1-back', value: `${session.distribution_1back}${session.distribution_mode === 'percentage' ? '%' : ''}` },
              { label: '2-back', value: `${session.distribution_2back}${session.distribution_mode === 'percentage' ? '%' : ''}` },
              { label: '3-back', value: `${session.distribution_3back}${session.distribution_mode === 'percentage' ? '%' : ''}` },
              { label: 'No. of Stimuli', value: session.number_of_stimuli ?? 8 },
              ...(session.include_tutorial ? [{ label: 'Tutorial Level', value: `${session.tutorial_n_back_level ?? 1}-back` }] : []),
            ].map(({ label, value }) => (
              <div key={label} className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold font-mono mt-0.5">{value}</p>
              </div>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Subjects */}
      <SubjectManager
        sessionId={id}
        sessionCode={session.session_code}
        sessionTitle={session.title}
        subjects={subjects}
        onUpdate={refreshSubjects}
      />

      {/* Results */}
      <SubjectResults results={results} subjects={subjects} sessionId={id} sessionTitle={session.title} />

      <EditSessionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        session={session}
        hasSubjects={subjects.length > 0}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['session', id] })}
      />
    </div>
  );
}