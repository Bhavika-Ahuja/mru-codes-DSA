"use client";

import * as React from "react";
import {
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer,
} from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

function getCssVarColor(color?: string) {
  if (!color) return undefined;
  // Allow plain colors ("#fff") or CSS variables ("var(--chart-1)")
  return color;
}

export function ChartContainer({
  className,
  config,
  children,
}: {
  className?: string;
  config?: ChartConfig;
  children: React.ReactElement;
}) {
  // Expose config colors as CSS vars for easy reuse in charts
  const style = React.useMemo(() => {
    if (!config) return undefined;
    const vars: Record<string, string> = {};
    for (const [key, value] of Object.entries(config)) {
      if (value?.color) vars[`--color-${key}`] = getCssVarColor(value.color)!;
    }
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <div
      className={cn(
        "w-full [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-legend-item-text]:text-muted-foreground",
        className
      )}
      style={style}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function ChartTooltip(props: React.ComponentProps<typeof RechartsTooltip>) {
  return <RechartsTooltip {...props} />;
}

export function ChartLegend(props: React.ComponentProps<typeof RechartsLegend>) {
  return <RechartsLegend {...props} />;
}

