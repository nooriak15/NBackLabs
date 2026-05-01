import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, Download, ChevronDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

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

export default function ResultsTable({ results, sessionTitle }) {
  const title = sessionTitle || 'session';

  const exportCSV = () => {
    if (!results || results.length === 0) { toast.error('No results to export'); return; }
    const { headers, dataRows } = buildRows(results);
    const csv = [headers.join(','), ...dataRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    download(csv, `${title.replace(/\s+/g, '_')}_results.csv`, 'text/csv');
    toast.success('CSV exported');
  };

  const exportTSV = () => {
    if (!results || results.length === 0) { toast.error('No results to export'); return; }
    const { headers, dataRows } = buildRows(results);
    const tsv = [headers.join('\t'), ...dataRows.map(r => r.join('\t'))].join('\n');
    download(tsv, `${title.replace(/\s+/g, '_')}_results.tsv`, 'text/tab-separated-values');
    toast.success('TSV exported');
  };

  const exportJSON = () => {
    if (!results || results.length === 0) { toast.error('No results to export'); return; }
    download(JSON.stringify(results, null, 2), `${title.replace(/\s+/g, '_')}_results.json`, 'application/json');
    toast.success('JSON exported');
  };

  const download = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const isEmpty = !results || results.length === 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Results {!isEmpty && `(${results.length} games completed)`}
        </CardTitle>
        {!isEmpty && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportCSV}>Export as CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportTSV}>Export as TSV</DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-sm text-muted-foreground text-center py-8">No results yet. Waiting for participants to complete games.</p>
        ) : (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Subject</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-center">TP</TableHead>
                  <TableHead className="text-center">FP</TableHead>
                  <TableHead className="text-center">TN</TableHead>
                  <TableHead className="text-center">FN</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Avg RT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono font-medium">{r.subject_id}</TableCell>
                    <TableCell>#{r.game_index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">{r.n_back_level}-back</Badge>
                    </TableCell>
                    <TableCell className="text-center text-green-600 font-medium">{r.true_positives}</TableCell>
                    <TableCell className="text-center text-red-500 font-medium">{r.false_positives}</TableCell>
                    <TableCell className="text-center font-medium">{r.true_negatives}</TableCell>
                    <TableCell className="text-center text-orange-500 font-medium">{r.false_negatives}</TableCell>
                    <TableCell className="text-center font-bold">{r.total_score}</TableCell>
                    <TableCell className="text-center font-mono text-sm">{r.avg_response_time}ms</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}