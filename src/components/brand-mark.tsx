import Link from "next/link";

import { cn } from "@/lib/utils";

export function BrandMark({
  href,
  label = "Servio",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const mark = (
    <span className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-md bg-brand text-xs font-bold text-brand-foreground"
      >
        S
      </span>
      {label}
    </span>
  );

  if (!href) return <span className={className}>{mark}</span>;

  return (
    <Link href={href} className={cn("inline-flex", className)}>
      {mark}
    </Link>
  );
}
