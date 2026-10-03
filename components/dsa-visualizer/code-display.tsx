"use client";

import { cn } from "@/lib/utils";

interface CodeDisplayProps {
  code: string;
  lineNumber?: number;
}

export function CodeDisplay({ code, lineNumber }: CodeDisplayProps) {
  const lines = code.split("\n");
  
  return (
    <div className="bg-secondary/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
      <div className="space-y-1">
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              "px-2 py-1 rounded transition-colors",
              lineNumber === idx + 1 && "bg-yellow-500/20 border-l-2 border-yellow-500"
            )}
          >
            <span className="text-muted-foreground mr-4 select-none">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className={cn(lineNumber === idx + 1 && "font-bold")}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
