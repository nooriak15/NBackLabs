import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X } from 'lucide-react';

export default function TextStimulusEditor({ stimuli, onChange }) {
  const [inputValue, setInputValue] = useState('');

  const addItem = () => {
    const val = inputValue.trim();
    if (!val) return;
    if (stimuli.some(s => s.value === val)) return;
    onChange([...stimuli, { type: 'text', value: val }]);
    setInputValue('');
  };

  const removeItem = (value) => {
    onChange(stimuli.filter(s => s.value !== value));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Type a stimulus item and press Enter or Add"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button type="button" onClick={addItem} size="sm" variant="secondary" className="gap-1.5 shrink-0">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {stimuli.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg min-h-12">
          {stimuli.map((s, i) => (
            <Badge key={i} variant="secondary" className="gap-1.5 text-base font-mono px-3 py-1">
              {s.value}
              <button
                type="button"
                onClick={() => removeItem(s.value)}
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-muted/40 rounded-lg text-sm text-muted-foreground text-center">
          No stimuli added yet. Type an item above and press Enter or click Add.
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{stimuli.length} stimulus item{stimuli.length !== 1 ? 's' : ''}</span>
        {stimuli.length < 6 && stimuli.length > 0 && (
          <span className="text-amber-500">Minimum 6 required to save</span>
        )}
        {stimuli.length >= 6 && stimuli.length < 8 && (
          <span className="text-amber-500">8–10+ recommended for best results</span>
        )}
        {stimuli.length >= 8 && (
          <span className="text-green-600">Good variety for N-back tasks</span>
        )}
      </div>
    </div>
  );
}