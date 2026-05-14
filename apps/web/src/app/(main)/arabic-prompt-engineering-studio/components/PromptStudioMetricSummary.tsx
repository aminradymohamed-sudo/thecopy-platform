export function PromptStudioMetricSummary({
  title,
  score,
}: {
  title: string;
  score: number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-white/55">{title}</p>
      <p className="mt-1 text-2xl font-bold text-white">{score}/100</p>
    </div>
  );
}
