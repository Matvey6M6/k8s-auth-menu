import React from "react";

interface State {
  error: Error | null;
  info: string;
}

export class Boundary extends React.Component<{ children?: React.ReactNode; where?: string }, State> {
  state: State = { error: null, info: "" };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[k8s-auth-menu] render failed:", error, info);
    this.setState({ info: info?.componentStack ?? "" });
  }

  render(): React.ReactNode {
    const { error, info } = this.state;

    if (!error) return this.props.children as React.ReactElement;

    return (
      <div
        style={{
          position: "relative",
          padding: 24,
          minHeight: "100%",
          color: "var(--textColorPrimary, #e8eaed)",
          background: "var(--mainBackground, #1e2124)",
          font: '400 13px/1.45 "Segoe UI", Roboto, Arial, sans-serif'
        }}
      >
        <div style={{ fontSize: 18, marginBottom: 12, color: "var(--colorError, #ff7452)" }}>
          k8s Auth: ошибка рендера{this.props.where ? ` (${this.props.where})` : ""}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 4,
            background: "var(--logsBackground, #101215)",
            border: "1px solid var(--borderFaintColor, #3c4145)",
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            userSelect: "text",
            maxHeight: 420,
            overflow: "auto"
          }}
        >
          {`${error.name}: ${error.message}\n\n${error.stack ?? ""}\n${info}`}
        </div>

        <div style={{ marginTop: 12, color: "var(--textColorSecondary, #9aa0a6)" }}>
          Скопируйте текст выше — в нём указан файл и строка. Если стек ведёт в config.ts,
          проще всего удалить <code>~/.k8s-auth-menu/config.json</code> и открыть страницу заново.
        </div>
      </div>
    );
  }
}