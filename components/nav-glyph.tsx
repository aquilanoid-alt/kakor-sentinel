import { cn } from "@/lib/utils";

type NavGlyphName =
  | "overview"
  | "dashboard"
  | "scan"
  | "receive"
  | "distribution"
  | "stock"
  | "reports"
  | "guide"
  | "users"
  | "library"
  | "pricing";

export function NavGlyph({
  name,
  className
}: {
  name: NavGlyphName;
  className?: string;
}) {
  const shared = {
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none"
  };

  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} aria-hidden="true">
      {name === "overview" ? (
        <>
          <rect x="3.5" y="3.5" width="7" height="7" rx="2" {...shared} />
          <rect x="13.5" y="3.5" width="7" height="11" rx="2" {...shared} />
          <rect x="3.5" y="13.5" width="7" height="7" rx="2" {...shared} />
          <rect x="13.5" y="17.5" width="7" height="3" rx="1.5" {...shared} />
        </>
      ) : null}
      {name === "dashboard" ? (
        <>
          <path d="M4 18a8 8 0 1 1 16 0" {...shared} />
          <path d="M12 10v5l3 2" {...shared} />
          <path d="M6.5 17.5h11" {...shared} />
        </>
      ) : null}
      {name === "scan" ? (
        <>
          <path d="M7 4H5a1 1 0 0 0-1 1v2" {...shared} />
          <path d="M17 4h2a1 1 0 0 1 1 1v2" {...shared} />
          <path d="M7 20H5a1 1 0 0 1-1-1v-2" {...shared} />
          <path d="M17 20h2a1 1 0 0 0 1-1v-2" {...shared} />
          <path d="M8 12h8" {...shared} />
          <path d="M10 9h4" {...shared} />
          <path d="M9 15h6" {...shared} />
        </>
      ) : null}
      {name === "receive" ? (
        <>
          <path d="M12 4v11" {...shared} />
          <path d="m8 11 4 4 4-4" {...shared} />
          <rect x="4" y="16.5" width="16" height="3.5" rx="1.75" {...shared} />
        </>
      ) : null}
      {name === "distribution" ? (
        <>
          <path d="M4 16V8a2 2 0 0 1 2-2h8" {...shared} />
          <path d="M14 6h3l3 3v7a2 2 0 0 1-2 2h-2" {...shared} />
          <circle cx="8" cy="17" r="2.25" {...shared} />
          <circle cx="17" cy="17" r="2.25" {...shared} />
        </>
      ) : null}
      {name === "stock" ? (
        <>
          <path d="M5 8.5 12 4l7 4.5-7 4L5 8.5Z" {...shared} />
          <path d="M5 12.5 12 17l7-4.5" {...shared} />
          <path d="M5 16.5 12 21l7-4.5" {...shared} />
        </>
      ) : null}
      {name === "reports" ? (
        <>
          <path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7 4.5Z" {...shared} />
          <path d="M14 4.5V9h4" {...shared} />
          <path d="M9 13h6" {...shared} />
          <path d="M9 16.5h4" {...shared} />
        </>
      ) : null}
      {name === "guide" ? (
        <>
          <path d="M5.5 5.5A2.5 2.5 0 0 1 8 3h10.5v16H8a2.5 2.5 0 0 0-2.5 2.5Z" {...shared} />
          <path d="M5.5 5.5V19A2.5 2.5 0 0 1 8 16.5h10.5" {...shared} />
          <path d="M9.5 7.5h5" {...shared} />
          <path d="M9.5 11h6.5" {...shared} />
        </>
      ) : null}
      {name === "users" ? (
        <>
          <path d="M7.5 13.5a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" {...shared} />
          <path d="M16.5 11.5a2.5 2.5 0 1 0 0-5" {...shared} />
          <path d="M3.5 19c.9-2.2 2.8-3.5 5-3.5s4.1 1.3 5 3.5" {...shared} />
          <path d="M14.5 18c.55-1.4 1.75-2.25 3.25-2.25 1.15 0 2.15.5 2.75 1.5" {...shared} />
        </>
      ) : null}
      {name === "library" ? (
        <>
          <path d="M5 6.5A1.5 1.5 0 0 1 6.5 5h10A1.5 1.5 0 0 1 18 6.5v11A1.5 1.5 0 0 1 16.5 19h-10A1.5 1.5 0 0 1 5 17.5Z" {...shared} />
          <path d="M8 5v14" {...shared} />
          <path d="M11 8.5h4" {...shared} />
          <path d="M11 12h4" {...shared} />
        </>
      ) : null}
      {name === "pricing" ? (
        <>
          <path d="M12 4.5v15" {...shared} />
          <path d="M16.5 7.5c0-1.65-2.02-3-4.5-3s-4.5 1.35-4.5 3 2.02 3 4.5 3 4.5 1.35 4.5 3-2.02 3-4.5 3-4.5-1.35-4.5-3" {...shared} />
        </>
      ) : null}
    </svg>
  );
}
