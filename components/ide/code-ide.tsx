"use client";

import { useCallback, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Play, Loader2, ChevronDown, ChevronUp, Terminal, Code2, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const SAMPLES = {
  c: `#include <stdio.h>

int main() {
    int x;
    scanf("%d", &x);
    printf("x is %d\\n", x);
    return 0;
}
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
};

type Lang = "c" | "cpp";

export function CodeIde() {
  const { resolvedTheme } = useTheme();
  const [language, setLanguage] = useState<Lang>("cpp");
  const [code, setCode] = useState(SAMPLES.cpp);
  const [stdin, setStdin] = useState("");
  const [showStdin, setShowStdin] = useState(true);
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<{
    stdout: string;
    stderr: string;
    compileStderr: string;
    compileCode: number;
    runCode: number;
  } | null>(null);

  const handleRun = useCallback(async () => {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code, stdin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Run failed");
        setOutput({
          stdout: "",
          stderr: data.error ?? "Unknown error",
          compileStderr: "",
          compileCode: -1,
          runCode: -1,
        });
        return;
      }
      setOutput({
        stdout: data.stdout ?? "",
        stderr: data.stderr ?? "",
        compileStderr: data.compileStderr ?? "",
        compileCode: data.compileCode ?? -1,
        runCode: data.runCode ?? -1,
      });
    } catch {
      toast.error("Failed to run code");
      setOutput({
        stdout: "",
        stderr: "Network error",
        compileStderr: "",
        compileCode: -1,
        runCode: -1,
      });
    } finally {
      setRunning(false);
    }
  }, [language, code, stdin]);

  const handleReset = useCallback(() => {
    setCode(SAMPLES[language]);
    setOutput(null);
    setStdin("");
  }, [language]);

  const handleSaveLocally = useCallback(() => {
    const ext = language === "cpp" ? "cpp" : "c";
    const filename = `main.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Saved as ${filename}`);
  }, [language, code]);

  const handleLanguageChange = (l: Lang) => {
    setLanguage(l);
    setCode(SAMPLES[l]);
    setOutput(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!running) handleRun();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleRun, running]);

  const monacoLang = language === "cpp" ? "cpp" : "c";
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "light";
  const outputBg = resolvedTheme === "dark" ? "bg-[#1e1e1e]" : "bg-zinc-100";

  return (
    <div className="min-h-[55vh] flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-1.5">
          <Code2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Language</span>
          <Select value={language} onValueChange={(v) => handleLanguageChange(v as Lang)}>
            <SelectTrigger className="h-8 w-[100px] border-0 bg-transparent shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="c">C</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleRun}
          disabled={running}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run
        </Button>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        <Button variant="outline" size="sm" onClick={handleSaveLocally} className="gap-2" title="Save as .c / .cpp file">
          <Download className="h-4 w-4" />
          Save as file
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowStdin((s) => !s)}
          className="gap-2 text-muted-foreground"
        >
          {showStdin ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Stdin
        </Button>
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Ctrl+Enter to run
        </span>
      </div>

      {/* Editor + Output */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[400px]">
        <Card className="flex flex-col min-h-0 border-2 border-border/50 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center gap-2">
            <Code2 className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Editor</CardTitle>
            <span className="text-xs text-muted-foreground ml-auto">main.{language === "cpp" ? "cpp" : "c"}</span>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 flex flex-col">
            {showStdin && (
              <div className="px-4 py-2 border-b bg-muted/20">
                <p className="text-xs font-medium text-muted-foreground mb-1">Stdin (optional)</p>
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Input to your program..."
                  className="w-full h-20 rounded border bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                  spellCheck={false}
                />
              </div>
            )}
            <div className="flex-1 min-h-[280px]">
              <MonacoEditor
                height="100%"
                language={monacoLang}
                value={code}
                onChange={(v) => setCode(v ?? "")}
                theme={monacoTheme}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  padding: { top: 12 },
                  wordWrap: "on",
                  automaticLayout: true,
                }}
                loading={
                  <div className={cn("flex items-center justify-center h-64 text-muted-foreground", outputBg)}>
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col min-h-0 border-2 border-border/50 overflow-hidden">
          <CardHeader className="py-3 px-4 border-b flex flex-row items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-sm font-semibold">Output</CardTitle>
            {output && (
              <span
                className={cn(
                  "text-xs ml-auto font-medium",
                  output.compileCode !== 0 ? "text-destructive" : output.runCode !== 0 ? "text-amber-600" : "text-emerald-600"
                )}
              >
                {output.compileCode !== 0 ? "Compile error" : output.runCode !== 0 ? `Exit ${output.runCode}` : "Success"}
              </span>
            )}
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 h-full">
              <pre className={cn("p-4 text-sm font-mono whitespace-pre-wrap wrap-break-word min-h-full", outputBg, "text-foreground")}>
                {!output ? (
                  <span className="text-muted-foreground">Run your code to see output here.</span>
                ) : (
                  <>
                    {output.compileStderr && (
                      <span className="text-red-400 block mb-2">{"/* compile stderr */"}</span>
                    )}
                    {output.compileStderr && (
                      <span className="text-red-400 block mb-3">{output.compileStderr}</span>
                    )}
                    {output.stderr && (
                      <span className="text-amber-400 block mb-2">{"/* stderr */"}</span>
                    )}
                    {output.stderr && <span className="text-amber-400 block mb-3">{output.stderr}</span>}
                    {output.stdout && <span className="text-foreground">{output.stdout}</span>}
                    {!output.stdout && !output.stderr && !output.compileStderr && (
                      <span className="text-muted-foreground">No output.</span>
                    )}
                  </>
                )}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
