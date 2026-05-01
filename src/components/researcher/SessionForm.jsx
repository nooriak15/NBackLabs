import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, ArrowLeft, Loader2, Beaker, Layers, ChevronDown, Type, Image, PlusCircle, Check, UserPlus, Trash2, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
// Note: Settings icon moved to GameTemplateSettings component
import GameTemplateSettings from '@/components/researcher/GameTemplateSettings';
import SessionDemo from '@/components/researcher/SessionDemo';
import { base44 } from '@/api/base44Client';
import { generateSessionCode, validateDistribution, DEFAULT_STIMULI } from '@/lib/gameLogic';
import { toast } from 'sonner';
import StimulusSetPicker from '@/components/stimulus/StimulusSetPicker';
import StimulusSetEditor from '@/components/stimulus/StimulusSetEditor';
import { useQueryClient } from '@tanstack/react-query';

const STEPS = ['Session Info', 'N-Back Distribution', 'Game Template', 'Add Participants'];

export default function SessionForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState(null);
  const [pendingSubjects, setPendingSubjects] = useState([]); // [{subject_id, name}]
  const [newSubjectId, setNewSubjectId] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingSubject, setAddingSubject] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [selectedStimulusSet, setSelectedStimulusSet] = useState(null);
  const [form, setForm] = useState({
    title: '',
    total_games: 10,
    distribution_mode: 'percentage',
    distribution_1back: 40,
    distribution_2back: 30,
    distribution_3back: 30,
    stimulus_set: DEFAULT_STIMULI,
    time_between_stimuli: 2500,
    stimulus_display_time: 500,
    trials_per_game: 30,
    target_rate: 30,
    include_tutorial: false,
    tutorial_n_back_levels: [1],
    include_tutorial_in_analytics: false,
    number_of_stimuli: 8,
  });

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const distributionPreview = () => {
    if (form.distribution_mode === 'percentage') {
      const c1 = Math.round((form.distribution_1back / 100) * form.total_games);
      const c2 = Math.round((form.distribution_2back / 100) * form.total_games);
      const c3 = form.total_games - c1 - c2;
      return { c1, c2, c3 };
    }
    return { c1: form.distribution_1back, c2: form.distribution_2back, c3: form.distribution_3back };
  };

  const canProceed = () => {
    if (step === 0) return form.title.trim().length > 0 && form.total_games > 0;
    if (step === 1) {
      const v = validateDistribution(form.distribution_mode, form.distribution_1back, form.distribution_2back, form.distribution_3back, form.total_games);
      return v.valid;
    }
    return true;
  };

  const handleStimulusSetSelected = (set) => {
    setSelectedStimulusSet(set);
    update('stimulus_set', set.stimuli || DEFAULT_STIMULI);
  };

  const handleAdvanceToParticipants = async () => {
    setSaving(true);
    const session_code = generateSessionCode();
    const session = await base44.entities.Session.create({
      ...form,
      stimulus_set: selectedStimulusSet ? (selectedStimulusSet.stimuli || DEFAULT_STIMULI) : DEFAULT_STIMULI,
      session_code,
      status: 'active',
    });
    setCreatedSessionId(session.id);
    setSaving(false);
    setStep(3);
  };

  const addPendingSubject = () => {
    if (!newSubjectId.trim()) return;
    if (pendingSubjects.some(s => s.subject_id === newSubjectId.trim())) {
      toast.error('Subject ID already added');
      return;
    }
    setPendingSubjects(prev => [...prev, { subject_id: newSubjectId.trim(), name: newSubjectName.trim() }]);
    setNewSubjectId('');
    setNewSubjectName('');
  };

  const removePendingSubject = (subjectId) => {
    setPendingSubjects(prev => prev.filter(s => s.subject_id !== subjectId));
  };

  const handleFinish = async () => {
    setSaving(true);
    if (pendingSubjects.length > 0 && createdSessionId) {
      await base44.entities.Subject.bulkCreate(
        pendingSubjects.map(s => ({
          session_id: createdSessionId,
          subject_id: s.subject_id,
          name: s.name || undefined,
          status: 'pending',
          games_completed: 0,
        }))
      );
    }
    toast.success('Session created successfully!');
    navigate('/researcher/dashboard');
  };

  const preview = distributionPreview();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              {i + 1}
            </div>
            <span className={`text-sm hidden sm:inline ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Session Info */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Beaker className="w-5 h-5 text-primary" />
              <CardTitle>Session Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Session Title</Label>
              <Input
                placeholder="e.g. Working Memory Study - Group A"
                value={form.title}
                onChange={e => update('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Number of Games</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={form.total_games}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '' || val === '0') update('total_games', val);
                  else update('total_games', parseInt(val) || 1);
                }}
                onBlur={e => {
                  if (!e.target.value || parseInt(e.target.value) < 1) update('total_games', 1);
                }}
              />
              <p className="text-sm text-muted-foreground">Each participant will play this many games in sequence</p>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Include Tutorial</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Add a practice game before the session begins</p>
                </div>
                <Switch
                  checked={form.include_tutorial}
                  onCheckedChange={v => {
                    update('include_tutorial', v);
                    if (!v) update('include_tutorial_in_analytics', false);
                  }}
                />
              </div>

              {form.include_tutorial && (
                <div className="pl-4 border-l-2 border-muted space-y-4">
                  <div className="space-y-2">
                    <Label>Tutorial N-Back Levels</Label>
                    <div className="flex gap-4">
                      {[1, 2, 3].map(n => (
                        <label key={n} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={(form.tutorial_n_back_levels ?? [1]).includes(n)}
                            onCheckedChange={checked => {
                              const current = form.tutorial_n_back_levels ?? [1];
                              update('tutorial_n_back_levels', checked ? [...current, n].sort() : current.filter(l => l !== n));
                            }}
                          />
                          <span className="text-sm">{n}-Back</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">One practice game will be added for each selected level</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Include Tutorial in Results</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Count the tutorial game results in session results</p>
                    </div>
                    <Switch
                      checked={form.include_tutorial_in_analytics}
                      onCheckedChange={v => update('include_tutorial_in_analytics', v)}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Distribution */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <CardTitle>N-Back Level Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Distribution Mode</Label>
              <Select value={form.distribution_mode} onValueChange={v => {
                update('distribution_mode', v);
                if (v === 'percentage') {
                  update('distribution_1back', 40);
                  update('distribution_2back', 30);
                  update('distribution_3back', 30);
                } else {
                  const t = form.total_games;
                  update('distribution_1back', Math.round(t * 0.4));
                  update('distribution_2back', Math.round(t * 0.3));
                  update('distribution_3back', t - Math.round(t * 0.4) - Math.round(t * 0.3));
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">By Count</SelectItem>
                  <SelectItem value="percentage">By Percentage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {['1', '2', '3'].map(n => {
              const key = `distribution_${n}back`;
              const val = form[key];
              const max = form.distribution_mode === 'percentage' ? 100 : form.total_games;
              return (
                <div key={n} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">{n}-back</Badge>
                    </Label>
                    <span className="text-sm font-mono font-medium">
                      {val}{form.distribution_mode === 'percentage' ? '%' : ` game${val !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <Slider
                    value={[val]}
                    min={0}
                    max={max}
                    step={form.distribution_mode === 'percentage' ? 5 : 1}
                    onValueChange={([v]) => update(key, v)}
                  />
                </div>
              );
            })}

            <Separator />

            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-sm font-medium mb-2">Preview: Resulting game mix</p>
              <div className="flex gap-3">
                {[
                  { label: '1-back', count: preview.c1 },
                  { label: '2-back', count: preview.c2 },
                  { label: '3-back', count: preview.c3 },
                ].map(item => (
                  <div key={item.label} className="flex-1 text-center p-3 bg-card rounded-lg border">
                    <div className="text-2xl font-bold">{item.count}</div>
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const v = validateDistribution(form.distribution_mode, form.distribution_1back, form.distribution_2back, form.distribution_3back, form.total_games);
                if (!v.valid) return <p className="text-sm text-destructive mt-3">{v.error}</p>;
                return null;
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Game Template */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Stimulus Set picker — always editable */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <Label>Stimulus Set</Label>
              {selectedStimulusSet ? (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedStimulusSet.stimulus_type === 'image' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {selectedStimulusSet.stimulus_type === 'image' ? <Image className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedStimulusSet.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedStimulusSet.stimulus_type} · {selectedStimulusSet.stimulus_count || 0} items</p>
                  </div>
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPickerOpen(true)} className="shrink-0 text-xs">Change</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button type="button" variant="outline" className="w-full justify-between gap-2" onClick={() => setPickerOpen(true)}>
                    <span className="text-muted-foreground">Choose a saved stimulus set…</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <button type="button" onClick={() => setCreatorOpen(true)} className="w-full text-sm text-primary hover:underline flex items-center justify-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5" /> Create new stimulus set
                  </button>
                  <p className="text-xs text-muted-foreground text-center">No set chosen — will use default letters (A–K)</p>
                </div>
              )}
            </CardContent>
          </Card>

          <GameTemplateSettings form={form} update={update} />
          <SessionDemo session={{
            stimulus_set: selectedStimulusSet ? (selectedStimulusSet.stimuli || []) : [],
            time_between_stimuli: form.time_between_stimuli,
            stimulus_display_time: form.stimulus_display_time,
          }} />
        </div>
      )}

      {/* Step 4: Add Participants */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>Add Participants</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">Optionally add subjects now — you can always add more later from the session page.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Subject ID (e.g. S001)"
                value={newSubjectId}
                onChange={e => setNewSubjectId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPendingSubject()}
                className="flex-1"
              />
              <Input
                placeholder="Name (optional)"
                value={newSubjectName}
                onChange={e => setNewSubjectName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPendingSubject()}
                className="flex-1"
              />
              <Button type="button" onClick={addPendingSubject} size="sm" className="gap-1.5 shrink-0">
                <UserPlus className="w-4 h-4" /> Add
              </Button>
            </div>

            {pendingSubjects.length > 0 ? (
              <div className="rounded-lg border divide-y">
                {pendingSubjects.map(s => (
                  <div key={s.subject_id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <span className="font-mono text-sm font-medium">{s.subject_id}</span>
                      {s.name && <span className="text-muted-foreground text-sm ml-2">— {s.name}</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePendingSubject(s.subject_id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
                No participants added yet — you can skip this step
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0 || step === 3}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        {step < 2 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : step === 2 ? (
          <Button onClick={handleAdvanceToParticipants} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Next <ArrowRight className="w-4 h-4" /></>}
          </Button>
        ) : (
          <Button onClick={handleFinish} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Finish & Create Session'}
          </Button>
        )}
      </div>

      <StimulusSetPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedId={selectedStimulusSet?.id}
        onSelect={handleStimulusSetSelected}
        onCreateNew={() => { setPickerOpen(false); setCreatorOpen(true); }}
      />
      <StimulusSetEditor
        open={creatorOpen}
        onOpenChange={setCreatorOpen}
        existingSet={null}
        onSaved={() => {
          setCreatorOpen(false);
          queryClient.invalidateQueries({ queryKey: ['stimulus-sets'] });
          setPickerOpen(true);
        }}
      />
    </div>
  );
}