"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function ProjectTabs({
  projectId,
  dark = false,
}: {
  projectId: string;
  dark?: boolean;
}) {
  const pathname = usePathname();
  const tabs = [
    { href: `/projects/${projectId}/dashboard`, label: "Tableau de bord" },
    { href: `/projects/${projectId}/planning`,  label: "Planning" },
    { href: `/projects/${projectId}/lookahead`, label: "Look-ahead" },
    { href: `/projects/${projectId}/network`, label: "PERT" },
    { href: `/projects/${projectId}/analytics`, label: "Analyse" },
    { href: `/projects/${projectId}/resources`, label: "Ressources" },
    { href: `/projects/${projectId}/baselines`, label: "Référentiels" },
    { href: `/projects/${projectId}/risks`,    label: "Risques" },
    { href: `/projects/${projectId}/soutenance`, label: "Soutenance" },
    { href: `/projects/${projectId}/activity`, label: "Activite" },
    { href: `/projects/${projectId}/settings`, label: "Parametres" },
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-xl p-1"
      style={
        dark
          ? {
              background: "rgba(0,0,0,0.25)",
              border: "1px solid rgba(86,164,91,0.20)",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.30)",
            }
          : {
              background: "oklch(0.952 0.007 85)",
              border: "1px solid oklch(0.880 0.011 85)",
              boxShadow:
                "inset 0 1px 2px rgba(22,101,52,0.06), 0 1px 3px rgba(22,101,52,0.04)",
            }
      }
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "relative rounded-lg px-4 py-1.5 text-[13px] font-semibold transition-all duration-200 select-none",
            )}
            style={
              isActive
                ? dark
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(86,164,91,0.30) 0%, rgba(86,164,91,0.15) 100%)",
                      border: "1px solid rgba(86,164,91,0.32)",
                      color: "white",
                      boxShadow:
                        "inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 8px rgba(0,0,0,0.20)",
                    }
                  : {
                      background: "white",
                      color: "oklch(0.28 0.09 145)",
                      boxShadow:
                        "0 1px 4px rgba(22,101,52,0.14), 0 0 0 1px rgba(22,101,52,0.08)",
                      border: "1px solid transparent",
                    }
                : dark
                ? { color: "rgba(255,255,255,0.45)", border: "1px solid transparent" }
                : { color: "oklch(0.455 0.016 220)", border: "1px solid transparent" }
            }
          >
            {tab.label}

            {/* Active underline bar vert→orange */}
            {isActive && (
              <span
                className="absolute bottom-[3px] left-1/2 h-[2.5px] w-5 -translate-x-1/2 rounded-full"
                style={{
                  background: "linear-gradient(90deg, #56a45b, #f4a321)",
                  boxShadow: "0 0 5px rgba(244,163,33,0.50)",
                }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
