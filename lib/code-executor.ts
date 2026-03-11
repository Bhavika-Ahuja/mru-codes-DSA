/**
 * Server-side code execution for run-code API and contest judging.
 * Uses CODE_EXECUTION_URL (Piston) or JDOODLE_* env vars.
 */

export type CodeExecutionResult = {
  stdout: string;
  stderr: string;
  compileStdout: string;
  compileStderr: string;
  runCode: number;
  compileCode: number;
};

type PistonRun = { stdout?: string; stderr?: string; code?: number };
type PistonResponse = {
  run?: PistonRun;
  compile?: PistonRun;
  message?: string;
};

type JDoodleResponse = {
  output?: string;
  statusCode?: number;
  error?: string;
};

const JDoodle_URL = "https://api.jdoodle.com/v1/execute";

const JDoodle_Lang: Record<"c" | "cpp", { language: string; versionIndex: string }> = {
  c: { language: "c", versionIndex: "5" },
  cpp: { language: "cpp17", versionIndex: "0" },
};

async function executeWithPiston(
  url: string,
  language: "c" | "cpp",
  code: string,
  stdin: string
): Promise<CodeExecutionResult> {
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
): Promise<CodeExecutionResult> {
  const clientId = process.env.JDOODLE_CLIENT_ID;
  const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("JDoodle credentials not configured.");
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

export async function runCode(
  code: string,
  language: "c" | "cpp",
  stdin: string = ""
): Promise<CodeExecutionResult> {
  let stdinStr = typeof stdin === "string" ? stdin : "";
  if (stdinStr && !stdinStr.endsWith("\n")) {
    stdinStr += "\n";
  }

  const customUrl = process.env.CODE_EXECUTION_URL?.trim();
  const hasJDoodle =
    process.env.JDOODLE_CLIENT_ID && process.env.JDOODLE_CLIENT_SECRET;

  if (customUrl) {
    return executeWithPiston(customUrl, language, code, stdinStr);
  }
  if (hasJDoodle) {
    return executeWithJDoodle(code, stdinStr, language);
  }
  throw new Error("No code execution backend configured.");
}
