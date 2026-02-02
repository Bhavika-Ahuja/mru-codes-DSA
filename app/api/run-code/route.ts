import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";

const PISTON_URL = "https://emkc.org/api/v2/piston/execute";

type RunCodeBody = {
  language: "c" | "cpp";
  code: string;
  stdin?: string;
};

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as RunCodeBody;
    const { language, code, stdin = "" } = body;

    if (!language || !code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Missing language or code" },
        { status: 400 }
      );
    }

    if (language !== "c" && language !== "cpp") {
      return NextResponse.json(
        { error: "Only C and C++ are supported" },
        { status: 400 }
      );
    }

    const ext = language === "cpp" ? "cpp" : "c";
    const fileName = `main.${ext}`;

    let stdinStr = typeof stdin === "string" ? stdin : "";
    if (stdinStr && !stdinStr.endsWith("\n")) {
      stdinStr += "\n";
    }

    const pistonBody = {
      language,
      version: "*",
      files: [{ name: fileName, content: code }],
      stdin: stdinStr,
      args: [],
      compile_timeout: 10_000,
      run_timeout: 5_000,
    };

    const res = await fetch(PISTON_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pistonBody),
    });

    const data = (await res.json()) as {
      run?: { stdout?: string; stderr?: string; code?: number };
      compile?: { stdout?: string; stderr?: string; code?: number };
      message?: string;
    };

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? "Execution service error" },
        { status: 502 }
      );
    }

    const compileOut = data.compile?.stdout ?? "";
    const compileErr = data.compile?.stderr ?? "";
    const runOut = data.run?.stdout ?? "";
    const runErr = data.run?.stderr ?? "";

    return NextResponse.json({
      stdout: runOut,
      stderr: runErr,
      compileStdout: compileOut,
      compileStderr: compileErr,
      runCode: data.run?.code ?? -1,
      compileCode: data.compile?.code ?? -1,
    });
  } catch (e) {
    console.error("Run code error:", e);
    return NextResponse.json(
      { error: "Failed to run code" },
      { status: 500 }
    );
  }
}
