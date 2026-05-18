import * as React from "react";

import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-[oklch(0.880_0.011_85)/65] bg-card",
        // Multi-layer shadow — base + colored haze
        "shadow-[0_1px_3px_rgba(22,101,52,0.05),0_6px_24px_-8px_rgba(22,101,52,0.09),0_1px_0_rgba(255,255,255,0.85)_inset]",
        // Smooth all-property transition
        "transition-all duration-300",
        // Hover: deeper shadow + subtle green border tint
        "hover:shadow-[0_1px_3px_rgba(22,101,52,0.05),0_10px_36px_-8px_rgba(22,101,52,0.15),0_1px_0_rgba(255,255,255,0.90)_inset]",
        "hover:border-[oklch(0.555_0.155_145)/22]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}

export function CardTitle({
  className,
  ...props
}: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn(
        "text-base font-semibold tracking-tight text-slate-900",
        className,
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-6 text-muted-foreground", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}
