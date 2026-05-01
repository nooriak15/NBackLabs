import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, ChevronRight } from 'lucide-react';
import StimulusRenderer from '@/components/game/StimulusRenderer';
import FeedbackDisk from '@/components/game/FeedbackDisk';
import ScoreDisplay from '@/components/game/ScoreDisplay';
import { generateGameSequence, generateTrialSequence, computeGameResults } from '@/lib/gameLogic';
import { toast } from 'sonner';

export default function GamePlay() {
  const { sessionCode, subjectId } = useParams();
  const navigate = useNavigate();

  // Session state
  const [session, setSession] = useState(null);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Game sequence state
  const [gameSequence, setGameSequence] = useState([]); // array of n-back levels
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  // Phase: 'loading' | 'ready' | 'countdown' | 'playing' | 'game-over' | 'session-complete'
  const [phase, setPhase] = useState('loading');
  const [countdown, setCountdown] = useState(3);

  // Trial state
  const [trials, setTrials] = useState([]);
  const [currentTrialIndex, setCurrentTrialIndex] = useState(0);
  const [stimulusVisible, setStimulusVisible] = useState(false);
  const [responses, setResponses] = useState([]);
  const [diskStatus, setDiskStatus] = useState('neutral');
  const [score, setScore] = useState(0);

  // Refs for timing
  const trialTimerRef = useRef(null);
  const stimulusTimerRef = useRef(null);
  const respondedRef = useRef(false);
  const trialStartRef = useRef(0);

  // Game results for the current game
  const [gameResults, setGameResults] = useState(null);
  const [savingResults, setSavingResults] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [resultsSaved, setResultsSaved] = useState(false);

  // Image preload state — fetched once before the first game so per-trial
  // <img> mounts paint instantly from cache instead of waiting on Supabase
  // Storage. Without this, stimulus_display_time is unreliable for image
  // sets (the image often hasn't even arrived before the trial advances).
  const [preloadProgress, setPreloadProgress] = useState({ loaded: 0, total: 0 });
  const [preloadDone, setPreloadDone] = useState(false);

  // Load session and subject
  useEffect(() => {
    const load = async () => {
      const sessions = await base44.entities.Session.filter({ session_code: sessionCode });
      if (sessions.length === 0) { setError('Session not found'); setLoading(false); return; }
      const sess = sessions[0];
      setSession(sess);

      const subjects = await base44.entities.Subject.filter({ session_id: sess.id, subject_id: subjectId });
      if (subjects.length === 0) { setError('Subject not found'); setLoading(false); return; }
      setSubject(subjects[0]);

      // Check how many games already completed
      const existingResults = await base44.entities.GameResult.filter({ session_id: sess.id, subject_id: subjectId });
      const completedCount = existingResults.length;

      const seq = generateGameSequence(sess);
      setGameSequence(seq);
      setCurrentGameIndex(completedCount);

      // Total games including tutorial (one game per tutorial level)
      const tutorialCount = sess.include_tutorial
        ? (Array.isArray(sess.tutorial_n_back_levels) ? sess.tutorial_n_back_levels.length : 1)
        : 0;
      const totalIncludingTutorial = sess.total_games + tutorialCount;
      if (completedCount >= totalIncludingTutorial) {
        setPhase('session-complete');
      } else {
        setPhase('ready');
      }
      setLoading(false);
    };
    load();
  }, [sessionCode, subjectId]);

  // Preload image stimuli into the browser cache before any trial runs.
  // Text-only sets skip this and just mark preload done immediately.
  useEffect(() => {
    if (!session) return;
    const stimuli = Array.isArray(session.stimulus_set) ? session.stimulus_set : [];
    const imageUrls = stimuli
      .filter(s => s && s.type === 'image' && typeof s.value === 'string')
      .map(s => s.value);

    if (imageUrls.length === 0) {
      setPreloadProgress({ loaded: 0, total: 0 });
      setPreloadDone(true);
      return;
    }

    setPreloadProgress({ loaded: 0, total: imageUrls.length });
    setPreloadDone(false);

    let cancelled = false;
    let loaded = 0;
    // Hold strong refs so the browser doesn't garbage-collect decoded images
    // before the game starts.
    const refs = imageUrls.map(url => {
      const img = new Image();
      const done = () => {
        if (cancelled) return;
        loaded += 1;
        setPreloadProgress({ loaded, total: imageUrls.length });
        if (loaded >= imageUrls.length) setPreloadDone(true);
      };
      img.onload = done;
      img.onerror = done; // Don't block the whole game on a single broken URL
      img.src = url;
      return img;
    });

    return () => {
      cancelled = true;
      // Clear handlers so any late-firing event doesn't update unmounted state
      refs.forEach(img => { img.onload = null; img.onerror = null; });
    };
  }, [session]);

  // Start a game
  const startGame = useCallback(() => {
    if (!session) return;
    const nBack = gameSequence[currentGameIndex];
    const trialSeq = generateTrialSequence(nBack, session.trials_per_game, session.stimulus_set, session.target_rate ?? 30, session.number_of_stimuli ?? null);
    setTrials(trialSeq);
    setCurrentTrialIndex(0);
    setResponses([]);
    setScore(0);
    setDiskStatus('neutral');
    setGameResults(null);
    setPhase('countdown');
    setCountdown(3);
  }, [session, gameSequence, currentGameIndex]);

  // Countdown
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('playing');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown]);

  // Run trials
  useEffect(() => {
    if (phase !== 'playing' || !session || trials.length === 0) return;
    if (currentTrialIndex >= trials.length) {
      // Game over
      const results = computeGameResults(trials, responses);
      setGameResults(results);
      setPhase('game-over');
      return;
    }

    respondedRef.current = false;
    setStimulusVisible(true);
    trialStartRef.current = Date.now();

    // Hide stimulus after display time
    stimulusTimerRef.current = setTimeout(() => {
      setStimulusVisible(false);
    }, session.stimulus_display_time);

    // Move to next trial after interval
    trialTimerRef.current = setTimeout(() => {
      const trial = trials[currentTrialIndex];
      if (!respondedRef.current) {
        // No response
        if (trial.isTarget) {
          // Missed target = false negative → red disk
          setDiskStatus('incorrect');
          setResponses(prev => [...prev, { pressed: false, responseTime: null }]);
        } else {
          // Correctly didn't press = true negative → stay green
          setDiskStatus('correct');
          setResponses(prev => [...prev, { pressed: false, responseTime: null }]);
          setScore(s => s + 1);
        }
      }
      // Reset disk after brief flash
      setTimeout(() => {
        if (phase === 'playing') setDiskStatus('neutral');
      }, 300);
      setCurrentTrialIndex(i => i + 1);
    }, session.time_between_stimuli);

    return () => {
      clearTimeout(stimulusTimerRef.current);
      clearTimeout(trialTimerRef.current);
    };
  }, [phase, currentTrialIndex, trials, session]);

  // Handle spacebar
  useEffect(() => {
    if (phase !== 'playing') return;
    const handleKey = (e) => {
      if (e.code !== 'Space' || respondedRef.current) return;
      e.preventDefault();
      respondedRef.current = true;
      const rt = Date.now() - trialStartRef.current;
      const trial = trials[currentTrialIndex];

      if (trial.isTarget) {
        // Correct press = true positive
        setDiskStatus('correct');
        setScore(s => s + 1);
        setResponses(prev => [...prev, { pressed: true, responseTime: rt }]);
      } else {
        // Incorrect press = false positive → red disk
        setDiskStatus('incorrect');
        setResponses(prev => [...prev, { pressed: true, responseTime: rt }]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [phase, currentTrialIndex, trials]);

  // Save results when game is over.
  // Wrapped in try/catch/finally so a Supabase failure (RLS, network, etc.)
  // surfaces a toast and a Retry button instead of leaving the
  // "Next Game" button stuck in a permanent loading state.
  const saveResults = useCallback(async () => {
    if (!gameResults || !session || !subject) return;
    setSavingResults(true);
    setSaveError(null);
    try {
      const trialData = trials.map((t, i) => ({
        trial_index: i,
        stimulus: t.value,
        is_target: t.isTarget,
        responded: responses[i]?.pressed || false,
        response_time: responses[i]?.responseTime || null,
        correct: (t.isTarget && responses[i]?.pressed) || (!t.isTarget && !responses[i]?.pressed),
        timestamp: new Date().toISOString(),
      }));

      await base44.entities.GameResult.create({
        session_id: session.id,
        subject_id: subjectId,
        game_index: currentGameIndex,
        n_back_level: gameSequence[currentGameIndex],
        ...gameResults,
        trial_count: trials.length,
        stimulus_timing: session.time_between_stimuli,
        trial_data: trialData,
        started_at: new Date(Date.now() - trials.length * session.time_between_stimuli).toISOString(),
        completed_at: new Date().toISOString(),
      });

      // Update subject progress
      const newCompleted = currentGameIndex + 1;
      await base44.entities.Subject.update(subject.id, {
        games_completed: newCompleted,
        status: newCompleted >= session.total_games ? 'completed' : 'in_progress',
      });

      setResultsSaved(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[GamePlay] save failed:', err);
      const msg = err?.message || 'Failed to save game results';
      setSaveError(msg);
      toast.error(msg);
    } finally {
      setSavingResults(false);
    }
  }, [gameResults, session, subject, trials, responses, subjectId, currentGameIndex, gameSequence]);

  useEffect(() => {
    if (phase !== 'game-over' || !gameResults || savingResults || resultsSaved) return;
    saveResults();
  }, [phase, gameResults, savingResults, resultsSaved, saveResults]);

  const tutorialCount = session?.include_tutorial
    ? (Array.isArray(session.tutorial_n_back_levels) ? session.tutorial_n_back_levels.length : 1)
    : 0;

  const nextGame = () => {
    const next = currentGameIndex + 1;
    const totalIncludingTutorial = session.total_games + tutorialCount;
    // Reset per-game save state before moving on
    setResultsSaved(false);
    setSaveError(null);
    setGameResults(null);
    if (next >= totalIncludingTutorial) {
      setPhase('session-complete');
    } else {
      setCurrentGameIndex(next);
      setPhase('ready');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card><CardContent className="p-8 text-center"><p className="text-destructive">{error}</p></CardContent></Card>
      </div>
    );
  }

  // Session complete
  if (phase === 'session-complete') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 mx-auto flex items-center justify-center mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h2 className="text-2xl font-bold mb-2">All Done!</h2>
            <p className="text-muted-foreground mb-6">
              You have completed all {session.total_games} games. Thank you for participating!
            </p>
            <Button onClick={() => navigate('/')} variant="outline">Return Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready to start
  if (phase === 'ready') {
    const nBack = gameSequence[currentGameIndex];
    const isTutorial = session.include_tutorial && currentGameIndex < tutorialCount;
    const displayGameIndex = session.include_tutorial ? currentGameIndex : currentGameIndex + 1;
    const displayTotal = session.total_games + tutorialCount;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <div className="text-sm text-muted-foreground mb-2">
              {isTutorial ? 'Practice Game' : `Game ${displayGameIndex} of ${displayTotal}`}
            </div>
            <h2 className="text-3xl font-bold mb-2">{nBack}-Back</h2>
            <p className="text-muted-foreground mb-6">
              Press <kbd className="px-2 py-0.5 bg-muted rounded text-sm font-mono">Space</kbd> when the current stimulus matches the one from <strong>{nBack}</strong> step{nBack > 1 ? 's' : ''} ago.
            </p>
            <div className="text-sm text-muted-foreground mb-6">
              {session.trials_per_game} trials · {session.time_between_stimuli}ms interval
            </div>
            {!preloadDone && preloadProgress.total > 0 && (
              <p className="text-xs text-muted-foreground mb-3 flex items-center justify-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Preparing stimuli ({preloadProgress.loaded} / {preloadProgress.total})
              </p>
            )}
            <Button
              onClick={startGame}
              size="lg"
              className="gap-2"
              disabled={!preloadDone}
            >
              <Play className="w-5 h-5" />
              Start Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Countdown
  if (phase === 'countdown') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-8xl font-bold font-mono text-primary animate-pulse">
            {countdown}
          </div>
          <p className="text-muted-foreground mt-4">Get ready...</p>
        </div>
      </div>
    );
  }

  // Playing
  if (phase === 'playing') {
    const progress = ((currentTrialIndex) / trials.length) * 100;
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Top bar — secondary UI */}
        <div className="px-4 pt-4 pb-2 max-w-lg mx-auto w-full">
          <ScoreDisplay
            current={currentTrialIndex + 1}
            total={trials.length}
            score={score}
            nBackLevel={gameSequence[currentGameIndex]}
          />
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>

        {/* Main game area — stimulus is the focal point */}
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 py-6">
          <StimulusRenderer
            stimulus={trials[currentTrialIndex]}
            visible={stimulusVisible}
          />
          {/* Feedback + hint row — visually secondary */}
          <div className="flex items-center gap-4">
            <FeedbackDisk status={diskStatus} />
            <p className="text-sm text-muted-foreground">
              Press <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">Space</kbd> for a match
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Game over
  if (phase === 'game-over' && gameResults) {
    const accuracy = trials.length > 0
      ? Math.round(((gameResults.true_positives + gameResults.true_negatives) / trials.length) * 100)
      : 0;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8">
            <div className="text-center mb-6">
              <div className="text-sm text-muted-foreground mb-1">{session.include_tutorial && currentGameIndex < tutorialCount ? 'Practice Game Complete' : `Game ${session.include_tutorial ? currentGameIndex - tutorialCount + 1 : currentGameIndex + 1} Complete`}</div>
              <h2 className="text-2xl font-bold">Results</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{accuracy}%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{gameResults.total_score}</div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{gameResults.true_positives}</div>
                <div className="text-xs text-muted-foreground">Hits</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{gameResults.false_positives}</div>
                <div className="text-xs text-muted-foreground">False Alarms</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold">{gameResults.true_negatives}</div>
                <div className="text-xs text-muted-foreground">Correct Rejections</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-500">{gameResults.false_negatives}</div>
                <div className="text-xs text-muted-foreground">Misses</div>
              </div>
            </div>

            {gameResults.avg_response_time > 0 && (
              <p className="text-center text-sm text-muted-foreground mb-6">
                Avg. response time: <span className="font-mono font-medium">{gameResults.avg_response_time}ms</span>
              </p>
            )}

            {saveError && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <p className="font-medium mb-1">Couldn&apos;t save results</p>
                <p className="text-xs opacity-80 break-words">{saveError}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 gap-2"
                  onClick={saveResults}
                  disabled={savingResults}
                >
                  {savingResults ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Retry save
                </Button>
              </div>
            )}

            <Button
              onClick={nextGame}
              className="w-full gap-2"
              size="lg"
              disabled={savingResults || !!saveError}
            >
              {savingResults ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : currentGameIndex + 1 >= session.total_games + tutorialCount ? (
                'Finish Session'
              ) : (
                <>{session.include_tutorial && currentGameIndex < tutorialCount - 1 ? 'Next Practice Game' : session.include_tutorial && currentGameIndex === tutorialCount - 1 ? 'Start Session' : 'Next Game'} <ChevronRight className="w-4 h-4" /></>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}