import React from "react";
import * as fs from "fs";
import {
  config,
  isValidClusterUrl,
  wipeKubeconfig,
  ClusterEntry,
  CONFIG_DIR,
  EXPORT_FILE,
  KubeconfigTarget
} from "../config";
import { ClusterStatus, Phase } from "../kubectl";
import { Bar, Banner, Btn, C, Check, H3, Hint, Segmented, Spacer, TextInput, useConfirm } from "../ui";

const GLYPH: Record<Phase, { text: string; color: string }> = {
  idle: { text: "·", color: C.dim },
  pending: { text: "○", color: C.textDim },
  running: { text: "▶", color: C.info },
  ok: { text: "✔", color: C.ok },
  fail: { text: "✖", color: C.fail },
  cancelled: { text: "⊘", color: C.warn }
};

type Tone = "info" | "warn" | "good";

export interface ClusterListProps {
  clusters: ClusterEntry[];

  statuses?: Record<string, ClusterStatus>;

  busy?: boolean;

  kubeconfig: KubeconfigTarget;
}

export const ClusterList: React.FC<ClusterListProps> = ({ clusters, statuses, busy, kubeconfig }) => {
  const [filter, setFilter] = React.useState("all");
  const [notice, setNotice] = React.useState<{ tone: Tone; text: string } | null>(null);
  const [ask, dialog] = useConfirm();

  const groups = React.useMemo(() => {
    const set = new Set<string>();

    for (const c of clusters) {
      if (c.group) set.add(c.group);
    }

    return Array.from(set).sort();
  }, [clusters]);

  React.useEffect(() => {
    if (filter !== "all" && !groups.includes(filter)) setFilter("all");
  }, [filter, groups]);

  const shown = filter === "all" ? clusters : clusters.filter(c => c.group === filter);
  const scope = filter === "all" ? undefined : filter;
  const enabledTotal = clusters.filter(c => c.enabled).length;

  const addCluster = () => {

    config.addCluster({ name: "", url: "", enabled: false, group: scope ?? "" });
    setNotice(null);
  };

  const removeOne = async (c: ClusterEntry) => {
    const label = c.name || c.url;

    if (!(await ask(`Удалить кластер «${label}»?`)).ok) return;

    config.removeCluster(c.id);
    setNotice({ tone: "info", text: `Удалён: ${label}` });
  };

  const removeSelected = async () => {
    const victims = shown.filter(c => c.enabled);

    if (victims.length === 0) {
      setNotice({ tone: "info", text: "Ни один кластер не выбран." });

      return;
    }

    const list = victims.map(c => c.name || c.url || "(без имени)").join(", ");
    const where = scope ? ` из группы ${scope}` : "";

    if (!(await ask(`Удалить выбранные кластеры${where} (${victims.length})?\n\n${list}`)).ok) return;

    const killed = config.removeClusters(victims.map(c => c.id));

    setNotice({ tone: "info", text: `Удалено кластеров: ${killed}` });
  };

  const exportClusters = () => {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(EXPORT_FILE, JSON.stringify(clusters, null, 2), "utf-8");
      setNotice({ tone: "good", text: `Сохранено ${clusters.length} шт. → ${EXPORT_FILE}` });
    } catch (e) {
      setNotice({ tone: "warn", text: `Не удалось записать файл: ${String(e?.message ?? e)}` });
    }
  };

  const clearKubeconfig = async () => {
    const { ok, checked } = await ask(
      `Полностью очистить kubeconfig?\n\n${kubeconfig.display}\n\n`
        + "Из файла будут удалены ВСЕ кластеры, контексты и пользователи — в том числе "
        + "добавленные мимо этого расширения.",
      {
        okLabel: "Очистить",
        checkbox: {
          label: (
            <>
              Сохранить резервную копию рядом с файлом.{" "}
              <b>В копии останутся действующие токены доступа</b> — она такой же секрет,
              как и сам kubeconfig, и удалять её придётся вручную.
            </>
          ),
          defaultChecked: false
        }
      }
    );

    if (!ok) return;

    try {
      const res = wipeKubeconfig(kubeconfig, checked);

      setNotice({
        tone: res.backup ? "warn" : "good",
        text: res.backup
          ? `kubeconfig очищен: ${res.path}. Копия с токенами (${res.bytesBefore} Б): ${res.backup} — удалите её, когда станет не нужна.`
          : `kubeconfig очищен: ${res.path}. Копия не создавалась.`
      });
    } catch (e) {
      setNotice({ tone: "warn", text: `Не удалось очистить kubeconfig: ${String(e?.message ?? e)}` });
    }
  };

  const importClusters = async () => {
    if (!fs.existsSync(EXPORT_FILE)) {
      setNotice({ tone: "warn", text: `Файл не найден: ${EXPORT_FILE}. Сначала выполните экспорт.` });

      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8"));
    } catch (e) {
      setNotice({ tone: "warn", text: `Файл повреждён: ${String(e?.message ?? e)}` });

      return;
    }

    const incoming = Array.isArray(parsed) ? parsed : (parsed as { clusters?: unknown })?.clusters;

    if (!Array.isArray(incoming) || incoming.length === 0) {
      setNotice({ tone: "warn", text: "В файле нет массива кластеров." });

      return;
    }

    const { ok } = await ask(
      `Заменить текущий список (${clusters.length} шт.) на импортируемый (${incoming.length} шт.)?`,
      { okLabel: "Заменить" }
    );

    if (!ok) return;

    const count = config.replaceClusters(incoming);

    setFilter("all");
    setNotice(
      count > 0
        ? { tone: "good", text: `Импортировано кластеров: ${count}` }
        : { tone: "warn", text: "Ни одной корректной записи не найдено." }
    );
  };

  return (
    <div>
      {dialog}

      <Bar style={{ marginBottom: 10 }}>
        <H3>Кластеры</H3>
        <Hint>
          {clusters.length} шт., выбрано {enabledTotal}
          {scope ? `, показана группа ${scope}` : ""}
        </Hint>
        <Spacer />
        {groups.length > 1 && (
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[{ value: "all", label: "Все" }, ...groups.map(g => ({ value: g, label: g }))]}
          />
        )}
      </Bar>

      <Bar style={{ marginBottom: 12 }}>
        <Btn label="Добавить" onClick={addCluster} disabled={busy} />
        <Btn
          label={scope ? `Выбрать ${scope}` : "Выбрать все"}
          onClick={() => config.setAllEnabled(true, scope)}
          disabled={busy}
        />
        <Btn
          label={scope ? `Исключить ${scope}` : "Исключить все"}
          onClick={() => config.setAllEnabled(false, scope)}
          disabled={busy}
        />
        <Btn
          label="Удалить выбранные"
          kind="danger"
          onClick={() => void removeSelected()}
          disabled={busy}
          title="Удаляет кластеры, отмеченные галочкой"
        />
        <Spacer />
        <Btn label="Экспорт" onClick={exportClusters} disabled={busy} title={EXPORT_FILE} />
        <Btn label="Импорт" onClick={importClusters} disabled={busy} title={EXPORT_FILE} />
        <Btn
          label="Очистить kubeconfig"
          kind="danger"
          onClick={() => void clearKubeconfig()}
          disabled={busy}
          title={`Удалить все контексты из ${kubeconfig.display}`}
        />
      </Bar>

      {notice && (
        <Banner tone={notice.tone}>
          <span style={{ flex: "1 1 auto", wordBreak: "break-all" }}>{notice.text}</span>
          <Btn label="Скрыть" onClick={() => setNotice(null)} />
        </Banner>
      )}

      {shown.length === 0 ? (
        <div className="k8sauth-empty">
          Список пуст. Нажмите «Добавить», чтобы завести первый кластер, или «Импорт», если у вас
          уже есть готовый JSON со списком.
        </div>
      ) : (
        <div className="k8sauth-gridwrap">
          <div className="k8sauth-grid">
            <div className="k8sauth-head" title="Выбран — участвует в логине" />
            <div className="k8sauth-head k8sauth-c-center">Ст.</div>
            <div className="k8sauth-head">Имя</div>
            <div className="k8sauth-head">URL</div>
            <div className="k8sauth-head">Группа</div>
            <div className="k8sauth-head">Результат</div>
            <div className="k8sauth-head" />

            {shown.map(c => {
              const st = statuses?.[c.id];
              const glyph = GLYPH[st?.phase ?? "idle"];
              const seconds = st?.durationMs ? ` ${(st.durationMs / 1000).toFixed(1)} с` : "";
              const message = st?.message ? `${st.message}${seconds}` : "";
              const badUrl = !isValidClusterUrl(c.url);

              return (
                <React.Fragment key={c.id}>
                  <div className="k8sauth-cell k8sauth-c-center">
                    <Check
                      checked={c.enabled}
                      disabled={busy}
                      title={
                        badUrl && c.enabled
                          ? "Выбран, но будет пропущен: некорректный URL"
                          : "Выбран — участвует в логине"
                      }
                      onChange={enabled => config.updateCluster(c.id, { enabled })}
                    />
                  </div>

                  <div
                    className="k8sauth-cell k8sauth-c-center"
                    style={{ color: glyph.color, fontSize: 15 }}
                    title={st?.attempt && st.attempt > 1 ? `Попытка ${st.attempt}` : undefined}
                  >
                    {glyph.text}
                  </div>

                  <div className="k8sauth-cell">
                    <TextInput
                      value={c.name}
                      disabled={busy}
                      placeholder="prod-01"
                      onChange={name => config.updateCluster(c.id, { name })}
                    />
                  </div>

                  <div className="k8sauth-cell">
                    <TextInput
                      value={c.url}
                      disabled={busy}
                      invalid={badUrl}
                      placeholder="https://api.prod-01.example.com:6443"
                      title={badUrl ? "Некорректный адрес — кластер будет пропущен" : c.url}
                      onChange={url => config.updateCluster(c.id, { url })}
                    />
                  </div>

                  <div className="k8sauth-cell">
                    <TextInput
                      value={c.group}
                      disabled={busy}
                      placeholder="—"
                      onChange={group => config.updateCluster(c.id, { group })}
                    />
                  </div>

                  <div
                    className="k8sauth-cell"
                    style={{ color: st?.phase === "fail" ? C.fail : C.textDim }}
                    title={message}
                  >

                    <span className="k8sauth-ellipsis">{message || "—"}</span>
                  </div>

                  <div className="k8sauth-cell k8sauth-c-right">
                    <Btn
                      label="✕"
                      kind="danger"
                      disabled={busy}
                      title="Удалить кластер"
                      onClick={() => void removeOne(c)}
                    />
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};