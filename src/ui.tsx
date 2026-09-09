import React from "react";

export const C = {
  text: "var(--textColorPrimary, #e8eaed)",
  textDim: "var(--textColorSecondary, #9aa0a6)",
  ok: "var(--colorOk, #36b37e)",
  fail: "var(--colorError, #ff7452)",
  warn: "var(--colorWarning, #ffab00)",
  info: "var(--colorInfo, #4c9aff)",
  dim: "var(--textColorTertiary, #8993a4)"
};

const STYLE_ID = "k8s-auth-menu-style";

const CSS = `
.k8sauth-ico {
  color: inherit;
  font-family: "Material Icons";
  font-weight: normal;
  font-style: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-feature-settings: "liga";
  -webkit-font-smoothing: antialiased;
}

.k8sauth-entry {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  height: 100%;
  padding: 0 10px !important;
  margin: 0 !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  cursor: pointer;
  text-transform: none;
  white-space: nowrap;
  font: inherit !important;
  font-size: 12px !important;
  color: var(--textColorPrimary, #e8eaed) !important;
}
.k8sauth-entry:hover { background: var(--sidebarItemHoverBackground, rgba(127, 127, 127, .18)) !important; }
.k8sauth-entry:focus-visible { outline: 2px solid var(--colorInfo, #4c9aff); outline-offset: -2px; }

.k8sauth-entry-status,
.k8sauth-entry-status span,
.k8sauth-entry-status .k8sauth-ico { color: #fff !important; }
.k8sauth-entry-status { padding: 0 6px !important; }

.k8sauth-root {
  position: relative;
  padding: 24px;
  min-height: 100%;
  color: var(--textColorPrimary, #e8eaed) !important;
  background: var(--mainBackground, #1e2124) !important;
  font: 400 13px/1.45 var(--font-main, -apple-system, "Segoe UI", Roboto, Arial, sans-serif) !important;
}
.k8sauth-root.k8sauth-plain { padding: 0; min-height: 0; background: transparent !important; }
.k8sauth-root *, .k8sauth-root *::before, .k8sauth-root *::after { box-sizing: border-box; }

.k8sauth-root .k8sauth-title { margin: 0 0 16px; font-size: 22px; font-weight: 500; color: var(--textColorAccent, #fff) !important; }
.k8sauth-root .k8sauth-h3 { font-size: 15px; font-weight: 500; color: var(--textColorAccent, #fff) !important; white-space: nowrap; }
.k8sauth-root .k8sauth-label { font-size: 12px; color: ${C.textDim} !important; }
.k8sauth-root .k8sauth-hint { font-size: 12px; color: ${C.textDim} !important; }
.k8sauth-root .k8sauth-code {
  padding: 1px 5px; border-radius: 3px;
  font-family: var(--font-monospace, Consolas, "Courier New", monospace); font-size: 12px;
  color: ${C.text} !important; background: var(--inputControlBackground, #14171a) !important;
}

.k8sauth-root .k8sauth-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 18px; }
.k8sauth-root .k8sauth-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.k8sauth-root .k8sauth-spacer { flex: 1 1 auto; }

.k8sauth-root .k8sauth-banner {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; margin-bottom: 16px; border-radius: 3px;
  color: ${C.text} !important; background: var(--secondaryBackground, #2a2d31) !important;
  border: 1px solid var(--borderFaintColor, #3c4145) !important;
  border-left: 3px solid var(--borderFaintColor, #3c4145) !important;
}
.k8sauth-root .k8sauth-banner.warn { border-left-color: ${C.warn} !important; }
.k8sauth-root .k8sauth-banner.good { border-left-color: ${C.ok} !important; }

.k8sauth-root button.k8sauth-btn {
  display: inline-flex; align-items: center; justify-content: center;
  height: 30px; padding: 0 12px; margin: 0; border-radius: 3px;
  font: inherit !important; font-size: 13px !important; white-space: nowrap;
  cursor: pointer; text-transform: none;
  color: ${C.text} !important; background: var(--secondaryBackground, #34393e) !important;
  border: 1px solid var(--borderColor, #4a5055) !important; box-shadow: none !important;
}
.k8sauth-root button.k8sauth-btn:hover:enabled { filter: brightness(1.18); }
.k8sauth-root button.k8sauth-btn:focus-visible { outline: 2px solid ${C.info}; outline-offset: 1px; }
.k8sauth-root button.k8sauth-btn.primary,
.k8sauth-root button.k8sauth-btn.sel {
  color: #fff !important;
  background: var(--blue, #3d7eff) !important;
  border-color: var(--blue, #3d7eff) !important;
}

.k8sauth-root button.k8sauth-btn.danger {
  color: #fff !important;
  background: var(--colorSoftError, #e85555) !important;
  border-color: var(--colorError, #ce3933) !important;
}
.k8sauth-root button.k8sauth-btn:disabled { opacity: .45; cursor: default; }

.k8sauth-root .k8sauth-seg { display: inline-flex; }
.k8sauth-root .k8sauth-seg button.k8sauth-btn { border-radius: 0; }
.k8sauth-root .k8sauth-seg button.k8sauth-btn:first-child { border-radius: 3px 0 0 3px; }
.k8sauth-root .k8sauth-seg button.k8sauth-btn:last-child { border-radius: 0 3px 3px 0; }

.k8sauth-root .k8sauth-seg button.k8sauth-btn:not(:first-child) { border-left: none !important; }

.k8sauth-root input.k8sauth-input {
  display: block; width: 100%; height: 30px; padding: 0 8px; margin: 0;
  border-radius: 3px; appearance: none;
  font: inherit !important; font-size: 13px !important;
  color: ${C.text} !important; -webkit-text-fill-color: ${C.text} !important;
  caret-color: ${C.text} !important;
  background: var(--inputControlBackground, #14171a) !important;
  border: 1px solid var(--inputControlBorder, #4a5055) !important; box-shadow: none !important;
  opacity: 1 !important; outline: none;
}
.k8sauth-root input.k8sauth-input:focus { border-color: ${C.info} !important; }
.k8sauth-root input.k8sauth-input.bad { border-color: ${C.fail} !important; }
.k8sauth-root input.k8sauth-input::placeholder {
  color: ${C.dim} !important; -webkit-text-fill-color: ${C.dim} !important; opacity: 1;
}
.k8sauth-root input.k8sauth-input:disabled { opacity: .5 !important; }

.k8sauth-root label.k8sauth-checkline {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13px; cursor: pointer; color: ${C.text} !important;
}
.k8sauth-root label.k8sauth-checkline.off { opacity: .5; cursor: default; }
.k8sauth-root input.k8sauth-box {
  width: 16px; height: 16px; flex: 0 0 16px; margin: 0;
  accent-color: var(--blue, #3d7eff); cursor: inherit;
}

.k8sauth-root .k8sauth-log {
  max-height: 340px; min-height: 90px; overflow: auto; padding: 12px; border-radius: 3px;
  font-family: var(--font-monospace, Consolas, "Courier New", monospace) !important; font-size: 12px !important;
  line-height: 1.5; white-space: pre-wrap; word-break: break-word; user-select: text;
  color: var(--logsForeground, ${C.text}) !important;
  background: var(--logsBackground, #101215) !important;
  border: 1px solid var(--borderFaintColor, #3c4145) !important;
}
.k8sauth-root .k8sauth-log.empty { color: ${C.dim} !important; }

.k8sauth-root .k8sauth-gridwrap { overflow-x: auto; }

.k8sauth-root .k8sauth-grid {
  display: grid;
  grid-template-columns: 34px 46px minmax(110px, 1fr) minmax(190px, 2fr) 92px minmax(150px, 1.5fr) 86px;
}
.k8sauth-root .k8sauth-head,
.k8sauth-root .k8sauth-cell { display: flex; align-items: center; min-width: 0; }
.k8sauth-root .k8sauth-head {
  padding: 6px; font-size: 12px;
  color: ${C.textDim} !important; border-bottom: 1px solid var(--borderColor, #3c4145);
}
.k8sauth-root .k8sauth-cell { padding: 5px 6px; border-bottom: 1px solid var(--borderFaintColor, rgba(127, 127, 127, .25)); }

.k8sauth-root .k8sauth-c-center { justify-content: center; }
.k8sauth-root .k8sauth-c-right { justify-content: flex-end; }
.k8sauth-root .k8sauth-cell > input.k8sauth-input { flex: 1 1 auto; min-width: 0; }
.k8sauth-root .k8sauth-ellipsis { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.k8sauth-root .k8sauth-empty {
  padding: 16px; border-radius: 3px;
  color: ${C.textDim} !important; border: 1px dashed var(--borderColor, #3c4145);
}

.k8sauth-root .k8sauth-modal-back {
  position: fixed; inset: 0; z-index: 2147483000;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0, 0, 0, .55);
}
.k8sauth-root .k8sauth-modal {
  min-width: 340px; max-width: 520px; padding: 20px; border-radius: 6px;
  color: ${C.text} !important; background: var(--dialogBackground, #25282c) !important;
  border: 1px solid var(--borderColor, #4a5055) !important; box-shadow: 0 12px 40px rgba(0, 0, 0, .6);
  font: 400 13px/1.45 var(--font-main, -apple-system, "Segoe UI", Roboto, Arial, sans-serif);
}
.k8sauth-root .k8sauth-modal-text { margin-bottom: 14px; white-space: pre-wrap; }
.k8sauth-root .k8sauth-modal-opt {
  margin-bottom: 18px; padding: 10px 12px; border-radius: 3px;
  background: var(--secondaryBackground, #2a2d31) !important;
  border: 1px solid var(--borderFaintColor, #3c4145) !important;
}
.k8sauth-root .k8sauth-modal-opt label.k8sauth-checkline { align-items: flex-start; }
.k8sauth-root .k8sauth-modal-bar { display: flex; gap: 8px; justify-content: flex-end; }
`;

