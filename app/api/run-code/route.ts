import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/supabase/server";

type RunCodeBody = {
  language: "c" | "cpp";
  code: string;
  stdin?: string;
};

/** Piston-compatible response (self-hosted Piston) */
type PistonRun = { stdout?: string; stderr?: string; code?: number };
type PistonResponse = {
  run?: PistonRun;
  compile?: PistonRun;
  message?: string;
};

/** JDoodle response */
type JDoodleResponse = {
  output?: string;
  statusCode?: number;
  error?: string;
};

const JDoodle_URL = "https://api.jdoodle.com/v1/execute";

// JDoodle language identifiers for C and C++
const JDoodle_Lang: Record<"c" | "cpp", { language: string; versionIndex: string }> = {
  c: { language: "c", versionIndex: "5" },
  cpp: { language: "cpp17", versionIndex: "0" },
};

async function executeWithPiston(
  url: string,
  language: "c" | "cpp",
  code: string,
  stdin: string
): Promise<{ stdout: string; stderr: string; compileStdout: string; compileStderr: string; runCode: number; compileCode: number }> {
  const ext = language === "cpp" ? "cpp" : "c";
  const fileName = `main.${ext}`;
  const body = {
    language,
    version: "*",
    files: [{ name: fileName, content: code }],
    stdin,
    args: [],
    compile_timeout: 10_000,
    run_timeout: 5_000,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as PistonResponse;

  if (!res.ok) {
    throw new Error(data.message ?? "Execution service error");
  }

  return {
    stdout: data.run?.stdout ?? "",
    stderr: data.run?.stderr ?? "",
    compileStdout: data.compile?.stdout ?? "",
    compileStderr: data.compile?.stderr ?? "",
    runCode: data.run?.code ?? -1,
    compileCode: data.compile?.code ?? -1,
  };
}

async function executeWithJDoodle(
  code: string,
  stdin: string,
  language: "c" | "cpp"
): Promise<{ stdout: string; stderr: string; compileStdout: string; compileStderr: string; runCode: number; compileCode: number }> {
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "JDoodle credentials not configured. Add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET to .env, or use a self-hosted Piston with CODE_EXECUTION_URL."
    );
  }

  const { language: lang, versionIndex } = JDoodle_Lang[language];

  const res = await fetch(JDoodle_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clientId,
      clientSecret,
      script: code,
      language: lang,
      versionIndex,
      stdin: stdin || undefined,
    }),
  });

  const data = (await res.json()) as JDoodleResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "JDoodle request failed");
  }

  const success = data.statusCode === 200;
  const output = data.output ?? "";

  return {
    stdout: success ? output : "",
    stderr: success ? "" : output,
    compileStdout: "",
    compileStderr: success ? "" : output,
    runCode: success ? 0 : 1,
    compileCode: success ? 0 : 1,
  };
}

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

    let stdinStr = typeof stdin === "string" ? stdin : "";
    if (stdinStr && !stdinStr.endsWith("\n")) {
      stdinStr += "\n";
    }

    const customUrl = process.env.CODE_EXECUTION_URL?.trim();
    const hasJDoodle =
      process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET;

    if (customUrl) {
      const result = await executeWithPiston(customUrl, language, code, stdinStr);
      return NextResponse.json(result);
    }

    if (hasJDoodle) {
      const result = await executeWithJDoodle(code, stdinStr, language);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error:
          "No code execution backend configured. Use one of: (1) Free JDoodle — add JDOODLE_CLIENT_ID and JDOODLE_CLIENT_SECRET from jdoodle.com. (2) Self-hosted Piston — set CODE_EXECUTION_URL to your Piston server.",
      },
      { status: 503 }
    );
  } catch (e) {
    console.error("Run code error:", e);
    const message = e instanceof Error ? e.message : "Failed to run code";
    return NextResponse.json(
      { error: message },
      { status: e instanceof Error && message.includes("credentials") ? 503 : 500 }
    );
  }
}
