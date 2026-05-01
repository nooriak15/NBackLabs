import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Type, Image, ChevronRight, Search, PlusCircle, Check, Eye } from 'lucide-react';
import { format } from 'date-fns';
import StimulusSetPreview from './StimulusSetPreview';

export default function StimulusSetPicker({ open, onOpenChange, selectedId, onSelect, onCreateNew }) {
  const [search, setSearch] = useState('');
  const [previewSet, setPreviewSet] = useState(null);

  const { data: sets, isLoading } = useQuery({
    queryKey: ['stimulus-sets'],
    queryFn: () => base44.entities.StimulusSet.list('-created_date'),
    initialData: [],
    enabled: open,
  });

  const filtered = sets.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (set) => {
    onSelect(set);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose a Stimulus Set</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search saved sets…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <ScrollArea className="h-72">
              {isLoading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {sets.length === 0 ? 'No saved stimulus sets yet' : 'No sets match your search'}
                </div>
              ) : (
                <div className="space-y-2 pr-2">
                  {filtered.map(set => (
                    <div
                      key={set.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5 ${selectedId === set.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleSelect(set)}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${set.stimulus_type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {set.stimulus_type === 'image' ? <Image className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{set.name}</p>
                          {selectedId === set.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {set.stimulus_type} · {set.stimulus_count || 0} items
                          {set.created_date ? ` · ${format(new Date(set.created_date), 'MMM d, yyyy')}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); setPreviewSet(set); }}
                        className="p-1.5 rounded hover:bg-muted transition-colors shrink-0"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => { onOpenChange(false); onCreateNew?.(); }}
              >
                <PlusCircle className="w-4 h-4" />
                Create New Stimulus Set
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <StimulusSetPreview
        set={previewSet}
        open={!!previewSet}
        onOpenChange={(o) => { if (!o) setPreviewSet(null); }}
        onSelect={handleSelect}
      />
    </>
  );
}