import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Settings, Pencil, RotateCcw, TriangleAlert } from 'lucide-react';

const DEFAULTS = {
  stimulus_display_time: 500,
  time_between_stimuli: 2500,
  trials_per_game: 30,
  target_rate: 30,
  number_of_stimuli: 8,
};

const WARNINGS = {
  stimulus_display_time: (v) => v < 300 ? 'Very short — participants may not perceive stimuli reliably.' : v > 1000 ? 'Very long — may reduce task sensitivity.' : null,
  time_between_stimuli: (v) => v < 1500 ? 'Very fast — may be too demanding for most populations.' : v > 4000 ? 'Very slow — may reduce engagement.' : null,
  trials_per_game: (v) => v < 15 ? 'Too few trials — statistics may be unreliable.' : v > 60 ? 'Many trials — consider participant fatigue.' : null,
  target_rate: (v) => v < 15 ? 'Very low target rate — may create frustration.' : v > 50 ? 'High target rate — reduces task difficulty.' : null,
  number_of_stimuli: (v) => v < 4 ? 'Very few stimuli — too predictable.' : v > 20 ? 'Many stimuli — ensure your stimulus set is large enough.' : null,
};

const FIELD_META = {
  stimulus_display_time: { label: 'Stimulus Display Time', unit: 'ms', hint: 'How long each stimulus is shown on screen.', recommended: '500ms' },
  time_between_stimuli: { label: 'Inter-Stimulus Interval (ISI)', unit: 'ms', hint: 'Gap between the end of one stimulus and the start of the next.', recommended: '2,500ms' },
  trials_per_game: { label: 'Trials per Game', unit: 'trials', hint: 'Number of stimuli shown per game.', recommended: '30' },
  target_rate: { label: 'Target Rate', unit: '%', hint: 'Percentage of trials that are N-back matches.', recommended: '30%' },
  number_of_stimuli: { label: 'Number of Stimuli', unit: 'stimuli', hint: 'How many unique stimuli are drawn from the set per game.', recommended: '8' },
};

const SLIDER_PROPS = {
  stimulus_display_time: { min: 200, max: 3000, step: 100 },
  time_between_stimuli: { min: 500, max: 5000, step: 100 },
  trials_per_game: { min: 5, max: 100, step: 1 },
  target_rate: { min: 0, max: 100, step: 5 },
  number_of_stimuli: { min: 2, max: 30, step: 1 },
};

function ReadonlyRow({ fieldKey, value }) {
  const meta = FIELD_META[fieldKey];
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div>
        <p className="text-sm font-medium">{meta.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{meta.hint}</p>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <span className="text-sm font-mono font-semibold">{value}{meta.unit === '%' ? '%' : ` ${meta.unit}`}</span>
        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
          Recommended
        </Badge>
      </div>
    </div>
  );
}

function EditableRow({ fieldKey, value, onChange }) {
  const meta = FIELD_META[fieldKey];
  const sp = SLIDER_PROPS[fieldKey];
  const warning = WARNINGS[fieldKey]?.(value);
  const isDefault = value === DEFAULTS[fieldKey];

  return (
    <div className="space-y-2 py-3 border-b last:border-0">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          {meta.label}
          {isDefault && (
            <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
              Default
            </Badge>
          )}
        </Label>
        <span className="text-sm font-mono font-semibold">
          {value}{meta.unit === '%' ? '%' : ` ${meta.unit}`}
        </span>
      </div>
      <Slider
        value={[value]}
        min={sp.min}
        max={sp.max}
        step={sp.step}
        onValueChange={([v]) => onChange(fieldKey, v)}
      />
      {warning && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <TriangleAlert className="w-3 h-3 shrink-0" />
          {warning}
        </p>
      )}
      {!warning && <p className="text-xs text-muted-foreground">{meta.hint} (recommended: {meta.recommended})</p>}
    </div>
  );
}

export default function GameTemplateSettings({ form, update }) {
  const [editing, setEditing] = useState(false);

  const resetToDefaults = () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => update(k, v));
  };

  const isCustomized = Object.entries(DEFAULTS).some(([k, v]) => form[k] !== v);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <CardTitle>Game Template</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {editing && isCustomized && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={resetToDefaults}
                className="gap-1.5 text-muted-foreground text-xs h-8"
              >
                <RotateCcw className="w-3 h-3" />
                Reset to Defaults
              </Button>
            )}
            <Button
              type="button"
              variant={editing ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setEditing(e => !e)}
              className="gap-1.5 h-8"
            >
              <Pencil className="w-3 h-3" />
              {editing ? 'Done Editing' : 'Edit Settings'}
            </Button>
          </div>
        </div>


      </CardHeader>

      <CardContent className="pt-0">
        {!editing ? (
          <div className="rounded-lg border bg-muted/20 px-4 divide-y">
            {Object.keys(DEFAULTS).map(k => (
              <ReadonlyRow key={k} fieldKey={k} value={form[k]} />
            ))}
          </div>
        ) : (
          <div className="divide-y">
            {Object.keys(DEFAULTS).map(k => (
              <EditableRow key={k} fieldKey={k} value={form[k]} onChange={update} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}