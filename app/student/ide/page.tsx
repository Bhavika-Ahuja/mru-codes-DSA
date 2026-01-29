import { redirect } from "next/navigation";
import { getProfile } from "@/lib/supabase/server";
import { CodeIde } from "@/components/ide/code-ide";
import { Code2 } from "lucide-react";

export default async function StudentIdePage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role !== "student") {
    redirect("/teacher/dashboard");
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/10 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <Code2 className="h-5 w-5" />
            <span className="text-sm font-medium">C / C++ IDE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Code Playground
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Write, run, and test C or C++ code in your browser. Use the editor, then Run to execute.
          </p>
        </div>
      </div>
      <CodeIde />
    </div>
  );
}
