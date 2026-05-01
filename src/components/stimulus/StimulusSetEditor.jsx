import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2, Type, Image, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import TextStimulusEditor from './TextStimulusEditor';
import ImageStimulusEditor from './ImageStimulusEditor';

const MIN_REQUIRED = 6;

export default function StimulusSetEditor({ open, onOpenChange, existingSet, onSaved }) {
  const [name, setName] = useState('');
  const [stimulusType, setStimulusType] = useState('text');
  const [stimuli, setStimuli] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (existingSet) {
        setName(existingSet.name || '');
        setStimulusType(existingSet.stimulus_type || 'text');
        setStimuli(existingSet.stimuli || []);
      } else {
        setName('');
        setStimulusType('text');
        setStimuli([]);
      }
    }
  }, [open, existingSet]);

  const canSave = name.trim().length > 0 && stimuli.length >= MIN_REQUIRED;

  const saveReasons = [];
  if (!name.trim()) saveReasons.push('Name this stimulus set');
  if (stimuli.length < MIN_REQUIRED) saveReasons.push(`Add at least ${MIN_REQUIRED} stimuli (${stimuli.length}/${MIN_REQUIRED})`);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      stimulus_type: stimulusType,
      stimuli,
      stimulus_count: stimuli.length,
    };

    if (existingSet) {
      await base44.entities.StimulusSet.update(existingSet.id, payload);
      toast.success('Stimulus set updated');
    } else {
      await base44.entities.StimulusSet.create(payload);
      toast.success('Stimulus set saved');
    }

    setSaving(false);
    onSaved?.();
  };

  const handleTypeChange = (type) => {
    if (type === stimulusType) return;
    setStimulusType(type);
    setStimuli([]); // clear stimuli when switching type
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingSet ? 'Edit Stimulus Set' : 'Create Stimulus Set'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="set-name">
              Name this stimulus set <span className="text-destructive">*</span>
            </Label>
            <Input
              id="set-name"
              placeholder="e.g. Letters A–K, Animal Photos, Shapes"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Saved stimulus sets can be reused in future sessions</p>
          </div>

          {/* Type tabs */}
          <div className="space-y-2">
            <Label>Stimulus Type</Label>
            <Tabs value={stimulusType} onValueChange={handleTypeChange}>
              <TabsList className="w-full">
                <TabsTrigger value="text" className="flex-1 gap-2">
                  <Type className="w-4 h-4" /> Text
                </TabsTrigger>
                <TabsTrigger value="image" className="flex-1 gap-2">
                  <Image className="w-4 h-4" /> Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4">
                <TextStimulusEditor stimuli={stimuli} onChange={setStimuli} />
              </TabsContent>

              <TabsContent value="image" className="mt-4">
                <ImageStimulusEditor stimuli={stimuli} onChange={setStimuli} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Validation hints */}
          {!canSave && saveReasons.length > 0 && (
            <div className="rounded-lg bg-muted/60 p-3 space-y-1">
              {saveReasons.map((r, i) => (
                <p key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                  {r}
                </p>
              ))}
            </div>
          )}

          {/* Save */}
          <Button
            className="w-full gap-2"
            onClick={handleSave}
            disabled={!canSave || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {existingSet ? 'Update Stimulus Set' : 'Save Stimulus Set'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}