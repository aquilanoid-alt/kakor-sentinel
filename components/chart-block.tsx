import { cn } from "@/lib/utils";

interface ChartBlockProps {
  label: string;
  value: number;
  delta: number;
  maxValue: number;
}

export function ChartBlock({ label, value, delta, maxValue }: ChartBlockProps) {
  const width = Math.max(12, (value / maxValue) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-mist/80">{label}</span>
        <span className={cn("font-medium", delta >= 0 ? "text-aqua" : "text-rose-200")}>
          {delta >= 0 ? "+" : ""}
          {delta}%
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal via-cyan to-aqua shadow-neon"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="text-xs uppercase tracking-[0.2em] text-mist/50">{value} unit</p>
    </div>
  );
}
