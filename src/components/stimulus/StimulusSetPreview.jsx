import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Type, Image, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function StimulusSetPreview({ set, open, onOpenChange, onSelect }) {
  if (!set) return null;

  const isImage = set.stimulus_type === 'image';
  const stimuli = set.stimuli || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isImage ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
              {isImage ? <Image className="w-4 h-4" /> : <Type className="w-4 h-4" />}
            </span>
            {set.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">{set.stimulus_type}</Badge>
            <span>{stimuli.length} items</span>
            {set.created_date && <span>Created {format(new Date(set.created_date), 'MMM d, yyyy')}</span>}
          </div>

          {isImage ? (
            stimuli.length > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                {stimuli.map((s, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border bg-muted">
                    <img src={s.value} alt={`Stimulus ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No images in this set</p>
            )
          ) : (
            <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg">
              {stimuli.map((s, i) => (
                <Badge key={i} variant="outline" className="font-mono text-base px-3 py-1">{s.value}</Badge>
              ))}
              {stimuli.length === 0 && <p className="text-sm text-muted-foreground">No stimuli</p>}
            </div>
          )}

          <Button className="w-full gap-2" onClick={() => { onSelect(set); onOpenChange(false); }}>
            <Check className="w-4 h-4" /> Use This Set
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}