import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export interface ClusterEntry {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  group: string;
}

export type KubeconfigMode = "default" | "custom";

export interface ConfigModel {
  version: 1;
  username: string;
  kubectlPath: string;
  kubeconfigMode: KubeconfigMode;
  kubeconfigPath: string;
  insecureTls: boolean;
  passwordViaStdin: boolean;

  delayMs: number;

  retries: number;
  clusters: ClusterEntry[];
}

export const CONFIG_DIR = path.join(os.homedir(), ".k8s-auth-menu");
export const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");
export const EXPORT_FILE = path.join(CONFIG_DIR, "clusters-export.json");
export const LOG_FILE = path.join(CONFIG_DIR, "last-run.log");

export const DEFAULT_KUBECONFIG = path.join(os.homedir(), ".kube", "config");

let seq = 0;

export function uid(): string {
  seq += 1;

  return `${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isValidClusterUrl(url: string): boolean {
  return /^https?:\/\/[^\s/:]+(:\d+)?(\/\S*)?$/i.test((url || "").trim());
}

export function defaultConfig(): ConfigModel {
  return {
    version: 1,
    username: "",
    kubectlPath: "kubectl",
    kubeconfigMode: "default",
    kubeconfigPath: "",
    insecureTls: false,
    passwordViaStdin: false,
    delayMs: 500,
    retries: 1,

    clusters: []
  };
}

export function expandPath(p: string): string {
  if (!p) return p;

  let out = p.replace(/%([^%]+)%/g, (_m, name) => process.env[name] ?? "");

  out = out.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (_m, name) => process.env[name] ?? "");

  if (out === "~" || out.startsWith("~/") || out.startsWith("~\\")) {
    out = path.join(os.homedir(), out.slice(1));
  }

  return path.normalize(out);
}

export interface KubeconfigTarget {

  override: string | null;

  display: string;

  needsSync: boolean;
}

export function kubeconfigTarget(cfg: ConfigModel): KubeconfigTarget {
  if (cfg.kubeconfigMode === "custom") {
    const raw = (cfg.kubeconfigPath || "").trim();
    const resolved = raw ? expandPath(raw) : path.join(os.homedir(), ".kube", "k8s-auth.config");

    return {
      override: resolved,
      display: resolved,
      needsSync: path.normalize(resolved).toLowerCase() !== DEFAULT_KUBECONFIG.toLowerCase()
    };
  }

  return { override: null, display: DEFAULT_KUBECONFIG, needsSync: false };
}

const EMPTY_KUBECONFIG = [
  "apiVersion: v1",
  "kind: Config",
  "preferences: {}",
  "clusters: []",
  "contexts: []",
  "users: []",
  ""
].join("\n");

export interface WipeResult {
  path: string;

  backup: string | null;

  bytesBefore: number;
}

export function wipeKubeconfig(target: KubeconfigTarget, keepBackup: boolean): WipeResult {
  const file = target.display;
  let backup: string | null = null;
  let bytesBefore = 0;

  fs.mkdirSync(path.dirname(file), { recursive: true });

  if (fs.existsSync(file)) {
    bytesBefore = fs.statSync(file).size;

    if (keepBackup && bytesBefore > 0) {
      const suffix = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

      backup = `${file}.bak-${suffix}`;
      fs.copyFileSync(file, backup);
    }
  }

  fs.writeFileSync(file, EMPTY_KUBECONFIG, "utf-8");

  return { path: file, backup, bytesBefore };
}

function clamp(value: any, min: number, max: number, fallback: number): number {
  const n = typeof value === "string" ? parseInt(value, 10) : value;

  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.trunc(n))) : fallback;
}

export function sanitizeCluster(raw: any): ClusterEntry | null {
  if (!raw || typeof raw !== "object") return null;

  const rawUrl = typeof raw.url === "string" ? raw.url.trim() : "";

  const url = isValidClusterUrl(rawUrl) ? rawUrl : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";

  if (!url && !name) return null;

  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : uid(),
    name: name || url,

    url,
    enabled: raw.enabled !== false,
    group: typeof raw.group === "string" ? raw.group : ""
  };
}

function dedupeIds(list: ClusterEntry[]): ClusterEntry[] {
  const seen = new Set<string>();

  return list.map(c => {
    if (seen.has(c.id)) return { ...c, id: uid() };

    seen.add(c.id);

    return c;
  });
}

export function sanitizeClusters(raw: any): ClusterEntry[] {
  if (!Array.isArray(raw)) return [];

  const list: ClusterEntry[] = [];

  for (const item of raw) {
    const entry = sanitizeCluster(item);

    if (entry) list.push(entry);
  }

  return dedupeIds(list);
}

function sanitize(raw: any): ConfigModel {
  const base = defaultConfig();

  if (!raw || typeof raw !== "object") return base;

  const clusters = Array.isArray(raw.clusters) ? sanitizeClusters(raw.clusters) : base.clusters;

  return {
    version: 1,
    username: typeof raw.username === "string" ? raw.username : "",
    kubectlPath: typeof raw.kubectlPath === "string" && raw.kubectlPath ? raw.kubectlPath : base.kubectlPath,
    kubeconfigMode: raw.kubeconfigMode === "custom" ? "custom" : "default",
    kubeconfigPath: typeof raw.kubeconfigPath === "string" ? raw.kubeconfigPath : "",
    insecureTls: Boolean(raw.insecureTls),
    passwordViaStdin: Boolean(raw.passwordViaStdin),
    delayMs: clamp(raw.delayMs, 0, 10_000, base.delayMs),
    retries: clamp(raw.retries, 0, 5, base.retries),
    clusters
  };
}

type Listener = (cfg: ConfigModel) => void;

class ConfigStore {
  private data: ConfigModel | null = null;
  private listeners = new Set<Listener>();
  private saveTimer: any = null;

  get(): ConfigModel {
    if (!this.data) this.data = this.readFromDisk();

    return this.data;
  }

  private readFromDisk(): ConfigModel {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return sanitize(JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8")));
      }
    } catch (e) {
      console.warn("[k8s-auth-menu] cannot read config:", e);
    }

    return defaultConfig();
  }

  set(patch: Partial<ConfigModel>): void {
    const next: ConfigModel = { ...this.get(), ...patch };

    this.data = next;
    this.emit(next);
    this.scheduleSave();
  }

  private emit(next: ConfigModel): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener(next);
      } catch (e) {
        console.error("[k8s-auth-menu] config listener failed:", e);
      }
    }
  }

  updateCluster(id: string, patch: Partial<ClusterEntry>): void {
    this.set({ clusters: this.get().clusters.map(c => (c.id === id ? { ...c, ...patch } : c)) });
  }

  addCluster(entry?: Partial<ClusterEntry>): string {
    const name = (entry?.name ?? "").trim();
    const url = (entry?.url ?? "").trim();
    const created: ClusterEntry = {
      id: uid(),
      name,

      url,

      enabled: entry?.enabled === true,
      group: entry?.group ?? ""
    };

    this.set({ clusters: [...this.get().clusters, created] });

    return created.id;
  }

  removeCluster(id: string): void {
    this.set({ clusters: this.get().clusters.filter(c => c.id !== id) });
  }

  removeClusters(ids: string[]): number {
    const kill = new Set(ids);
    const before = this.get().clusters;
    const after = before.filter(c => !kill.has(c.id));

    this.set({ clusters: after });

    return before.length - after.length;
  }

  setAllEnabled(enabled: boolean, group?: string): void {
    this.set({
      clusters: this.get().clusters.map(c => (!group || c.group === group ? { ...c, enabled } : c))
    });
  }

  replaceClusters(clusters: any[]): number {
    const next = sanitizeClusters(clusters);

    this.set({ clusters: next });

    return next.length;
  }

  reset(): void {
    this.set(defaultConfig());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 300);
  }

  saveNow(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.get(), null, 2), "utf-8");
    } catch (e) {
      console.error("[k8s-auth-menu] cannot save config:", e);
    }
  }
}

export const config = new ConfigStore();