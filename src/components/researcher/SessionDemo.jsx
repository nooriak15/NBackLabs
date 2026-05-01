import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Clock } from 'lucide-react';

export default function SessionDemo({ session }) {
  const [running, setRunning] = useState(false);
  const [currentStimulus, setCurrentStimulus] = useState(null);
  const [visible, setVisible] = useState(false);
  const [timeBetween, setTimeBetween] = useState(session.time_between_stimuli || 2500);
  const [displayTime, setDisplayTime] = useState(session.stimulus_display_time || 500);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const stimuli = session.stimulus_set || [];

  const pickRandom = () => {
    if (stimuli.length === 0) return { type: 'text', value: 'A' };
    return stimuli[Math.floor(Math.random() * stimuli.length)];
  };

  const showNext = () => {
    const s = pickRandom();
    setCurrentStimulus(s);
    setVisible(true);
    timeoutRef.current = setTimeout(() => setVisible(false), displayTime);
  };

  const start = () => {
    setRunning(true);
    showNext();
    intervalRef.current = setInterval(showNext, timeBetween);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current);
    clearTimeout(timeoutRef.current);
    setVisible(false);
    setCurrentStimulus(null);
  };

  useEffect(() => {
    if (running) {
      stop();
      start();
    }
  }, [timeBetween, displayTime]);

  useEffect(() => () => { clearInterval(intervalRef.current); clearTimeout(timeoutRef.current); }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Play className="w-5 h-5 text-primary" />
          Demo Speed Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stimulus display */}
        <div className="flex items-center justify-center h-40 rounded-xl bg-muted/50 border relative overflow-hidden">
          {visible && currentStimulus ? (
            currentStimulus.type === 'image' ? (
              <img src={currentStimulus.value} alt="stimulus" className="max-h-32 max-w-full object-contain rounded-lg shadow" />
            ) : (
              <span className="text-6xl font-bold text-foreground">{currentStimulus.value}</span>
            )
          ) : (
            <span className="text-muted-foreground text-sm">{running ? '…' : 'Press Play to preview'}</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3">
          {!running ? (
            <Button onClick={start} className="gap-2">
              <Play className="w-4 h-4" /> Play Demo
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop} className="gap-2">
              <Square className="w-4 h-4" /> Stop
            </Button>
          )}
        </div>

        {/* Timing sliders */}
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Time between stimuli</span>
              <Badge variant="outline" className="font-mono">{timeBetween}ms</Badge>
            </div>
            <Slider
              value={[timeBetween]}
              min={500}
              max={5000}
              step={100}
              onValueChange={([v]) => setTimeBetween(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>500ms (fast)</span><span>5000ms (slow)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Stimulus display time</span>
              <Badge variant="outline" className="font-mono">{displayTime}ms</Badge>
            </div>
            <Slider
              value={[displayTime]}
              min={100}
              max={2000}
              step={50}
              onValueChange={([v]) => setDisplayTime(v)}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>100ms (brief)</span><span>2000ms (long)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}