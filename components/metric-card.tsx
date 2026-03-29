import { cn, formatNumber, percent } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: number;
  delta: number;
  tone?: "teal" | "cyan";
}

export function MetricCard({ label, value, delta, tone = "teal" }: MetricCardProps) {
  return (
    <div
      className={cn(
        "surface-card rounded-[28px] p-5 backdrop-blur",
        tone === "cyan" && "border-cyan/30"
      )}
    >
      <p className="text-xs uppercase tracking-[0.3em] text-mist/60">{label}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <p className="font-heading text-4xl font-semibold text-white">{formatNumber(value)}</p>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold",
            delta >= 0 ? "bg-teal/20 text-aqua" : "bg-rose-500/20 text-rose-200"
          )}
        >
          {delta >= 0 ? "+" : ""}
          {percent(delta)}
        </span>
      </div>
    </div>
  );
}
