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
import { bubbleSort, selectionSort, insertionSort, quickSort, mergeSort } from "@/lib/dsa-algorithms/sorting";
import { AnimationStep, AlgorithmSpeed } from "@/types/dsa-visualizer";
import { ArrayVisualization } from "./array-visualization";
import { CodeDisplay } from "./code-display";
import { StepDescription } from "./step-description";
import { ComplexityAnalysis } from "./complexity-analysis";
import { CODE_TEMPLATES } from "@/lib/dsa-algorithms/code-templates";

const algorithms = [
  { value: "bubble", label: "Bubble Sort" },
  { value: "selection", label: "Selection Sort" },
  { value: "insertion", label: "Insertion Sort" },
  { value: "quick", label: "Quick Sort" },
  { value: "merge", label: "Merge Sort" },
];

const speedMap: Record<AlgorithmSpeed, number> = {
  slow: 1500,
  normal: 750,
  fast: 250,
};

export function SortingVisualizer() {
  const [algorithm, setAlgorithm] = useState("bubble");
  const [array, setArray] = useState<number[]>([64, 34, 25, 12, 22, 11, 90]);
  const [customInput, setCustomInput] = useState("64, 34, 25, 12, 22, 11, 90");
  const [steps, setSteps] = useState<AnimationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<AlgorithmSpeed>("normal");
  const [arraySize, setArraySize] = useState(7);
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
    const newArray = Array.from({ length: arraySize }, () => Math.floor(Math.random() * 100) + 1);
    setArray(newArray);
    setCustomInput(newArray.join(", "));
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
        setArray(values);
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

    let result: AnimationStep[] = [];
    
    switch (algorithm) {
      case "bubble":
        result = bubbleSort([...array]);
        break;
      case "selection":
        result = selectionSort([...array]);
        break;
      case "insertion":
        result = insertionSort([...array]);
        break;
      case "quick":
        result = quickSort([...array]);
        break;
      case "merge":
        result = mergeSort([...array]);
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
              <Label>Array Size: {arraySize}</Label>
              <Slider
                value={[arraySize]}
                onValueChange={(v) => setArraySize(v[0])}
                min={5}
                max={15}
                step={1}
                className="pt-2"
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button onClick={generateRandomArray} variant="outline" className="w-full">
                <Shuffle className="h-4 w-4 mr-2" />
                Random Array
              </Button>
            </div>
          </div>

          {/* Custom Input */}
          <div className="space-y-2">
            <Label>Custom Input (comma-separated)</Label>
            <div className="flex gap-2">
              <Input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="e.g., 64, 34, 25, 12, 22"
              />
              <Button onClick={handleCustomInput} variant="secondary">
                Set
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
