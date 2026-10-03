"use client";

import { Card } from "@/components/ui/card";
import { Info } from "lucide-react";

interface StepDescriptionProps {
  description: string;
  variables?: Record<string, unknown>;
}

export function StepDescription({ description, variables }: StepDescriptionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div className="space-y-3 flex-1">
          <p className="text-lg">{description}</p>
          
          {variables && Object.keys(variables).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(variables).map(([key, value]) => (
                <div
                  key={key}
                  className="inline-flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-md text-sm font-mono"
                >
                  <span className="text-muted-foreground">{key}:</span>
                  <span className="font-bold text-primary">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
