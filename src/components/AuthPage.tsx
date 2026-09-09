import React from "react";
import * as fs from "fs";
import { config, isValidClusterUrl, kubeconfigTarget, CONFIG_DIR, LOG_FILE } from "../config";
import { useConfig } from "../useConfig";
import { checkKubectl, listContexts, loginCluster, sleep, ClusterStatus } from "../kubectl";
import { ClusterList } from "./ClusterList";
import { Bar, Banner, Btn, C, Code, H3, Hint, Label, Root, Row, Spacer, TextInput, Title } from "../ui";

const TIMEOUT_MS = 90_000;

type Tone = "info" | "warn" | "good";

function hostKey(url: string): string {
  const raw = (url || "").replace(/^[a-z]+:\/\//i, "").replace(/\/.*$/, "");
  const [host, port] = raw.split(":");

  return `${host.replace(/\./g, "-")}${port ? `:${port}` : ""}`.toLowerCase();
}

function stamp(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour12: false });
}

export const AuthPage: React.FC = () => {
  const cfg = useConfig();

  const [password, setPassword] = React.useState("");
  const [statuses, setStatuses] = React.useState<Record<string, ClusterStatus>>({});
  const [log, setLog] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [notice, setNotice] = React.useState<{ tone: Tone; text: string } | null>(null);

  const cancelRef = React.useRef(false);
  const logRef = React.useRef<HTMLDivElement | null>(null);

  const linesRef = React.useRef<string[]>([]);

  const target = React.useMemo(() => kubeconfigTarget(cfg), [cfg.kubeconfigMode, cfg.kubeconfigPath]);
  const marked = cfg.clusters.filter(c => c.enabled);
  const enabled = marked.filter(c => isValidClusterUrl(c.url));
  const skipped = marked.filter(c => !isValidClusterUrl(c.url));
  const ready = Boolean(cfg.username.trim() && password && enabled.length > 0);

  React.useEffect(() => {
    const el = logRef.current;

    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const say = React.useCallback((line: string) => {
    linesRef.current = [...linesRef.current, `[${stamp()}] ${line}`];
    setLog(linesRef.current);
  }, []);

  const mark = (id: string, patch: ClusterStatus) => {
    setStatuses(prev => ({ ...prev, [id]: patch }));
  };

  const clearLog = () => {
    linesRef.current = [];
    setLog([]);
    setNotice(null);
  };

  const saveLog = (lines: string[]) => {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(LOG_FILE, lines.join("\r\n"), "utf-8");
    } catch (e) {
      console.warn("[k8s-auth-menu] cannot save log:", e);
    }
  };

  const runCheck = async () => {
    setChecking(true);
    setNotice(null);
    say(`Проверка CLI: ${cfg.kubectlPath}`);

    try {
      const res = await checkKubectl(cfg.kubectlPath, target);

      say(res.message);
      setNotice({ tone: res.ok ? "good" : "warn", text: res.message });
    } catch (e: any) {
      const text = `Ошибка проверки: ${String(e?.message ?? e)}`;

      say(text);
      setNotice({ tone: "warn", text });
    } finally {
      setChecking(false);
    }
  };

  const cancel = () => {
    cancelRef.current = true;
    say("Запрошена отмена — текущий кластер будет завершён.");
  };

  const runLogin = async () => {
    if (!ready || busy) return;

    cancelRef.current = false;
    setBusy(true);
    setNotice(null);

    const onLog = (line: string) => say(line);

    const initial: Record<string, ClusterStatus> = {};

    for (const c of enabled) initial[c.id] = { phase: "pending" };
    setStatuses(initial);

    say(`Старт: ${enabled.length} кластер(ов), пользователь ${cfg.username}`);
    say(`kubeconfig: ${target.display}`);

    if (skipped.length > 0) {
      say(`Пропущены без корректного URL: ${skipped.map(c => c.name || "(без имени)").join(", ")}`);
    }

    const attemptsTotal = Math.max(1, cfg.retries + 1);

    const succeeded = new Set<string>();
    let okCount = 0;
    let failCount = 0;
    let cancelled = false;

    try {
      for (let i = 0; i < enabled.length; i++) {
        const cluster = enabled[i];

        if (cancelRef.current) {
          cancelled = true;

          for (let k = i; k < enabled.length; k++) {
            mark(enabled[k].id, { phase: "cancelled", message: "Отменено" });
          }

          say("Отменено пользователем.");
          break;
        }

        let result = { ok: false, message: "не выполнено", durationMs: 0 };

        for (let attempt = 1; attempt <= attemptsTotal; attempt++) {
          mark(cluster.id, { phase: "running", attempt, message: attempt > 1 ? `Повтор ${attempt}` : "Вход…" });
          say(`(${i + 1}/${enabled.length}) ${cluster.name || cluster.url}${attempt > 1 ? ` — попытка ${attempt}` : ""}`);

          result = await loginCluster(
            {
              command: cfg.kubectlPath,
              username: cfg.username.trim(),
              password,
              insecureTls: cfg.insecureTls,
              passwordViaStdin: cfg.passwordViaStdin,
              kubeconfig: target,
              timeoutMs: TIMEOUT_MS,
              onLog
            },
            cluster
          );

          if (result.ok || cancelRef.current) break;

          if (attempt < attemptsTotal) await sleep(Math.max(cfg.delayMs, 300));
        }

        mark(cluster.id, {
          phase: result.ok ? "ok" : "fail",
          message: result.message,
          durationMs: result.durationMs
        });

        if (result.ok) {
          succeeded.add(cluster.id);
          okCount++;
        } else {
          failCount++;
        }

        if (i < enabled.length - 1 && cfg.delayMs > 0 && !cancelRef.current) {
          await sleep(cfg.delayMs);
        }
      }

      let warned = false;

      if (!cancelled && okCount > 0) {
        const contexts = await listContexts(cfg.kubectlPath, target);

        say(`Контекстов в kubeconfig: ${contexts.length}`);

        const haystack = contexts.join("\n").toLowerCase();

        const missing = enabled
          .filter(c => succeeded.has(c.id))
          .filter(c => {
            const key = hostKey(c.url);

            return key.length > 0 && !haystack.includes(key) && !haystack.includes((c.name || "").toLowerCase());
          })
          .map(c => c.name || c.url);

        if (contexts.length > 0 && missing.length > 0) {
          const text = `ВНИМАНИЕ: нет контекстов для: ${missing.join(", ")}`;

          say(text);
          setNotice({ tone: "warn", text });
          warned = true;
        }
      }

      const summary = `Готово: успешно ${okCount}, с ошибкой ${failCount}${cancelled ? ", отменено" : ""}.`;

      say(summary);

      if (!warned || failCount > 0) {
        setNotice({
          tone: failCount === 0 && !cancelled ? "good" : failCount > 0 ? "warn" : "info",
          text: summary
        });
      }
    } catch (e: any) {
      const text = `Непредвиденная ошибка: ${String(e?.message ?? e)}`;

      say(text);
      setNotice({ tone: "warn", text });
    } finally {
      setBusy(false);
      cancelRef.current = false;
      saveLog(linesRef.current);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && ready && !busy) void runLogin();
  };

  return (
    <Root>
      <Title>k8s Auth</Title>

      {notice && (
        <Banner tone={notice.tone}>
          <span style={{ flex: "1 1 auto", wordBreak: "break-word" }}>{notice.text}</span>
          <Btn label="Скрыть" onClick={() => setNotice(null)} />
        </Banner>
      )}

      <Bar style={{ alignItems: "flex-end", marginBottom: 18 }}>
        <div style={{ flex: "1 1 220px", minWidth: 180 }}>
          <div style={{ marginBottom: 5 }}><Label>Логин</Label></div>
          <TextInput
            value={cfg.username}
            disabled={busy}
            placeholder="ivanov_ii"
            onChange={username => config.set({ username })}
            onKeyDown={onKeyDown}
          />
        </div>

        <div style={{ flex: "1 1 220px", minWidth: 180 }}>
          <div style={{ marginBottom: 5 }}><Label>Пароль (не сохраняется)</Label></div>
          <TextInput
            value={password}
            type="password"
            disabled={busy}
            placeholder="••••••••"
            onChange={setPassword}
            onKeyDown={onKeyDown}
          />
        </div>

        <Btn
          label={`Login (${enabled.length})`}
          kind="primary"
          onClick={() => void runLogin()}
          disabled={!ready || busy}
          title={ready ? undefined : "Нужны логин, пароль и хотя бы один включённый кластер с корректным URL"}
        />
        <Btn label="Отмена" onClick={cancel} disabled={!busy} />
        <Btn label="Проверить kubectl" onClick={() => void runCheck()} waiting={checking} disabled={busy} />
      </Bar>

      <Row>
        <Hint>
          CLI: <Code>{cfg.kubectlPath}</Code>{"  "}kubeconfig: <Code>{target.display}</Code>
          {cfg.insecureTls ? "  TLS-проверка отключена" : ""}
        </Hint>
        {target.needsSync && (
          <Hint color={C.warn}>
            Путь отличается от стандартного — включите его в Preferences → Kubeconfig Sync, иначе OpenLens
            не увидит кластеры.
          </Hint>
        )}
        {skipped.length > 0 && (
          <Hint color={C.warn}>
            Отмечено, но пропущено из-за некорректного URL ({skipped.length}):{" "}
            {skipped.map(c => c.name || "(без имени)").join(", ")}. Заполните адрес вида{" "}
            <Code>https://api.prod-01.example.com:6443</Code> или снимите галочку.
          </Hint>
        )}
      </Row>

      <ClusterList clusters={cfg.clusters} statuses={statuses} busy={busy} kubeconfig={target} />

      <Bar style={{ margin: "22px 0 8px" }}>
        <H3>Лог ({log.length})</H3>
        <Spacer />
        <Hint>{LOG_FILE}</Hint>
        <Btn label="Очистить" onClick={clearLog} disabled={log.length === 0 || busy} />
      </Bar>

      <div className={log.length === 0 ? "k8sauth-log empty" : "k8sauth-log"} ref={logRef}>
        {log.length === 0 ? "Лог пуст. Нажмите «Проверить kubectl» или «Login»." : log.join("\n")}
      </div>
    </Root>
  );
};