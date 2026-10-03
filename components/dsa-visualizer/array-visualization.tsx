"use client";

import { ArrayElement } from "@/types/dsa-visualizer";
import { cn } from "@/lib/utils";

interface ArrayVisualizationProps {
  elements: ArrayElement[];
  maxHeight?: number;
}

export function ArrayVisualization({ elements, maxHeight = 200 }: ArrayVisualizationProps) {
  if (elements.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data to visualize
      </div>
    );
  }

  const maxValue = Math.max(...elements.map((el) => el.value));
  
  return (
    <div className="flex items-end justify-center gap-1 h-64 p-4">
      {elements.map((element) => {
        const height = (element.value / maxValue) * maxHeight;
        
        return (
          <div
            key={element.id}
            className="flex flex-col items-center gap-2 flex-1 min-w-0"
          >
            <div
              className={cn(
                "w-full rounded-t-md transition-all duration-300 flex items-end justify-center pb-1",
                "text-[10px] font-bold text-white",
                {
                  "bg-primary": element.state === "default",
                  "bg-yellow-500 scale-105": element.state === "comparing",
                  "bg-red-500 scale-110": element.state === "swapping",
                  "bg-green-500": element.state === "sorted",
                  "bg-purple-500 scale-105": element.state === "pivot",
                  "bg-emerald-500 scale-110 ring-4 ring-emerald-300": element.state === "found",
                  "bg-gray-400 opacity-50": element.state === "notfound",
                }
              )}
              style={{ height: `${height}px`, minHeight: "30px" }}
            >
              {element.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
