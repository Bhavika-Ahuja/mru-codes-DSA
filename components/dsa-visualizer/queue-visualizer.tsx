"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, RotateCcw, AlertCircle, ArrowRight } from "lucide-react";
import { QueueElement } from "@/types/dsa-visualizer";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const MAX_QUEUE_SIZE = 10;

export function QueueVisualizer() {
  const [queue, setQueue] = useState<QueueElement[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [operation, setOperation] = useState<string>("");
  const [animating, setAnimating] = useState(false);

  const enqueue = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    if (queue.length >= MAX_QUEUE_SIZE) {
      toast.error("Queue Overflow! Maximum size reached");
      return;
    }

    setAnimating(true);
    setOperation(`enqueue(${inputValue})`);

    const newElement: QueueElement = {
      value: inputValue,
      id: `${inputValue}-${Date.now()}`,
      state: "enqueue",
    };

    setQueue((prev) => [...prev, newElement]);

    setTimeout(() => {
      setQueue((prev) =>
        prev.map((el) => ({
          ...el,
          state: "default",
        }))
      );
      setAnimating(false);
      setOperation("");
      toast.success(`Enqueued ${inputValue}`);
    }, 800);

    setInputValue("");
  };

  const dequeue = async () => {
    if (queue.length === 0) {
      toast.error("Queue Underflow! Queue is empty");
      return;
    }

    setAnimating(true);
    const frontValue = queue[0].value;
    setOperation(`dequeue() → ${frontValue}`);

    setQueue((prev) =>
      prev.map((el, idx) =>
        idx === 0 ? { ...el, state: "dequeue" } : el
      )
    );

    setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      setAnimating(false);
      setOperation("");
      toast.success(`Dequeued ${frontValue}`);
    }, 800);
  };

  const front = () => {
    if (queue.length === 0) {
      toast.error("Queue is empty");
      return;
    }

    const frontValue = queue[0].value;
    setOperation(`front() → ${frontValue}`);

    setQueue((prev) =>
      prev.map((el, idx) =>
        idx === 0 ? { ...el, state: "highlight" } : el
      )
    );

    setTimeout(() => {
      setQueue((prev) =>
        prev.map((el) => ({ ...el, state: "default" }))
      );
      setOperation("");
    }, 1500);

    toast.success(`Front element: ${frontValue}`);
  };

  const rear = () => {
    if (queue.length === 0) {
      toast.error("Queue is empty");
      return;
    }

    const rearValue = queue[queue.length - 1].value;
    setOperation(`rear() → ${rearValue}`);

    setQueue((prev) =>
      prev.map((el, idx) =>
        idx === prev.length - 1 ? { ...el, state: "highlight" } : el
      )
    );

    setTimeout(() => {
      setQueue((prev) =>
        prev.map((el) => ({ ...el, state: "default" }))
      );
      setOperation("");
    }, 1500);

    toast.success(`Rear element: ${rearValue}`);
  };

  const clear = () => {
    setQueue([]);
    setOperation("clear()");
    setTimeout(() => setOperation(""), 500);
    toast.success("Queue cleared");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Queue Operations</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter value"
                  onKeyDown={(e) => e.key === "Enter" && enqueue()}
                  disabled={animating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={enqueue} 
                className="w-full" 
                disabled={animating || queue.length >= MAX_QUEUE_SIZE}
              >
                <Plus className="h-4 w-4 mr-2" />
                Enqueue
              </Button>
              <Button 
                onClick={dequeue} 
                variant="destructive" 
                className="w-full" 
                disabled={animating || queue.length === 0}
              >
                <Minus className="h-4 w-4 mr-2" />
                Dequeue
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={front} 
                  variant="secondary" 
                  className="w-full" 
                  disabled={animating || queue.length === 0}
                >
                  Front
                </Button>
                <Button 
                  onClick={rear} 
                  variant="secondary" 
                  className="w-full" 
                  disabled={animating || queue.length === 0}
                >
                  Rear
                </Button>
              </div>
              <Button 
                onClick={clear} 
                variant="outline" 
                className="w-full" 
                disabled={animating || queue.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-bold">{queue.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-bold">{MAX_QUEUE_SIZE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Empty:</span>
                <span className="font-bold">{queue.length === 0 ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Full:</span>
                <span className="font-bold">{queue.length === MAX_QUEUE_SIZE ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Visualization */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Queue Visualization</h3>
            {operation && (
              <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded">
                {operation}
              </span>
            )}
          </div>

          <div className="min-h-[400px] flex flex-col justify-center p-4 bg-secondary/30 rounded-lg">
            {queue.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Queue is empty</p>
                  <p className="text-xs mt-1">Enqueue elements to visualize</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold">FRONT</span>
                  <ArrowRight className="h-3 w-3" />
                </div>

                <div className="flex flex-wrap items-center gap-2 justify-start">
                  {queue.map((element, idx) => (
                    <div key={element.id} className="flex items-center gap-2">
                      <div
                        className={cn(
                          "h-16 w-24 flex items-center justify-center",
                          "border-2 rounded-lg font-bold text-lg transition-all duration-500",
                          {
                            "bg-primary text-primary-foreground border-primary": element.state === "default",
                            "bg-green-500 text-white border-green-600 scale-110": element.state === "enqueue",
                            "bg-red-500 text-white border-red-600 scale-75 opacity-50": element.state === "dequeue",
                            "bg-yellow-500 text-white border-yellow-600 scale-110 animate-pulse": element.state === "highlight",
                          }
                        )}
                      >
                        {element.value}
                      </div>
                      {idx < queue.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                  <ArrowRight className="h-3 w-3" />
                  <span className="font-semibold">REAR</span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">⏱️</span>
            Time Complexity
          </h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enqueue:</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dequeue:</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Front/Rear:</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Properties
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• FIFO (First In First Out)</li>
            <li>• Two pointers: front & rear</li>
            <li>• Linear data structure</li>
            <li>• Sequential access</li>
          </ul>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Use Cases
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Task scheduling</li>
            <li>• Printer job queue</li>
            <li>• BFS traversal</li>
            <li>• Request handling</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