export function injectStyle(): void {
  if (typeof document === "undefined") return;

  const existing = document.getElementById(STYLE_ID);

  if (existing) {

    if (existing.textContent !== CSS) existing.textContent = CSS;

    return;
  }

  const el = document.createElement("style");

  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}

injectStyle();

interface KidsProps {
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const Root: React.FC<KidsProps & { plain?: boolean }> = ({ children, style, plain }) => {
  React.useEffect(() => {
    injectStyle();
  }, []);

  return (
    <div className={plain ? "k8sauth-root k8sauth-plain" : "k8sauth-root"} style={style}>
      {children}
    </div>
  );
};

export const Title: React.FC<KidsProps> = ({ children, style }) => (
  <div className="k8sauth-title" style={style}>{children}</div>
);

export const H3: React.FC<KidsProps> = ({ children, style }) => (
  <div className="k8sauth-h3" style={style}>{children}</div>
);

export const Label: React.FC<KidsProps> = ({ children }) => (
  <span className="k8sauth-label">{children}</span>
);

export const Hint: React.FC<KidsProps & { color?: string }> = ({ children, color }) => (
  <span className="k8sauth-hint" style={color ? { color } : undefined}>{children}</span>
);

export const Code: React.FC<KidsProps> = ({ children }) => (
  <span className="k8sauth-code">{children}</span>
);

export const Row: React.FC<KidsProps> = ({ children, style }) => (
  <div className="k8sauth-row" style={style}>{children}</div>
);

export const Bar: React.FC<KidsProps> = ({ children, style }) => (
  <div className="k8sauth-bar" style={style}>{children}</div>
);

export const Spacer: React.FC = () => <span className="k8sauth-spacer" />;

export const Banner: React.FC<KidsProps & { tone?: "info" | "warn" | "good" }> = ({ children, tone = "info" }) => (
  <div className={tone === "info" ? "k8sauth-banner" : `k8sauth-banner ${tone}`}>{children}</div>
);

export const Btn: React.FC<{
  label: string;
  onClick: () => void;
  kind?: "primary" | "plain" | "danger";
  disabled?: boolean;
  waiting?: boolean;
  title?: string;
  selected?: boolean;
}> = ({ label, onClick, kind = "plain", disabled, waiting, title, selected }) => {
  const cls = ["k8sauth-btn"];

  if (kind !== "plain") cls.push(kind);
  if (selected) cls.push("sel");

  return (
    <button
      type="button"
      className={cls.join(" ")}
      title={title}
      disabled={Boolean(disabled || waiting)}
      onClick={onClick}
    >
      {waiting ? "…" : label}
    </button>
  );
};

export const Segmented: React.FC<{
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}> = ({ value, options, onChange, disabled }) => (
  <div className="k8sauth-seg">
    {options.map(o => (
      <Btn
        key={o.value}
        label={o.label}
        selected={o.value === value}
        disabled={disabled}
        onClick={() => onChange(o.value)}
      />
    ))}
  </div>
);

export const TextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "password";
  placeholder?: string;
  disabled?: boolean;
  title?: string;
  invalid?: boolean;
  style?: React.CSSProperties;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}> = ({ value, onChange, type = "text", placeholder, disabled, title, invalid, style, onKeyDown }) => {
  const [draft, setDraft] = React.useState(value);
  const editing = React.useRef(false);

  React.useEffect(() => {
    if (!editing.current) setDraft(value);
  }, [value]);

  return (
    <input
      className={invalid ? "k8sauth-input bad" : "k8sauth-input"}
      type={type}
      value={draft}
      placeholder={placeholder}
      disabled={disabled}
      title={title}
      autoComplete="off"
      spellCheck={false}
      style={style}
      onFocus={() => {
        editing.current = true;
      }}
      onBlur={() => {
        editing.current = false;
        setDraft(value);
      }}
      onChange={e => {
        setDraft(e.target.value);
        onChange(e.target.value);
      }}
      onKeyDown={onKeyDown}
    />
  );
};

