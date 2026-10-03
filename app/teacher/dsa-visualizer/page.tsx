import { Metadata } from "next";
import { DSAVisualizer } from "@/components/dsa-visualizer/dsa-visualizer";

export const metadata: Metadata = {
  title: "DSA Visualizer | Interactive Algorithm Learning",
  description: "Visualize and understand data structures and algorithms with interactive animations",
};

export default function DSAVisualizerPage() {
  return <DSAVisualizer />;
}
