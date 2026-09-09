import { spawn } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { ClusterEntry, expandPath, KubeconfigTarget } from "./config";

const IS_WIN = process.platform === "win32";

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ResolvedExec {

  file: string;
  found: boolean;

  needsShell: boolean;
}

function pathExtList(): string[] {
  if (!IS_WIN) return [""];
  const raw = process.env.PATHEXT || ".COM;.EXE;.BAT;.CMD";

  return ["", ...raw.split(";").filter(Boolean).map(e => e.toLowerCase())];
}

function statFile(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

export function findExecutable(cmd: string): ResolvedExec {
  const raw = expandPath((cmd || "").trim().replace(/^"(.*)"$/, "$1"));
  const exts = pathExtList();
  const wrap = (file: string, found: boolean): ResolvedExec => ({
    file,
    found,
    needsShell: IS_WIN && /\.(cmd|bat)$/i.test(file)
  });

  if (!raw) return wrap(cmd, false);

  if (raw.includes("/") || raw.includes("\\")) {
    for (const ext of exts) {
      const candidate = raw + ext;

      if (statFile(candidate)) return wrap(candidate, true);
    }

    return wrap(raw, false);
  }

  const dirs = (process.env.PATH || process.env.Path || "").split(IS_WIN ? ";" : ":").filter(Boolean);

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = path.join(expandPath(dir.replace(/^"(.*)"$/, "$1")), raw + ext);

      if (statFile(candidate)) return wrap(candidate, true);
    }
  }

  return wrap(raw, false);
}

export function kubectlCandidates(): string[] {
  const home = os.homedir();
  const list = ["oc", "kubectl", "kubectl-login", "oc.exe", "kubectl.exe"];

  if (IS_WIN) {
    const pf = process.env.ProgramFiles || "C:\\Program Files";
    const pf86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const local = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");

    list.push(
      path.join(home, "bin", "oc.exe"),
      path.join(home, "bin", "kubectl.exe"),
      path.join(home, "scoop", "shims", "oc.exe"),
      path.join(home, "scoop", "shims", "kubectl.exe"),
      path.join(local, "Microsoft", "WindowsApps", "kubectl.exe"),
      path.join(pf, "OpenShift", "oc.exe"),
      path.join(pf, "kubectl", "kubectl.exe"),
      path.join(pf86, "OpenShift", "oc.exe"),
      "C:\\ProgramData\\chocolatey\\bin\\oc.exe",
      "C:\\ProgramData\\chocolatey\\bin\\kubectl.exe",
      "C:\\Windows\\System32\\kubectl.exe"
    );
  } else {
    list.push("/usr/local/bin/oc", "/usr/local/bin/kubectl", "/usr/bin/oc", "/usr/bin/kubectl");
  }

  return list;
}

export function mask(text: string, password: string): string {
  let out = text ?? "";

  if (password && password.length > 0) {
    out = out.split(password).join("********");
  }

  return out;
}

export function quoteWin(value: string): string {
  if (!IS_WIN) return value;
  if (value.length > 0 && !/[\s&|<>^"()]/.test(value)) return value;

  return `"${value.replace(/"/g, '""')}"`;
}

export interface RunResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  error?: string;
}

interface RunOptions {
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  stdin?: string;
}

function runProcess(exec: ResolvedExec, args: string[], opts: RunOptions): Promise<RunResult> {
  return new Promise<RunResult>(resolve => {
    const useShell = exec.needsShell;
    const file = useShell ? quoteWin(exec.file) : exec.file;
    const argv = useShell ? args.map(quoteWin) : args;

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let timer: any = null;

    const done = (result: RunResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    let child: ReturnType<typeof spawn>;

    try {
      child = spawn(file, argv, {
        env: opts.env,
        windowsHide: true,
        shell: useShell
      });
    } catch (e: any) {
      done({ code: null, stdout: "", stderr: "", timedOut: false, error: String(e?.message ?? e) });

      return;
    }

    timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill();
      } catch {}
    }, opts.timeoutMs);

    child.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    child.on("error", (e: any) => {
      done({ code: null, stdout, stderr, timedOut, error: String(e?.message ?? e) });
    });

    child.on("close", code => {
      done({ code, stdout, stderr, timedOut });
    });

    if (opts.stdin !== undefined) {
      try {
        child.stdin?.end(opts.stdin);
      } catch {}
    } else {
      try {
        child.stdin?.end();
      } catch {}
    }
  });
}

