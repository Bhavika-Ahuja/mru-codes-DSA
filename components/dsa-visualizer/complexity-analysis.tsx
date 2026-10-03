"use client";

import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface ComplexityAnalysisProps {
  complexity: string;
}

export function ComplexityAnalysis({ complexity }: ComplexityAnalysisProps) {
  return (
    <Card className="p-6 bg-gradient-to-r from-primary/10 to-purple-500/10">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <h3 className="font-semibold mb-1">Complexity Analysis</h3>
          <p className="text-sm text-muted-foreground font-mono">{complexity}</p>
        </div>
      </div>
    </Card>
  );
}
