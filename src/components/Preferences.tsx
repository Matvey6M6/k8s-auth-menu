import React from "react";
import { config, DEFAULT_KUBECONFIG, expandPath, kubeconfigTarget } from "../config";
import { useConfig } from "../useConfig";
import { checkKubectl, findExecutable, kubectlCandidates } from "../kubectl";
import { Bar, Banner, Btn, C, Check, Code, H3, Hint, Label, NumInput, Root, Row, Segmented, Spacer, TextInput, useConfirm } from "../ui";

type Tone = "info" | "warn" | "good";

export const Preferences: React.FC = () => {
  const cfg = useConfig();
  const [notice, setNotice] = React.useState<{ tone: Tone; text: string } | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [ask, dialog] = useConfirm();

  const target = React.useMemo(() => kubeconfigTarget(cfg), [cfg.kubeconfigMode, cfg.kubeconfigPath]);

  const detect = () => {
    const found: string[] = [];

    for (const candidate of kubectlCandidates()) {
      const res = findExecutable(candidate);

      if (res.found && !found.includes(res.file)) found.push(res.file);
    }

    if (found.length === 0) {
      setNotice({
        tone: "warn",
        text: "Ничего не найдено. Укажите полный путь к oc.exe или kubectl.exe вручную."
      });

      return;
    }

    config.set({ kubectlPath: found[0] });
    setNotice({
      tone: "good",
      text: `Выбран: ${found[0]}${found.length > 1 ? `. Также найдено: ${found.slice(1).join(", ")}` : ""}`
    });
  };

  const verify = async () => {
    setChecking(true);
    setNotice(null);

    try {
      const res = await checkKubectl(cfg.kubectlPath, target);

      setNotice({ tone: res.ok ? "good" : "warn", text: res.message });
    } catch (e: any) {
      setNotice({ tone: "warn", text: `Ошибка проверки: ${String(e?.message ?? e)}` });
    } finally {
      setChecking(false);
    }
  };

  const resetAll = async () => {
    const { ok } = await ask(
      "Сбросить все настройки расширения?\nЛогин и путь к CLI вернутся к значениям по умолчанию, "
        + "а список кластеров будет очищен полностью.\n\nЕсли список нужно сохранить — сначала "
        + "сделайте «Экспорт» на странице k8s Auth.",
      { okLabel: "Сбросить" }
    );

    if (!ok) return;

    config.reset();
    setNotice({ tone: "good", text: "Настройки сброшены." });
  };

  return (
    <Root plain>
      {dialog}

      {notice && (
        <Banner tone={notice.tone}>
          <span style={{ flex: "1 1 auto", wordBreak: "break-all" }}>{notice.text}</span>
          <Btn label="Скрыть" onClick={() => setNotice(null)} />
        </Banner>
      )}

      <Row>
        <Label>Логин</Label>
        <TextInput
          value={cfg.username}
          placeholder="ivanov_ii"
          onChange={username => config.set({ username })}
        />
        <Hint>Пароль не сохраняется и запрашивается на странице k8s Auth при каждом запуске.</Hint>
      </Row>

      <Row>
        <Label>CLI для входа</Label>
        <Bar>
          <div style={{ flex: "1 1 320px", minWidth: 220 }}>
            <TextInput
              value={cfg.kubectlPath}
              placeholder="oc"
              onChange={kubectlPath => config.set({ kubectlPath })}
            />
          </div>
          <Btn label="Найти автоматически" onClick={detect} />
          <Btn label="Проверить" onClick={() => void verify()} waiting={checking} />
        </Bar>
        <Hint>
          Нужна поддержка подкоманды <Code>login</Code>: подойдёт <Code>oc</Code> или плагин{" "}
          <Code>kubectl-login</Code>. Ванильный <Code>kubectl</Code> её не имеет.
        </Hint>
      </Row>

      <Row>
        <Label>Куда писать kubeconfig</Label>
        <Segmented
          value={cfg.kubeconfigMode}
          onChange={mode => config.set({ kubeconfigMode: mode === "custom" ? "custom" : "default" })}
          options={[
            { value: "default", label: "Стандартный (~/.kube/config)" },
            { value: "custom", label: "Свой путь" }
          ]}
        />
        {cfg.kubeconfigMode === "custom" ? (
          <>
            <TextInput
              value={cfg.kubeconfigPath}
              placeholder="%USERPROFILE%\.kube\k8s-auth.config"
              onChange={kubeconfigPath => config.set({ kubeconfigPath })}
            />
            <Hint>
              Будет использовано: <Code>{cfg.kubeconfigPath ? expandPath(cfg.kubeconfigPath) : target.display}</Code>
            </Hint>
            {target.needsSync && (
              <Hint color={C.warn}>
                Этот файл не входит в стандартный набор OpenLens — добавьте его в Preferences → Kubeconfig
                Sync, иначе кластеры не появятся в списке.
              </Hint>
            )}
          </>
        ) : (
          <Hint>
            Файл: <Code>{DEFAULT_KUBECONFIG}</Code>. Переменная <Code>KUBECONFIG</Code> для дочернего
            процесса удаляется, чтобы системное значение не перенаправило запись.
          </Hint>
        )}
      </Row>

      <Row>
        <Label>Последовательный запуск</Label>
        <Bar>
          <div>
            <div style={{ marginBottom: 5 }}><Hint>Пауза между кластерами, мс</Hint></div>
            <NumInput value={cfg.delayMs} min={0} max={10_000} onChange={delayMs => config.set({ delayMs })} />
          </div>
          <div>
            <div style={{ marginBottom: 5 }}><Hint>Повторов при ошибке</Hint></div>
            <NumInput value={cfg.retries} min={0} max={5} onChange={retries => config.set({ retries })} />
          </div>
        </Bar>
        <Hint>
          Логины выполняются строго по одному: все они пишут в один и тот же kubeconfig, и параллельный
          запуск приводит к потере контекстов.
        </Hint>
      </Row>

      <Row>
        <Label>Дополнительно</Label>
        <Check
          checked={cfg.insecureTls}
          label={<>Не проверять TLS-сертификат (<Code>--insecure-skip-tls-verify=true</Code>)</>}
          onChange={insecureTls => config.set({ insecureTls })}
        />
        <Check
          checked={cfg.passwordViaStdin}
          label="Передавать пароль через stdin вместо аргумента командной строки"
          onChange={passwordViaStdin => config.set({ passwordViaStdin })}
        />
        <Hint>
          Через stdin пароль не виден в списке процессов, но такой режим поддерживают не все версии CLI.
          Если вход перестал работать — верните передачу аргументом.
        </Hint>
      </Row>

      <Bar>
        <H3>Сброс</H3>
        <Spacer />
        <Btn label="Сбросить все настройки" kind="danger" onClick={() => void resetAll()} />
      </Bar>
    </Root>
  );
};