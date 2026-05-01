import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, BarChart3, Clock, Target, Zap } from 'lucide-react';

function accuracy(r) {
  const total = (r.true_positives ?? 0) + (r.false_positives ?? 0) + (r.true_negatives ?? 0) + (r.false_negatives ?? 0);
  if (!total) return null;
  return Math.round(((r.true_positives + r.true_negatives) / total) * 100);
}

export default function SubjectDetail() {
  const { id, subjectId } = useParams();

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const r = await base44.entities.Session.filter({ id });
      return r[0];
    },
  });

  const { data: subject } = useQuery({
    queryKey: ['subject', id, subjectId],
    queryFn: async () => {
      const r = await base44.entities.Subject.filter({ session_id: id, subject_id: subjectId });
      return r[0];
    },
  });

  const { data: results, isLoading: loadingResults } = useQuery({
    queryKey: ['results', id, subjectId],
    queryFn: () => base44.entities.GameResult.filter({ session_id: id, subject_id: subjectId }),
    initialData: [],
  });

  if (loadingSession || loadingResults) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  }

  const sortedResults = [...results].sort((a, b) => a.game_index - b.game_index);

  // Overall stats
  const totalGames = sortedResults.length;
  const avgAccVal = totalGames === 0 ? null : (() => {
    const vals = sortedResults.map(r => accuracy(r)).filter(v => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const avgRT = totalGames === 0 ? null : (() => {
    const vals = sortedResults.map(r => r.avg_response_time).filter(v => v > 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
  })();
  const totalTP = sortedResults.reduce((s, r) => s + (r.true_positives ?? 0), 0);
  const totalFP = sortedResults.reduce((s, r) => s + (r.false_positives ?? 0), 0);
  const totalTN = sortedResults.reduce((s, r) => s + (r.true_negatives ?? 0), 0);
  const totalFN = sortedResults.reduce((s, r) => s + (r.false_negatives ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link to={`/researcher/session/${id}`}>
            <ArrowLeft className="w-4 h-4" /> Back to Session
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono">{subjectId}</h1>
          {subject?.name && <p className="text-muted-foreground mt-0.5">{subject.name}</p>}
          {session && <p className="text-sm text-muted-foreground mt-1">Session: {session.title}</p>}
        </div>
        {subject && (
          <Badge variant="secondary" className="capitalize">{subject.status}</Badge>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalGames}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Games Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{avgAccVal !== null ? `${avgAccVal}%` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Avg Accuracy</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{avgRT !== null ? `${avgRT}ms` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Avg Response Time</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{totalTP + totalTN}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Total Correct</div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> Overall Signal Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{totalTP}</div>
            <div className="text-xs text-muted-foreground">Hits (TP)</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-500">{totalFP}</div>
            <div className="text-xs text-muted-foreground">False Alarms (FP)</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{totalTN}</div>
            <div className="text-xs text-muted-foreground">Correct Rejections (TN)</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-500">{totalFN}</div>
            <div className="text-xs text-muted-foreground">Misses (FN)</div>
          </div>
        </CardContent>
      </Card>

      {/* Per-game table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Game-by-Game Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No games completed yet.</p>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Game</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead className="text-center">Accuracy</TableHead>
                    <TableHead className="text-center text-green-600">Hits</TableHead>
                    <TableHead className="text-center text-red-500">False Alarms</TableHead>
                    <TableHead className="text-center">Correct Rej.</TableHead>
                    <TableHead className="text-center text-orange-500">Misses</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Avg RT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map(r => {
                    const acc = accuracy(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">#{r.game_index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono">{r.n_back_level}-back</Badge>
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {acc !== null ? (
                            <span className={acc >= 70 ? 'text-green-600' : acc >= 50 ? 'text-orange-500' : 'text-red-500'}>
                              {acc}%
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-center text-green-600 font-medium">{r.true_positives}</TableCell>
                        <TableCell className="text-center text-red-500 font-medium">{r.false_positives}</TableCell>
                        <TableCell className="text-center font-medium">{r.true_negatives}</TableCell>
                        <TableCell className="text-center text-orange-500 font-medium">{r.false_negatives}</TableCell>
                        <TableCell className="text-center font-bold">{r.total_score}</TableCell>
                        <TableCell className="text-center font-mono text-sm">{r.avg_response_time ? `${r.avg_response_time}ms` : '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}