import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, ChevronDown, ChevronUp, ExternalLink, Download, Table2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

function accuracy(r) {
  const total = (r.true_positives ?? 0) + (r.false_positives ?? 0) + (r.true_negatives ?? 0) + (r.false_negatives ?? 0);
  if (!total) return '—';
  return Math.round(((r.true_positives + r.true_negatives) / total) * 100) + '%';
}

function SubjectRow({ subject, games, sessionId }) {
  const [open, setOpen] = useState(false);
  const avgAcc = games.length === 0 ? '—' : (() => {
    const vals = games.map(r => {
      const total = (r.true_positives ?? 0) + (r.false_positives ?? 0) + (r.true_negatives ?? 0) + (r.false_negatives ?? 0);
      return total ? ((r.true_positives + r.true_negatives) / total) * 100 : null;
    }).filter(v => v !== null);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) + '%' : '—';
  })();

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Subject header row */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
            {(subject?.subject_id || '?')[0].toUpperCase()}
          </div>
          <div>
            <span className="font-mono font-semibold text-sm">{subject?.subject_id || games[0]?.subject_id}</span>
            {subject?.name && <span className="text-muted-foreground text-sm ml-2">— {subject.name}</span>}
          </div>
          <Badge variant="secondary" className="text-xs">{games.length} game{games.length !== 1 ? 's' : ''}</Badge>
          {avgAcc !== '—' && <span className="text-sm text-muted-foreground">avg {avgAcc}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/researcher/session/${sessionId}/subject/${subject?.subject_id || games[0]?.subject_id}`}
            onClick={e => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Open subject detail">
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </Link>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded game table */}
      {open && (
        <div className="overflow-x-auto">
          {games.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No games completed yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="text-xs">Game</TableHead>
                  <TableHead className="text-xs">Level</TableHead>
                  <TableHead className="text-xs text-center">Accuracy</TableHead>
                  <TableHead className="text-xs text-center text-green-600">Hits</TableHead>
                  <TableHead className="text-xs text-center text-red-500">False Alarms</TableHead>
                  <TableHead className="text-xs text-center">Correct Rej.</TableHead>
                  <TableHead className="text-xs text-center text-orange-500">Misses</TableHead>
                  <TableHead className="text-xs text-center">Score</TableHead>
                  <TableHead className="text-xs text-center">Avg RT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.sort((a, b) => a.game_index - b.game_index).map(r => (
                  <TableRow key={r.id} className="text-sm">
                    <TableCell className="font-mono text-xs">#{r.game_index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">{r.n_back_level}-back</Badge>
                    </TableCell>
                    <TableCell className="text-center font-semibold">{accuracy(r)}</TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{r.true_positives}</TableCell>
                    <TableCell className="text-center text-red-500 font-medium">{r.false_positives}</TableCell>
                    <TableCell className="text-center font-medium">{r.true_negatives}</TableCell>
                    <TableCell className="text-center text-orange-500 font-medium">{r.false_negatives}</TableCell>
                    <TableCell className="text-center font-bold">{r.total_score}</TableCell>
                    <TableCell className="text-center font-mono text-xs">{r.avg_response_time ? `${r.avg_response_time}ms` : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}

function buildRows(results) {
  const headers = [
    'subject_id', 'game_index', 'n_back_level',
    'true_positives', 'false_positives', 'true_negatives', 'false_negatives',
    'total_score', 'avg_response_time', 'trial_count', 'stimulus_timing',
    'started_at', 'completed_at',
    'trial_index', 'stimulus', 'is_target', 'responded', 'response_time', 'correct', 'trial_timestamp'
  ];
  const dataRows = [];
  results.forEach(r => {
    const base = [
      r.subject_id, r.game_index, r.n_back_level,
      r.true_positives, r.false_positives, r.true_negatives, r.false_negatives,
      r.total_score, r.avg_response_time, r.trial_count, r.stimulus_timing,
      r.started_at || '', r.completed_at || ''
    ];
    if (r.trial_data && r.trial_data.length > 0) {
      r.trial_data.forEach(t => {
        dataRows.push([...base, t.trial_index, t.stimulus, t.is_target, t.responded, t.response_time ?? '', t.correct, t.timestamp || '']);
      });
    } else {
      dataRows.push([...base, '', '', '', '', '', '', '']);
    }
  });
  return { headers, dataRows };
}

export default function SubjectResults({ results, subjects, sessionId, sessionTitle }) {
  const isEmpty = !results || results.length === 0;
  const title = sessionTitle || 'session';

  // Group results by subject_id
  const bySubject = {};
  (results || []).forEach(r => {
    if (!bySubject[r.subject_id]) bySubject[r.subject_id] = [];
    bySubject[r.subject_id].push(r);
  });

  // Merge with subjects list so subjects with no results still show
  const subjectIds = new Set([
    ...(subjects || []).map(s => s.subject_id),
    ...Object.keys(bySubject),
  ]);

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (isEmpty) { toast.error('No results to export'); return; }
    const { headers, dataRows } = buildRows(results);
    const csv = [headers.join(','), ...dataRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    download(csv, `${title.replace(/\s+/g, '_')}_results.csv`, 'text/csv');
    toast.success('CSV exported');
  };

  const exportJSON = () => {
    if (isEmpty) { toast.error('No results to export'); return; }
    download(JSON.stringify(results, null, 2), `${title.replace(/\s+/g, '_')}_results.json`, 'application/json');
    toast.success('JSON exported');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Results {!isEmpty && `(${results.length} games)`}
        </CardTitle>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <Link to={`/researcher/session/${sessionId}/results-overview`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Table2 className="w-4 h-4" /> View Stats Table
              </Button>
            </Link>
          )}
          {!isEmpty && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {subjectIds.size === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No results yet. Waiting for participants to complete games.</p>
        ) : (
          [...subjectIds].map(sid => {
            const subject = (subjects || []).find(s => s.subject_id === sid);
            const games = bySubject[sid] || [];
            return (
              <SubjectRow
                key={sid}
                subject={subject}
                games={games}
                sessionId={sessionId}
              />
            );
          })
        )}
      </CardContent>
    </Card>
  );
}