export const NumInput: React.FC<{
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}> = ({ value, onChange, min = 0, max = 999999, disabled, style }) => {
  const [draft, setDraft] = React.useState(String(value));
  const editing = React.useRef(false);

  React.useEffect(() => {
    if (!editing.current) setDraft(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const n = Number(raw.replace(/[^\d-]/g, ""));
    const safe = Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

    setDraft(String(safe));
    onChange(safe);
  };

  return (
    <input
      className="k8sauth-input"
      type="text"
      inputMode="numeric"
      value={draft}
      disabled={disabled}
      style={{ width: 140, ...style }}
      onFocus={() => {
        editing.current = true;
      }}
      onChange={e => setDraft(e.target.value)}
      onBlur={e => {
        editing.current = false;
        commit(e.target.value);
      }}
      onKeyDown={e => {
        if (e.key === "Enter") commit(e.currentTarget.value);
      }}
    />
  );
};

export const Check: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
  title?: string;
}> = ({ checked, onChange, label, disabled, title }) => (
  <label className={disabled ? "k8sauth-checkline off" : "k8sauth-checkline"} title={title}>
    <input
      className="k8sauth-box"
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
    />
    {label ? <span>{label}</span> : null}
  </label>
);

export interface ConfirmOptions {
  okLabel?: string;

  checkbox?: { label: React.ReactNode; defaultChecked?: boolean };
}

export interface ConfirmResult {
  ok: boolean;

  checked: boolean;
}

export function useConfirm(): [(message: string, opts?: ConfirmOptions) => Promise<ConfirmResult>, React.ReactNode] {
  const [state, setState] = React.useState<
    { message: string; okLabel: string; checkbox?: ConfirmOptions["checkbox"] } | null
  >(null);
  const [checked, setChecked] = React.useState(false);
  const resolveRef = React.useRef<((result: ConfirmResult) => void) | null>(null);

  const ask = React.useCallback((message: string, opts?: ConfirmOptions) => (
    new Promise<ConfirmResult>(resolve => {
      resolveRef.current = resolve;
      setChecked(Boolean(opts?.checkbox?.defaultChecked));
      setState({ message, okLabel: opts?.okLabel ?? "Удалить", checkbox: opts?.checkbox });
    })
  ), []);

  const close = (ok: boolean) => {
    setState(null);
    resolveRef.current?.({ ok, checked: ok && checked });
    resolveRef.current = null;
  };

  const focusOnMount = React.useCallback((el: HTMLDivElement | null) => {
    el?.focus();
  }, []);

  const dialog = state ? (
    <div
      className="k8sauth-modal-back"
      onClick={e => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div
        className="k8sauth-modal"
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        ref={focusOnMount}
        onKeyDown={e => {
          if (e.key === "Escape") close(false);
          if (e.key === "Enter") close(true);
        }}
      >
        <div className="k8sauth-modal-text">{state.message}</div>
        {state.checkbox && (
          <div className="k8sauth-modal-opt">
            <Check checked={checked} onChange={setChecked} label={state.checkbox.label} />
          </div>
        )}
        <div className="k8sauth-modal-bar">
          <Btn label="Отмена" onClick={() => close(false)} />
          <Btn label={state.okLabel} kind="danger" onClick={() => close(true)} />
        </div>
      </div>
    </div>
  ) : null;

  return [ask, dialog];
}
