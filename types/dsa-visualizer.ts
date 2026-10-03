export interface ArrayElement {
  value: number;
  id: string;
  state: "default" | "comparing" | "swapping" | "sorted" | "pivot" | "found" | "notfound";
}

export interface AnimationStep {
  array: ArrayElement[];
  highlightIndices?: number[];
  description: string;
  code?: string;
  lineNumber?: number;
  complexity?: string;
  variables?: Record<string, unknown>;
}

export interface StackFrame {
  value: number | string;
  id: string;
  state: "default" | "pushing" | "popping" | "highlight";
}

export interface QueueElement {
  value: number | string;
  id: string;
  state: "default" | "enqueue" | "dequeue" | "highlight";
}

export interface ListNode {
  value: number | string;
  id: string;
  next: string | null;
  state: "default" | "highlight" | "inserting" | "deleting" | "searching";
}

export type AlgorithmSpeed = "slow" | "normal" | "fast";

export interface VisualizerControls {
  isPlaying: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  speed: AlgorithmSpeed;
}

export interface Challenge {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
