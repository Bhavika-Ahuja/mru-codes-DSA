"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SortingVisualizer } from "./sorting-visualizer";
import { SearchingVisualizer } from "./searching-visualizer";
import { StackVisualizer } from "./stack-visualizer";
import { QueueVisualizer } from "./queue-visualizer";
import { LinkedListVisualizer } from "./linked-list-visualizer";
import { 
  ArrowUpDown, 
  Search, 
  Layers, 
  ListOrdered, 
  GitBranch 
} from "lucide-react";

const categories = [
  { id: "sorting", label: "Sorting", icon: ArrowUpDown },
  { id: "searching", label: "Searching", icon: Search },
  { id: "stack", label: "Stack", icon: Layers },
  { id: "queue", label: "Queue", icon: ListOrdered },
  { id: "linkedlist", label: "Linked List", icon: GitBranch },
];

export function DSAVisualizer() {
  const [activeCategory, setActiveCategory] = useState("sorting");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DSA Visualizer</h1>
        <p className="text-muted-foreground mt-1">
          Interactive visualizations to understand data structures and algorithms
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          {categories.map((cat) => (
            <TabsTrigger
              key={cat.id}
              value={cat.id}
              className="flex items-center gap-2 py-3"
            >
              <cat.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{cat.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-6">
          <TabsContent value="sorting" className="m-0">
            <SortingVisualizer />
          </TabsContent>
          <TabsContent value="searching" className="m-0">
            <SearchingVisualizer />
          </TabsContent>
          <TabsContent value="stack" className="m-0">
            <StackVisualizer />
          </TabsContent>
          <TabsContent value="queue" className="m-0">
            <QueueVisualizer />
          </TabsContent>
          <TabsContent value="linkedlist" className="m-0">
            <LinkedListVisualizer />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
