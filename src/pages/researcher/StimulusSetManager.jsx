import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Type, Image, Pencil, Trash2, Layers } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import StimulusSetEditor from '@/components/stimulus/StimulusSetEditor';

export default function StimulusSetManager() {
  const queryClient = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingSet, setEditingSet] = useState(null);

  const { data: sets, isLoading } = useQuery({
    queryKey: ['stimulus-sets'],
    queryFn: () => base44.entities.StimulusSet.list('-created_date'),
    initialData: [],
  });

  const handleCreate = () => {
    setEditingSet(null);
    setEditorOpen(true);
  };

  const handleEdit = (set) => {
    setEditingSet(set);
    setEditorOpen(true);
  };

  const handleDelete = async (set) => {
    if (!confirm(`Delete "${set.name}"? This cannot be undone.`)) return;
    await base44.entities.StimulusSet.delete(set.id);
    toast.success('Stimulus set deleted');
    queryClient.invalidateQueries({ queryKey: ['stimulus-sets'] });
  };

  const handleSaved = () => {
    setEditorOpen(false);
    setEditingSet(null);
    queryClient.invalidateQueries({ queryKey: ['stimulus-sets'] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stimulus Sets</h1>
          <p className="text-muted-foreground mt-1">Create and manage reusable stimulus sets for your sessions</p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <PlusCircle className="w-4 h-4" />
          New Stimulus Set
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4">
            <Layers className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No stimulus sets yet</h3>
          <p className="text-muted-foreground mt-1 mb-6 max-w-sm mx-auto">
            Saved stimulus sets can be reused across future sessions — create one to get started
          </p>
          <Button onClick={handleCreate} className="gap-2">
            <PlusCircle className="w-4 h-4" />
            Create Stimulus Set
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map(set => (
            <Card key={set.id} className="hover:border-primary/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${set.stimulus_type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {set.stimulus_type === 'image' ? <Image className="w-5 h-5" /> : <Type className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{set.name}</p>
                      <Badge variant="secondary" className="shrink-0">{set.stimulus_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {set.stimulus_count || 0} items
                      {set.updated_date
                        ? ` · Updated ${format(new Date(set.updated_date), 'MMM d, yyyy')}`
                        : set.created_date
                        ? ` · Created ${format(new Date(set.created_date), 'MMM d, yyyy')}`
                        : ''}
                    </p>
                  </div>

                  {/* Image preview strip */}
                  {set.stimulus_type === 'image' && set.stimuli?.length > 0 && (
                    <div className="hidden sm:flex gap-1 shrink-0">
                      {set.stimuli.slice(0, 4).map((s, i) => (
                        <div key={i} className="w-8 h-8 rounded overflow-hidden border bg-muted">
                          <img src={s.value} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {set.stimuli.length > 4 && (
                        <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{set.stimuli.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Text preview strip */}
                  {set.stimulus_type === 'text' && set.stimuli?.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1 shrink-0">
                      {set.stimuli.slice(0, 6).map((s, i) => (
                        <span key={i} className="w-7 h-7 rounded bg-muted flex items-center justify-center text-sm font-mono font-medium">
                          {s.value}
                        </span>
                      ))}
                      {set.stimuli.length > 6 && (
                        <span className="text-xs text-muted-foreground">+{set.stimuli.length - 6}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(set)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(set)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StimulusSetEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        existingSet={editingSet}
        onSaved={handleSaved}
      />
    </div>
  );
}