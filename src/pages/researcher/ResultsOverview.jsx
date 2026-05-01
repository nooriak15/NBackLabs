import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function accuracy(tp, fp, tn, fn) {
  const total = (tp ?? 0) + (fp ?? 0) + (tn ?? 0) + (fn ?? 0);
  if (!total) return '—';
  return Math.round(((tp + tn) / total) * 100) + '%';
}

function avg(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

export default function ResultsOverview() {
  const { id } = useParams();

  const { data: session } = useQuery({
    queryKey: ['session', id],
    queryFn: async () => {
      const res = await base44.entities.Session.filter({ id });
      return res[0];
    },
  });

  const { data: results, isLoading } = useQuery({
    queryKey: ['results', id],
    queryFn: () => base44.entities.GameResult.filter({ session_id: id }),
    initialData: [],
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', id],
    queryFn: () => base44.entities.Subject.filter({ session_id: id }),
    initialData: [],
  });

  // Group by game index
  const byGame = {};
  results.forEach(r => {
    const key = r.game_index;
    if (!byGame[key]) byGame[key] = [];
    byGame[key].push(r);
  });

  // Group by subject
  const byUser = {};
  results.forEach(r => {
    if (!byUser[r.subject_id]) byUser[r.subject_id] = [];
    byUser[r.subject_id].push(r);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/researcher/session/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Results Overview
          </h1>
          {session && <p className="text-muted-foreground text-sm mt-0.5">{session.title}</p>}
        </div>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No results yet. Waiting for participants to complete games.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="by-game">
          <TabsList className="mb-4">
            <TabsTrigger value="by-game">By Game #</TabsTrigger>
            <TabsTrigger value="by-user">By User</TabsTrigger>
          </TabsList>

          {/* BY GAME */}
          <TabsContent value="by-game">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stats per Game</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Game #</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead># Participants</TableHead>
                      <TableHead className="text-center">Avg Accuracy</TableHead>
                      <TableHead className="text-center text-green-600">Avg Hits</TableHead>
                      <TableHead className="text-center text-red-500">Avg False Alarms</TableHead>
                      <TableHead className="text-center text-orange-500">Avg Misses</TableHead>
                      <TableHead className="text-center">Avg Score</TableHead>
                      <TableHead className="text-center">Avg RT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(byGame).sort((a, b) => Number(a) - Number(b)).map(gameIdx => {
                      const games = byGame[gameIdx];
                      const level = games[0]?.n_back_level;
                      const accs = games.map(r => {
                        const total = (r.true_positives ?? 0) + (r.false_positives ?? 0) + (r.true_negatives ?? 0) + (r.false_negatives ?? 0);
                        return total ? ((r.true_positives + r.true_negatives) / total) * 100 : null;
                      });
                      const avgAcc = avg(accs);
                      return (
                        <TableRow key={gameIdx}>
                          <TableCell className="font-mono font-semibold">#{Number(gameIdx) + 1}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">{level}-back</Badge>
                          </TableCell>
                          <TableCell>{games.length}</TableCell>
                          <TableCell className="text-center font-semibold">{avgAcc != null ? `${Math.round(avgAcc)}%` : '—'}</TableCell>
                          <TableCell className="text-center text-green-600">{avg(games.map(r => r.true_positives)) ?? '—'}</TableCell>
                          <TableCell className="text-center text-red-500">{avg(games.map(r => r.false_positives)) ?? '—'}</TableCell>
                          <TableCell className="text-center text-orange-500">{avg(games.map(r => r.false_negatives)) ?? '—'}</TableCell>
                          <TableCell className="text-center font-bold">{avg(games.map(r => r.total_score)) ?? '—'}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {avg(games.map(r => r.avg_response_time)) != null ? `${avg(games.map(r => r.avg_response_time))}ms` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BY USER */}
          <TabsContent value="by-user">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Stats per User</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Subject ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead># Games</TableHead>
                      <TableHead className="text-center">Avg Accuracy</TableHead>
                      <TableHead className="text-center text-green-600">Avg Hits</TableHead>
                      <TableHead className="text-center text-red-500">Avg False Alarms</TableHead>
                      <TableHead className="text-center text-orange-500">Avg Misses</TableHead>
                      <TableHead className="text-center">Avg Score</TableHead>
                      <TableHead className="text-center">Avg RT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(byUser).map(sid => {
                      const games = byUser[sid];
                      const subject = subjects.find(s => s.subject_id === sid);
                      const accs = games.map(r => {
                        const total = (r.true_positives ?? 0) + (r.false_positives ?? 0) + (r.true_negatives ?? 0) + (r.false_negatives ?? 0);
                        return total ? ((r.true_positives + r.true_negatives) / total) * 100 : null;
                      });
                      const avgAcc = avg(accs);
                      return (
                        <TableRow key={sid}>
                          <TableCell className="font-mono font-semibold">{sid}</TableCell>
                          <TableCell className="text-muted-foreground">{subject?.name || '—'}</TableCell>
                          <TableCell>{games.length}</TableCell>
                          <TableCell className="text-center font-semibold">{avgAcc != null ? `${Math.round(avgAcc)}%` : '—'}</TableCell>
                          <TableCell className="text-center text-green-600">{avg(games.map(r => r.true_positives)) ?? '—'}</TableCell>
                          <TableCell className="text-center text-red-500">{avg(games.map(r => r.false_positives)) ?? '—'}</TableCell>
                          <TableCell className="text-center text-orange-500">{avg(games.map(r => r.false_negatives)) ?? '—'}</TableCell>
                          <TableCell className="text-center font-bold">{avg(games.map(r => r.total_score)) ?? '—'}</TableCell>
                          <TableCell className="text-center font-mono text-xs">
                            {avg(games.map(r => r.avg_response_time)) != null ? `${avg(games.map(r => r.avg_response_time))}ms` : '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}