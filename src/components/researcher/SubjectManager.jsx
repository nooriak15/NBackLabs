import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2, Trash2, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const statusColors = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  completed: 'bg-accent/20 text-accent-foreground',
};

export default function SubjectManager({ sessionId, sessionCode, sessionTitle, subjects, onUpdate }) {
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [emailSubject, setEmailSubject] = useState(null); // subject being emailed
  const [recipientEmail, setRecipientEmail] = useState('');


  const sendEmail = () => {
    if (!recipientEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    const subject = encodeURIComponent(`Your N-Back Session Info — ${sessionTitle}`);
    const body = encodeURIComponent(`Hello${emailSubject.name ? ` ${emailSubject.name}` : ''},\n\nYou have been registered for a cognitive assessment session.\n\nSession: ${sessionTitle}\nSession Code: ${sessionCode}\nYour Subject ID: ${emailSubject.subject_id}\n\nTo join, visit the app and enter the session code and your subject ID.\n\nGood luck!`);
    window.open(`mailto:${recipientEmail.trim()}?subject=${subject}&body=${body}`);
    setEmailSubject(null);
    setRecipientEmail('');
  };

  const addSubject = async () => {
    if (!newSubjectId.trim()) {
      toast.error('Subject ID is required');
      return;
    }
    const exists = subjects.some(s => s.subject_id === newSubjectId.trim());
    if (exists) {
      toast.error('Subject ID already exists in this session');
      return;
    }

    setAdding(true);
    await base44.entities.Subject.create({
      session_id: sessionId,
      subject_id: newSubjectId.trim(),
      name: newName.trim() || undefined,
      status: 'pending',
      games_completed: 0,
    });
    setNewSubjectId('');
    setNewName('');
    setAdding(false);
    toast.success('Subject added');
    onUpdate();
  };

  const removeSubject = async (subject) => {
    // Delete all game results for this subject in this session
    const results = await base44.entities.GameResult.filter({ session_id: sessionId, subject_id: subject.subject_id });
    await Promise.all(results.map(r => base44.entities.GameResult.delete(r.id)));
    await base44.entities.Subject.delete(subject.id);
    toast.success('Subject and their results removed');
    onUpdate();
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserPlus className="w-5 h-5 text-primary" />
          Subjects ({subjects.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Subject ID (e.g. S001)"
            value={newSubjectId}
            onChange={e => setNewSubjectId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            className="flex-1"
          />
          <Input
            placeholder="Name (optional)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addSubject()}
            className="flex-1"
          />
          <Button onClick={addSubject} disabled={adding} size="sm" className="gap-1.5 shrink-0">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add
          </Button>
        </div>

        {subjects.length > 0 && (
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Subject ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subjects.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.subject_id}</TableCell>
                    <TableCell className="text-muted-foreground">{s.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[s.status]}>{s.status}</Badge>
                    </TableCell>
                    <TableCell>{s.games_completed || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEmailSubject(s); setRecipientEmail(''); }}>
                          <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSubject(s)}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {subjects.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No subjects added yet</p>
        )}
      </CardContent>
    </Card>

    {/* Email Dialog */}
    <Dialog open={!!emailSubject} onOpenChange={open => { if (!open) { setEmailSubject(null); setRecipientEmail(''); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Send Session Info</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Subject ID:</span> <span className="font-mono font-medium">{emailSubject?.subject_id}</span></p>
            <p><span className="text-muted-foreground">Session Code:</span> <span className="font-mono font-medium">{sessionCode}</span></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Recipient Email</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="participant@example.com"
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendEmail()}
            />
          </div>
          <Button className="w-full gap-2" onClick={sendEmail}>
            <Mail className="w-4 h-4" />
            Open in Email App
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}