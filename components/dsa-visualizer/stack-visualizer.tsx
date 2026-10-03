"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, RotateCcw, AlertCircle } from "lucide-react";
import { StackFrame } from "@/types/dsa-visualizer";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const MAX_STACK_SIZE = 10;

export function StackVisualizer() {
  const [stack, setStack] = useState<StackFrame[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [operation, setOperation] = useState<string>("");
  const [animating, setAnimating] = useState(false);

  const push = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    if (stack.length >= MAX_STACK_SIZE) {
      toast.error("Stack Overflow! Maximum size reached");
      return;
    }

    setAnimating(true);
    setOperation(`push(${inputValue})`);

    const newFrame: StackFrame = {
      value: inputValue,
      id: `${inputValue}-${Date.now()}`,
      state: "pushing",
    };

    setStack((prev) => [...prev, newFrame]);

    setTimeout(() => {
      setStack((prev) =>
        prev.map((frame) => ({
          ...frame,
          state: "default",
        }))
      );
      setAnimating(false);
      setOperation("");
      toast.success(`Pushed ${inputValue}`);
    }, 800);

    setInputValue("");
  };

  const pop = async () => {
    if (stack.length === 0) {
      toast.error("Stack Underflow! Stack is empty");
      return;
    }

    setAnimating(true);
    const topValue = stack[stack.length - 1].value;
    setOperation(`pop() → ${topValue}`);

    setStack((prev) =>
      prev.map((frame, idx) =>
        idx === prev.length - 1 ? { ...frame, state: "popping" } : frame
      )
    );

    setTimeout(() => {
      setStack((prev) => prev.slice(0, -1));
      setAnimating(false);
      setOperation("");
      toast.success(`Popped ${topValue}`);
    }, 800);
  };

  const peek = () => {
    if (stack.length === 0) {
      toast.error("Stack is empty");
      return;
    }

    const topValue = stack[stack.length - 1].value;
    setOperation(`peek() → ${topValue}`);

    setStack((prev) =>
      prev.map((frame, idx) =>
        idx === prev.length - 1 ? { ...frame, state: "highlight" } : frame
      )
    );

    setTimeout(() => {
      setStack((prev) =>
        prev.map((frame) => ({ ...frame, state: "default" }))
      );
      setOperation("");
    }, 1500);

    toast.success(`Top element: ${topValue}`);
  };

  const clear = () => {
    setStack([]);
    setOperation("clear()");
    setTimeout(() => setOperation(""), 500);
    toast.success("Stack cleared");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">Stack Operations</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <div className="flex gap-2">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter value"
                  onKeyDown={(e) => e.key === "Enter" && push()}
                  disabled={animating}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button 
                onClick={push} 
                className="w-full" 
                disabled={animating || stack.length >= MAX_STACK_SIZE}
              >
                <Plus className="h-4 w-4 mr-2" />
                Push
              </Button>
              <Button 
                onClick={pop} 
                variant="destructive" 
                className="w-full" 
                disabled={animating || stack.length === 0}
              >
                <Minus className="h-4 w-4 mr-2" />
                Pop
              </Button>
              <Button 
                onClick={peek} 
                variant="secondary" 
                className="w-full" 
                disabled={animating || stack.length === 0}
              >
                Peek
              </Button>
              <Button 
                onClick={clear} 
                variant="outline" 
                className="w-full" 
                disabled={animating || stack.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-bold">{stack.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Capacity:</span>
                <span className="font-bold">{MAX_STACK_SIZE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Empty:</span>
                <span className="font-bold">{stack.length === 0 ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Is Full:</span>
                <span className="font-bold">{stack.length === MAX_STACK_SIZE ? "Yes" : "No"}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Visualization */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Stack Visualization</h3>
            {operation && (
              <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded">
                {operation}
              </span>
            )}
          </div>

          <div className="min-h-[400px] flex flex-col justify-end items-center gap-2 p-4 bg-secondary/30 rounded-lg">
            {stack.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Stack is empty</p>
                  <p className="text-xs mt-1">Push elements to visualize</p>
                </div>
              </div>
            ) : (
              <>
                {[...stack].reverse().map((frame, idx) => (
                  <div
                    key={frame.id}
                    className={cn(
                      "w-full max-w-xs h-16 flex items-center justify-center",
                      "border-2 rounded-lg font-bold text-lg transition-all duration-500",
                      {
                        "bg-primary text-primary-foreground border-primary": frame.state === "default",
                        "bg-green-500 text-white border-green-600 scale-105": frame.state === "pushing",
                        "bg-red-500 text-white border-red-600 scale-95 opacity-50": frame.state === "popping",
                        "bg-yellow-500 text-white border-yellow-600 scale-110 animate-pulse": frame.state === "highlight",
                      }
                    )}
                  >
                    {frame.value}
                  </div>
                ))}
                <div className="w-full max-w-xs border-t-4 border-foreground/20 pt-2 text-center text-xs text-muted-foreground">
                  ↑ TOP
                </div>
              </>
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
              <span className="text-muted-foreground">Push:</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pop:</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Peek:</span>
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
            <li>• LIFO (Last In First Out)</li>
            <li>• Access only from top</li>
            <li>• Fixed or dynamic size</li>
            <li>• Sequential operations</li>
          </ul>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Use Cases
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Function call stack</li>
            <li>• Undo/Redo operations</li>
            <li>• Expression evaluation</li>
            <li>• Browser history</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