export function childEnv(target: KubeconfigTarget): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };

  if (target.override) {
    env.KUBECONFIG = target.override;
    try {
      fs.mkdirSync(path.dirname(target.override), { recursive: true });
    } catch {}
  } else {
    delete env.KUBECONFIG;
    delete (env as any).kubeconfig;
    try {
      fs.mkdirSync(path.dirname(target.display), { recursive: true });
    } catch {}
  }

  return env;
}

export interface CheckResult {
  ok: boolean;
  resolvedPath: string;
  version: string;
  hasLogin: boolean;
  message: string;
}

export async function checkKubectl(command: string, target: KubeconfigTarget): Promise<CheckResult> {
  const exec = findExecutable(command);
  const env = childEnv(target);

  if (!exec.found) {
    return {
      ok: false,
      resolvedPath: exec.file,
      version: "",
      hasLogin: false,
      message: `Не найден исполняемый файл "${command}". Укажите полный путь или добавьте каталог в PATH.`
    };
  }

  const ver = await runProcess(exec, ["version", "--client"], { env, timeoutMs: 20_000 });

  if (ver.error || ver.timedOut) {
    return {
      ok: false,
      resolvedPath: exec.file,
      version: "",
      hasLogin: false,
      message: ver.timedOut ? "Таймаут при запуске (20 с)." : `Ошибка запуска: ${ver.error}`
    };
  }

  const version = `${ver.stdout}${ver.stderr}`.trim().split(/\r?\n/)[0] ?? "";
  const help = await runProcess(exec, ["login", "--help"], { env, timeoutMs: 20_000 });
  const helpText = `${help.stdout}${help.stderr}`;
  const hasLogin = help.code === 0 || /--username/.test(helpText);

  return {
    ok: hasLogin,
    resolvedPath: exec.file,
    version,
    hasLogin,
    message: hasLogin
      ? `OK: ${exec.file}${version ? ` (${version})` : ""}`
      : `Найден ${exec.file}, но подкоманда "login" не поддерживается. Ванильный kubectl её не имеет — нужен oc или плагин kubectl-login.`
  };
}

export type Phase = "idle" | "pending" | "running" | "ok" | "fail" | "cancelled";

export interface ClusterStatus {
  phase: Phase;
  message?: string;
  attempt?: number;
  durationMs?: number;
}

export interface LoginContext {
  command: string;
  username: string;
  password: string;
  insecureTls: boolean;
  passwordViaStdin: boolean;
  kubeconfig: KubeconfigTarget;
  timeoutMs: number;
  onLog: (line: string) => void;
}

export interface LoginResult {
  ok: boolean;
  message: string;
  durationMs: number;
}

export async function loginCluster(ctx: LoginContext, cluster: ClusterEntry): Promise<LoginResult> {
  const exec = findExecutable(ctx.command);

  if (!exec.found) {
    return { ok: false, message: `Не найден "${ctx.command}"`, durationMs: 0 };
  }

  const args = ["login", cluster.url, "--username", ctx.username];

  if (!ctx.passwordViaStdin) {
    args.push("--password", ctx.password);
  }

  if (ctx.insecureTls) {
    args.push("--insecure-skip-tls-verify=true");
  }

  const env = childEnv(ctx.kubeconfig);
  const shown = args.map(a => (a === ctx.password ? "********" : a)).join(" ");

  ctx.onLog(`$ ${exec.file} ${shown}`);

  const started = Date.now();
  const res = await runProcess(exec, args, {
    env,
    timeoutMs: ctx.timeoutMs,
    stdin: ctx.passwordViaStdin ? `${ctx.password}\n` : undefined
  });
  const durationMs = Date.now() - started;

  const out = mask(`${res.stdout}${res.stderr}`, ctx.password).trim();

  out.split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 12)
    .forEach(line => ctx.onLog(`  ${line}`));

  if (res.error) {
    return { ok: false, message: mask(res.error, ctx.password), durationMs };
  }

  if (res.timedOut) {
    return { ok: false, message: `Таймаут ${Math.round(ctx.timeoutMs / 1000)} с`, durationMs };
  }

  if (res.code !== 0) {
    const firstErr =
      out
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0)
        .find(l => /error|unauthorized|denied|failed|invalid/i.test(l)) ||
      out.split(/\r?\n/).pop() ||
      `exit code ${res.code}`;

    return { ok: false, message: firstErr, durationMs };
  }

  return { ok: true, message: "Login successful", durationMs };
}

export async function listContexts(command: string, target: KubeconfigTarget): Promise<string[]> {
  const exec = findExecutable(command);

  if (!exec.found) return [];

  const res = await runProcess(exec, ["config", "get-contexts", "-o", "name"], {
    env: childEnv(target),
    timeoutMs: 20_000
  });

  if (res.code !== 0) return [];

  return res.stdout
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
}