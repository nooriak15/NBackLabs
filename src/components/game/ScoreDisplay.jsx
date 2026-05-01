export default function ScoreDisplay({ current, total, score, nBackLevel }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-mono font-medium">
          {nBackLevel}-back
        </span>
        <span className="text-muted-foreground">
          Trial <span className="font-mono font-medium text-foreground">{current}</span> / {total}
        </span>
      </div>
      <div className="text-muted-foreground">
        Score: <span className="font-mono font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}