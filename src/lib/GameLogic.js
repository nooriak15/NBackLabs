/**
 * Core N-back game logic
 * Handles sequence generation, target detection, scoring, and distribution
 */

// Default letter stimulus set
export const DEFAULT_STIMULI = [
  { type: 'text', value: 'A' },
  { type: 'text', value: 'B' },
  { type: 'text', value: 'C' },
  { type: 'text', value: 'D' },
  { type: 'text', value: 'E' },
  { type: 'text', value: 'F' },
  { type: 'text', value: 'G' },
  { type: 'text', value: 'H' },
  { type: 'text', value: 'K' },
];

/**
 * Generates game sequence for N-back games in a session.
 * Returns an array of N-back levels, one per game, randomized.
 */
export function generateGameSequence(session) {
  const { total_games, distribution_mode, distribution_1back, distribution_2back, distribution_3back, include_tutorial, tutorial_n_back_levels, tutorial_n_back_level } = session;

  let count1, count2, count3;

  if (distribution_mode === 'percentage') {
    count1 = Math.round((distribution_1back / 100) * total_games);
    count2 = Math.round((distribution_2back / 100) * total_games);
    count3 = total_games - count1 - count2; // remainder goes to 3-back to ensure total matches
  } else {
    count1 = distribution_1back || 0;
    count2 = distribution_2back || 0;
    count3 = distribution_3back || 0;
  }

  const mainSequence = [
    ...Array(count1).fill(1),
    ...Array(count2).fill(2),
    ...Array(count3).fill(3),
  ];

  // Fisher-Yates shuffle
  for (let i = mainSequence.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mainSequence[i], mainSequence[j]] = [mainSequence[j], mainSequence[i]];
  }

  // Prepend tutorial games if enabled (one per selected level, sorted)
  if (include_tutorial) {
    const levels = Array.isArray(tutorial_n_back_levels) && tutorial_n_back_levels.length > 0
      ? [...tutorial_n_back_levels].sort()
      : [tutorial_n_back_level ?? 1];
    return [...levels, ...mainSequence];
  }

  return mainSequence;
}

/**
 * Generates a trial sequence for a single N-back game.
 * Uses targetRate (0–100) to determine the % of eligible trials that are targets.
 * Distributes targets evenly to avoid clustering.
 */
export function generateTrialSequence(nBackLevel, trialCount, stimulusSet, targetRate = 30, numberOfStimuli = null) {
  const allStimuli = stimulusSet && stimulusSet.length > 0 ? stimulusSet : DEFAULT_STIMULI;
  // Subsample stimuli if numberOfStimuli is set and smaller than the full set
  const stimuli = numberOfStimuli && numberOfStimuli < allStimuli.length
    ? shuffle([...allStimuli]).slice(0, numberOfStimuli)
    : allStimuli;
  const trials = [];
  const rate = Math.max(0, Math.min(100, targetRate)) / 100;

  // Eligible positions = all positions after the first N trials
  const eligiblePositions = [];
  for (let i = nBackLevel; i < trialCount; i++) {
    eligiblePositions.push(i);
  }

  const numTargets = Math.round(eligiblePositions.length * rate);

  // Distribute targets evenly to avoid clustering:
  // Divide eligible positions into numTargets buckets, pick one from each.
  const targetPositions = new Set();
  if (numTargets > 0) {
    const bucketSize = eligiblePositions.length / numTargets;
    for (let b = 0; b < numTargets; b++) {
      const start = Math.floor(b * bucketSize);
      const end = Math.floor((b + 1) * bucketSize);
      const bucketStart = eligiblePositions[start];
      const bucketEnd = eligiblePositions[Math.min(end, eligiblePositions.length) - 1];
      // Pick a random position within this bucket
      const pos = bucketStart + Math.floor(Math.random() * (bucketEnd - bucketStart + 1));
      targetPositions.add(pos);
    }
  }

  // Generate the sequence
  for (let i = 0; i < trialCount; i++) {
    if (i < nBackLevel) {
      // First N trials: pick random stimulus
      const stim = stimuli[Math.floor(Math.random() * stimuli.length)];
      trials.push({ ...stim, isTarget: false, trialIndex: i });
    } else if (targetPositions.has(i)) {
      // Target trial: repeat stimulus from N positions back
      const matchStim = trials[i - nBackLevel];
      trials.push({ type: matchStim.type, value: matchStim.value, isTarget: true, trialIndex: i });
    } else {
      // Non-target trial: pick stimulus different from N-back position
      const nBackStim = trials[i - nBackLevel];
      const otherStimuli = stimuli.filter(s => s.value !== nBackStim.value);
      const stim = otherStimuli.length > 0
        ? otherStimuli[Math.floor(Math.random() * otherStimuli.length)]
        : stimuli[Math.floor(Math.random() * stimuli.length)];
      trials.push({ type: stim.type, value: stim.value, isTarget: false, trialIndex: i });
    }
  }

  return trials;
}

/**
 * Computes game results from trial responses.
 */
export function computeGameResults(trials, responses) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  const responseTimes = [];

  trials.forEach((trial, i) => {
    const response = responses[i];
    const responded = response && response.pressed;
    const isTarget = trial.isTarget;

    if (isTarget && responded) {
      tp++;
      if (response.responseTime) responseTimes.push(response.responseTime);
    } else if (!isTarget && responded) {
      fp++;
    } else if (!isTarget && !responded) {
      tn++;
    } else if (isTarget && !responded) {
      fn++;
    }
  });

  const totalScore = tp + tn;
  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  return {
    true_positives: tp,
    false_positives: fp,
    true_negatives: tn,
    false_negatives: fn,
    total_score: totalScore,
    avg_response_time: Math.round(avgResponseTime),
  };
}

/**
 * Validates distribution config.
 */
export function validateDistribution(mode, d1, d2, d3, totalGames) {
  if (mode === 'percentage') {
    const sum = (d1 || 0) + (d2 || 0) + (d3 || 0);
    if (Math.abs(sum - 100) > 0.01) {
      return { valid: false, error: `Percentages must sum to 100% (currently ${sum}%)` };
    }
  } else {
    const sum = (d1 || 0) + (d2 || 0) + (d3 || 0);
    if (sum !== totalGames) {
      return { valid: false, error: `Game counts must sum to ${totalGames} (currently ${sum})` };
    }
  }
  return { valid: true };
}

/**
 * Generate a short session code.
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}