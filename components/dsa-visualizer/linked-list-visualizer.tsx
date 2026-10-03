"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, RotateCcw, AlertCircle, ArrowRight, Search } from "lucide-react";
import { ListNode } from "@/types/dsa-visualizer";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

export function LinkedListVisualizer() {
  const [nodes, setNodes] = useState<ListNode[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [positionValue, setPositionValue] = useState("0");
  const [searchValue, setSearchValue] = useState("");
  const [operation, setOperation] = useState<string>("");
  const [animating, setAnimating] = useState(false);

  const insertAtEnd = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    setAnimating(true);
    setOperation(`insertAtEnd(${inputValue})`);

    const newNode: ListNode = {
      value: inputValue,
      id: `node-${Date.now()}`,
      next: null,
      state: "inserting",
    };

    // Update last node's next pointer
    if (nodes.length > 0) {
      setNodes((prev) =>
        prev.map((node, idx) =>
          idx === prev.length - 1 ? { ...node, next: newNode.id } : node
        )
      );
    }

    setNodes((prev) => [...prev, newNode]);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => ({ ...node, state: "default" }))
      );
      setAnimating(false);
      setOperation("");
      toast.success(`Inserted ${inputValue} at end`);
    }, 800);

    setInputValue("");
  };

  const insertAtBeginning = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    setAnimating(true);
    setOperation(`insertAtBeginning(${inputValue})`);

    const newNode: ListNode = {
      value: inputValue,
      id: `node-${Date.now()}`,
      next: nodes.length > 0 ? nodes[0].id : null,
      state: "inserting",
    };

    setNodes((prev) => [newNode, ...prev]);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => ({ ...node, state: "default" }))
      );
      setAnimating(false);
      setOperation("");
      toast.success(`Inserted ${inputValue} at beginning`);
    }, 800);

    setInputValue("");
  };

  const insertAtPosition = async () => {
    if (!inputValue.trim()) {
      toast.error("Please enter a value");
      return;
    }

    const position = parseInt(positionValue);
    if (isNaN(position) || position < 0 || position > nodes.length) {
      toast.error(`Invalid position. Enter 0 to ${nodes.length}`);
      return;
    }

    setAnimating(true);
    setOperation(`insertAtPosition(${inputValue}, ${position})`);

    const newNode: ListNode = {
      value: inputValue,
      id: `node-${Date.now()}`,
      next: position < nodes.length ? nodes[position].id : null,
      state: "inserting",
    };

    const newNodes = [...nodes];
    newNodes.splice(position, 0, newNode);

    // Update previous node's next pointer
    if (position > 0) {
      newNodes[position - 1] = {
        ...newNodes[position - 1],
        next: newNode.id,
      };
    }

    setNodes(newNodes);

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => ({ ...node, state: "default" }))
      );
      setAnimating(false);
      setOperation("");
      toast.success(`Inserted ${inputValue} at position ${position}`);
    }, 800);

    setInputValue("");
  };

  const deleteFromBeginning = async () => {
    if (nodes.length === 0) {
      toast.error("List is empty");
      return;
    }

    setAnimating(true);
    const deletedValue = nodes[0].value;
    setOperation(`deleteFromBeginning() → ${deletedValue}`);

    setNodes((prev) =>
      prev.map((node, idx) =>
        idx === 0 ? { ...node, state: "deleting" } : node
      )
    );

    setTimeout(() => {
      setNodes((prev) => prev.slice(1));
      setAnimating(false);
      setOperation("");
      toast.success(`Deleted ${deletedValue} from beginning`);
    }, 800);
  };

  const deleteFromEnd = async () => {
    if (nodes.length === 0) {
      toast.error("List is empty");
      return;
    }

    setAnimating(true);
    const deletedValue = nodes[nodes.length - 1].value;
    setOperation(`deleteFromEnd() → ${deletedValue}`);

    setNodes((prev) =>
      prev.map((node, idx) =>
        idx === prev.length - 1 ? { ...node, state: "deleting" } : node
      )
    );

    setTimeout(() => {
      const newNodes = nodes.slice(0, -1);
      if (newNodes.length > 0) {
        newNodes[newNodes.length - 1] = {
          ...newNodes[newNodes.length - 1],
          next: null,
        };
      }
      setNodes(newNodes);
      setAnimating(false);
      setOperation("");
      toast.success(`Deleted ${deletedValue} from end`);
    }, 800);
  };

  const search = async () => {
    if (!searchValue.trim()) {
      toast.error("Please enter a search value");
      return;
    }

    setAnimating(true);
    setOperation(`search(${searchValue})`);

    let found = false;
    let foundIndex = -1;

    for (let i = 0; i < nodes.length; i++) {
      setNodes((prev) =>
        prev.map((node, idx) =>
          idx === i ? { ...node, state: "searching" } : { ...node, state: "default" }
        )
      );

      await new Promise((resolve) => setTimeout(resolve, 500));

      if (nodes[i].value.toString() === searchValue) {
        found = true;
        foundIndex = i;
        setNodes((prev) =>
          prev.map((node, idx) =>
            idx === i ? { ...node, state: "highlight" } : { ...node, state: "default" }
          )
        );
        break;
      }
    }

    setTimeout(() => {
      setNodes((prev) =>
        prev.map((node) => ({ ...node, state: "default" }))
      );
      setAnimating(false);
      setOperation("");
      if (found) {
        toast.success(`Found ${searchValue} at position ${foundIndex}`);
      } else {
        toast.error(`${searchValue} not found in list`);
      }
    }, 1500);
  };

  const clear = () => {
    setNodes([]);
    setOperation("clear()");
    setTimeout(() => setOperation(""), 500);
    toast.success("List cleared");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <Card className="p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold mb-4">List Operations</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Enter value"
                disabled={animating}
              />
            </div>

            <div className="space-y-2">
              <Button 
                onClick={insertAtBeginning} 
                className="w-full" 
                size="sm"
                disabled={animating}
              >
                <Plus className="h-3 w-3 mr-2" />
                Insert at Beginning
              </Button>
              <Button 
                onClick={insertAtEnd} 
                className="w-full" 
                size="sm"
                disabled={animating}
              >
                <Plus className="h-3 w-3 mr-2" />
                Insert at End
              </Button>

              <div className="flex gap-2">
                <Input
                  type="number"
                  value={positionValue}
                  onChange={(e) => setPositionValue(e.target.value)}
                  placeholder="Pos"
                  className="w-20"
                  disabled={animating}
                />
                <Button 
                  onClick={insertAtPosition} 
                  className="flex-1" 
                  size="sm"
                  disabled={animating}
                >
                  Insert at Position
                </Button>
              </div>

              <div className="border-t pt-2 space-y-2">
                <Button 
                  onClick={deleteFromBeginning} 
                  variant="destructive" 
                  className="w-full" 
                  size="sm"
                  disabled={animating || nodes.length === 0}
                >
                  <Minus className="h-3 w-3 mr-2" />
                  Delete from Beginning
                </Button>
                <Button 
                  onClick={deleteFromEnd} 
                  variant="destructive" 
                  className="w-full" 
                  size="sm"
                  disabled={animating || nodes.length === 0}
                >
                  <Minus className="h-3 w-3 mr-2" />
                  Delete from End
                </Button>
              </div>

              <div className="border-t pt-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    placeholder="Search"
                    disabled={animating}
                  />
                  <Button 
                    onClick={search} 
                    variant="secondary" 
                    size="icon"
                    disabled={animating || nodes.length === 0}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button 
                onClick={clear} 
                variant="outline" 
                className="w-full" 
                size="sm"
                disabled={animating || nodes.length === 0}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            <div className="pt-4 border-t space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Length:</span>
                <span className="font-bold">{nodes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Head:</span>
                <span className="font-bold">{nodes.length > 0 ? nodes[0].value : "NULL"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tail:</span>
                <span className="font-bold">
                  {nodes.length > 0 ? nodes[nodes.length - 1].value : "NULL"}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Visualization */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Linked List Visualization</h3>
            {operation && (
              <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1 rounded">
                {operation}
              </span>
            )}
          </div>

          <div className="min-h-[400px] flex flex-col justify-center p-4 bg-secondary/30 rounded-lg overflow-x-auto">
            {nodes.length === 0 ? (
              <div className="flex items-center justify-center text-muted-foreground h-64">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>List is empty</p>
                  <p className="text-xs mt-1">Insert nodes to visualize</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-semibold px-2 py-1 bg-secondary rounded">HEAD</span>
                  <ArrowRight className="h-3 w-3" />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {nodes.map((node, idx) => (
                    <div key={node.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex items-center gap-2 p-3 border-2 rounded-lg transition-all duration-500",
                          {
                            "bg-primary/10 border-primary": node.state === "default",
                            "bg-green-500/20 border-green-600 scale-110": node.state === "inserting",
                            "bg-red-500/20 border-red-600 scale-75 opacity-50": node.state === "deleting",
                            "bg-yellow-500/20 border-yellow-600 scale-105": node.state === "searching",
                            "bg-blue-500/20 border-blue-600 scale-110 animate-pulse": node.state === "highlight",
                          }
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">data</span>
                          <span className="font-bold text-lg">{node.value}</span>
                        </div>
                        <div className="w-px h-12 bg-border" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-muted-foreground">next</span>
                          <ArrowRight className="h-5 w-5 text-primary" />
                        </div>
                      </div>

                      {idx < nodes.length - 1 && (
                        <div className="flex items-center gap-1">
                          <div className="w-8 h-0.5 bg-primary" />
                          <ArrowRight className="h-4 w-4 text-primary" />
                        </div>
                      )}

                      {idx === nodes.length - 1 && (
                        <div className="px-3 py-1 bg-secondary border rounded text-xs font-mono text-muted-foreground">
                          NULL
                        </div>
                      )}
                    </div>
                  ))}
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
              <span className="text-muted-foreground">Insert (beginning):</span>
              <code className="font-mono font-bold">O(1)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Insert (end):</span>
              <code className="font-mono font-bold">O(n)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delete:</span>
              <code className="font-mono font-bold">O(n)</code>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Search:</span>
              <code className="font-mono font-bold">O(n)</code>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">📚</span>
            Properties
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Dynamic size</li>
            <li>• Sequential access</li>
            <li>• Non-contiguous memory</li>
            <li>• Efficient insertions</li>
          </ul>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-600/10">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Use Cases
          </h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Dynamic memory allocation</li>
            <li>• Implementing stacks/queues</li>
            <li>• Music playlists</li>
            <li>• Image viewer navigation</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
