import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Loader2, ChevronDown, Type, Image, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import StimulusSetPicker from '@/components/stimulus/StimulusSetPicker';

export default function EditSessionDialog({ open, onOpenChange, session, hasSubjects, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedStimulusSet, setSelectedStimulusSet] = useState(null);

  useEffect(() => {
    if (session) { setForm({ ...session }); setSelectedStimulusSet(null); }
  }, [session]);

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.title?.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    await base44.entities.Session.update(session.id, {
      title: form.title,
      total_games: form.total_games,
      distribution_mode: form.distribution_mode,
      distribution_1back: form.distribution_1back,
      distribution_2back: form.distribution_2back,
      distribution_3back: form.distribution_3back,
      time_between_stimuli: form.time_between_stimuli,
      stimulus_display_time: form.stimulus_display_time,
      trials_per_game: form.trials_per_game,
      target_rate: form.target_rate,
      ...(selectedStimulusSet ? { stimulus_set: selectedStimulusSet.stimuli, number_of_stimuli: selectedStimulusSet.stimulus_count } : {}),
      include_tutorial: form.include_tutorial,
      tutorial_n_back_levels: form.tutorial_n_back_levels ?? [form.tutorial_n_back_level ?? 1],
      include_tutorial_in_analytics: form.include_tutorial_in_analytics,
      status: form.status,
    });
    setSaving(false);
    toast.success('Session updated');
    onSaved();
    onOpenChange(false);
  };

  if (!session) return null;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>

        {hasSubjects && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <p>
              This session has active participants. Changing game settings may make existing results inconsistent.
              Consider deleting participants first or starting a new session for a clean run.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {/* Basic info */}
          <div className="space-y-2">
            <Label>Session Title</Label>
            <Input value={form.title || ''} onChange={e => update('title', e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => update('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Total Games</Label>
            <Input type="number" min={1} max={100} value={form.total_games || ''} onChange={e => update('total_games', parseInt(e.target.value) || 1)} />
          </div>

          <Separator />

          {/* Distribution */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">N-Back Distribution</Label>
            <Select value={form.distribution_mode} onValueChange={v => update('distribution_mode', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="count">By Count</SelectItem>
                <SelectItem value="percentage">By Percentage</SelectItem>
              </SelectContent>
            </Select>
            {['1', '2', '3'].map(n => {
              const key = `distribution_${n}back`;
              const val = form[key] ?? 0;
              const max = form.distribution_mode === 'percentage' ? 100 : (form.total_games || 10);
              return (
                <div key={n} className="space-y-1.5">
                  <div className="flex justify-between">
                    <Label className="font-normal flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">{n}-back</Badge>
                    </Label>
                    <span className="text-sm font-mono">{val}{form.distribution_mode === 'percentage' ? '%' : ''}</span>
                  </div>
                  <Slider value={[val]} min={0} max={max} step={form.distribution_mode === 'percentage' ? 5 : 1}
                    onValueChange={([v]) => update(key, v)} />
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Stimulus Set */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Stimulus Set</Label>
            {selectedStimulusSet ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selectedStimulusSet.stimulus_type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedStimulusSet.stimulus_type === 'image' ? <Image className="w-3.5 h-3.5" /> : <Type className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedStimulusSet.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStimulusSet.stimulus_count || 0} items</p>
                </div>
                <Check className="w-4 h-4 text-primary shrink-0" />
                <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="text-xs shrink-0">Change</Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full justify-between gap-2 text-muted-foreground" onClick={() => setPickerOpen(true)}>
                <span>Change stimulus set…</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Separator />

          {/* Game template */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Game Template</Label>
            {[
              { key: 'stimulus_display_time', label: 'Stimulus Display Time', unit: 'ms', min: 200, max: 3000, step: 100 },
              { key: 'time_between_stimuli', label: 'Inter-Stimulus Interval', unit: 'ms', min: 500, max: 5000, step: 100 },
              { key: 'trials_per_game', label: 'Trials per Game', unit: '', min: 5, max: 100, step: 1 },
              { key: 'target_rate', label: 'Target Rate', unit: '%', min: 0, max: 100, step: 5 },
            ].map(({ key, label, unit, min, max, step }) => (
              <div key={key} className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="font-normal text-sm">{label}</Label>
                  <span className="text-sm font-mono">{form[key] ?? 0}{unit}</span>
                </div>
                <Slider value={[form[key] ?? 0]} min={min} max={max} step={step}
                  onValueChange={([v]) => update(key, v)} />
              </div>
            ))}
          </div>

          <Separator />

          {/* Tutorial */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Include Tutorial</Label>
              <Switch checked={!!form.include_tutorial} onCheckedChange={v => { update('include_tutorial', v); if (!v) update('include_tutorial_in_analytics', false); }} />
            </div>
            {form.include_tutorial && (
              <div className="pl-4 border-l-2 border-muted space-y-3">
                <div className="space-y-2">
                  <Label className="font-normal text-sm">Tutorial N-Back Levels</Label>
                  <div className="flex gap-4">
                    {[1, 2, 3].map(n => {
                      const levels = form.tutorial_n_back_levels ?? [form.tutorial_n_back_level ?? 1];
                      return (
                        <label key={n} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={levels.includes(n)}
                            onCheckedChange={checked => {
                              update('tutorial_n_back_levels', checked ? [...levels, n].sort() : levels.filter(l => l !== n));
                            }}
                          />
                          <span className="text-sm">{n}-Back</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">One practice game per selected level</p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="font-normal text-sm">Include Tutorial in Results</Label>
                  <Switch checked={!!form.include_tutorial_in_analytics} onCheckedChange={v => update('include_tutorial_in_analytics', v)} />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <StimulusSetPicker
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      selectedId={selectedStimulusSet?.id}
      onSelect={set => { setSelectedStimulusSet(set); setPickerOpen(false); }}
      onCreateNew={() => setPickerOpen(false)}
    />
    </>
  );
}