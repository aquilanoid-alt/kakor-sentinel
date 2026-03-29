import { cn } from "@/lib/utils";

export function BrandCopy({
  className,
  titleClassName,
  subtitleClassName,
  taglineClassName
}: {
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  taglineClassName?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p
        className={cn(
          "font-heading text-[clamp(1.35rem,2.8vw,2rem)] font-semibold uppercase tracking-[0.16em] text-white",
          titleClassName
        )}
      >
        KAKOR SENTINEL SUPPLY
      </p>
      <p className={cn("text-sm italic text-mist/72 sm:text-base", subtitleClassName)}>
        Smart Pharmacy Control &amp; Distribution System
      </p>
      <p className={cn("text-sm font-semibold tracking-[0.08em] text-white sm:text-base", taglineClassName)}>
        Precision. Visibility. Control.
      </p>
    </div>
  );
}
