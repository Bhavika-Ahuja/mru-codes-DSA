"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  SkipBack,
  Shuffle
} from "lucide-react";
import { linearSearch, binarySearch, jumpSearch } from "@/lib/dsa-algorithms/searching";
import { AnimationStep, AlgorithmSpeed } from "@/types/dsa-visualizer";
import { ArrayVisualization } from "./array-visualization";
import { CodeDisplay } from "./code-display";
import { StepDescription } from "./step-description";
import { ComplexityAnalysis } from "./complexity-analysis";
import { CODE_TEMPLATES } from "@/lib/dsa-algorithms/code-templates";

const algorithms = [
  { value: "linear", label: "Linear Search" },
  { value: "binary", label: "Binary Search" },
  { value: "jump", label: "Jump Search" },
];

const speedMap: Record<AlgorithmSpeed, number> = {
  slow: 1500,
  normal: 750,
  fast: 250,
};

export function SearchingVisualizer() {
  const [algorithm, setAlgorithm] = useState("linear");
  const [array, setArray] = useState<number[]>([5, 12, 23, 34, 45, 56, 67, 78, 89, 90]);
  const [target, setTarget] = useState(45);
  const [customInput, setCustomInput] = useState("5, 12, 23, 34, 45, 56, 67, 78, 89, 90");
  const [steps, setSteps] = useState<AnimationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AlgorithmSpeed>("normal");
  const [arraySize, setArraySize] = useState(10);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, speedMap[speed]);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, currentStep, steps.length, speed]);

  const generateRandomArray = () => {
    const newArray = Array.from({ length: arraySize }, () => Math.floor(Math.random() * 100) + 1)
      .sort((a, b) => a - b);
    setArray(newArray);
    setCustomInput(newArray.join(", "));
    setTarget(newArray[Math.floor(Math.random() * newArray.length)]);
    setSteps([]);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleCustomInput = () => {
    try {
      const values = customInput
        .split(",")
        .map((v) => parseInt(v.trim()))
        .filter((v) => !isNaN(v));
      
      if (values.length > 0) {
        const sorted = algorithm !== "linear" ? [...values].sort((a, b) => a - b) : values;
        setArray(sorted);
        if (algorithm !== "linear" && JSON.stringify(sorted) !== JSON.stringify(values)) {
          setCustomInput(sorted.join(", "));
        }
        setSteps([]);
        setCurrentStep(0);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Invalid input", error);
    }
  };

  const visualize = () => {
    setIsPlaying(false);
    setCurrentStep(0);

    // Ensure array is sorted for binary and jump search
    let searchArray = [...array];
    if (algorithm !== "linear") {
      searchArray.sort((a, b) => a - b);
      setArray(searchArray);
      setCustomInput(searchArray.join(", "));
    }

    let result: AnimationStep[] = [];
    
    switch (algorithm) {
      case "linear":
        result = linearSearch(searchArray, target);
        break;
      case "binary":
        result = binarySearch(searchArray, target);
        break;
      case "jump":
        result = jumpSearch(searchArray, target);
        break;
    }

    setSteps(result);
  };

  const togglePlayPause = () => {
    if (steps.length === 0) {
      visualize();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const reset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
    setSteps([]);
  };

  const stepForward = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="space-y-6">
          {/* Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Algorithm</Label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {algorithms.map((algo) => (
                    <SelectItem key={algo.value} value={algo.value}>
                      {algo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Speed</Label>
              <Select value={speed} onValueChange={(v) => setSpeed(v as AlgorithmSpeed)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slow">Slow</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="fast">Fast</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Value</Label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(parseInt(e.target.value) || 0)}
                placeholder="Target"
              />
            </div>

            <div className="space-y-2">
              <Label>Array Size: {arraySize}</Label>
              <Slider
                value={[arraySize]}
                onValueChange={(v) => setArraySize(v[0])}
                min={5}
                max={20}
                step={1}
                className="pt-2"
              />
            </div>
          </div>

          {/* Info */}
          {algorithm !== "linear" && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
              <strong>Note:</strong> {algorithm === "binary" ? "Binary" : "Jump"} Search requires a sorted array. 
              The array will be automatically sorted.
            </div>
          )}

          {/* Custom Input */}
          <div className="space-y-2">
            <Label>Array (comma-separated)</Label>
            <div className="flex gap-2">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 5, 12, 23, 34, 45"
              />
              <Button onClick={handleCustomInput} variant="secondary">
                Set
              </Button>
              <Button onClick={generateRandomArray} variant="outline">
                <Shuffle className="h-4 w-4 mr-2" />
                Random
              </Button>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button onClick={reset} variant="outline" size="icon" disabled={steps.length === 0}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button onClick={stepBackward} variant="outline" size="icon" disabled={currentStep === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button onClick={togglePlayPause} size="icon" className="h-12 w-12">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button onClick={stepForward} variant="outline" size="icon" disabled={currentStep >= steps.length - 1}>
              <SkipForward className="h-4 w-4" />
            </Button>
            <Button onClick={visualize} variant="outline">
              Visualize
            </Button>
          </div>

          {/* Progress */}
          {steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Step {currentStep + 1} of {steps.length}</span>
                <span>{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
              </div>
              <Slider
                value={[currentStep]}
                onValueChange={(v) => {
                  setIsPlaying(false);
                  setCurrentStep(v[0]);
                }}
                min={0}
                max={steps.length - 1}
                step={1}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Visualization Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Array Visualization</h3>
          <div className="mb-4 text-center">
            <span className="text-sm text-muted-foreground">Searching for: </span>
            <span className="text-2xl font-bold text-primary">{target}</span>
          </div>
          <ArrayVisualization 
            elements={currentStepData?.array || array.map((val, idx) => ({ 
              value: val, 
              id: `${val}-${idx}`, 
              state: "default" as const 
            }))} 
          />
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Code</h3>
          <CodeDisplay 
            code={CODE_TEMPLATES[algorithm] || "// Select algorithm and click Visualize"}
            lineNumber={currentStepData?.lineNumber}
          />
        </Card>
      </div>

      {/* Step Description */}
      {currentStepData && (
        <StepDescription 
          description={currentStepData.description}
          variables={currentStepData.variables}
        />
      )}

      {/* Complexity Analysis */}
      {currentStepData?.complexity && (
        <ComplexityAnalysis complexity={currentStepData.complexity} />
      )}
    </div>
  );
}
