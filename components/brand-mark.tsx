import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  compact = false
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("inline-flex items-center", className)}>
      <div
        className={cn(
          "brand-shell relative overflow-hidden",
          compact ? "size-[5.9rem] rounded-[1.9rem]" : "size-28 rounded-[2.2rem]"
        )}
      >
        <div className="brand-art absolute inset-[0.18rem] overflow-hidden rounded-[1.55rem]">
          <Image
            src="/kss-logo.png"
            alt="Logo KAKOR SENTINEL SUPPLY"
            fill
            priority
            sizes={compact ? "95px" : "112px"}
            className="brand-logo-image"
          />
        </div>
      </div>
    </div>
  );
}
