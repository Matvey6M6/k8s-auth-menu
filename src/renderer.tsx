import { Renderer } from "@k8slens/extensions";
import React from "react";
import { AuthPage } from "./components/AuthPage";
import { Boundary } from "./components/Boundary";
import { Preferences } from "./components/Preferences";
import { injectStyle } from "./ui";

const PAGE_ID = "auth";

let openPage: (() => void) | null = null;

function openAuthPage(): void {
  if (!openPage) {
    console.warn("[k8s-auth-menu] extension is not activated yet");

    return;
  }

  try {
    openPage();
  } catch (e) {
    console.error("[k8s-auth-menu] navigate failed:", e);
  }
}

const Ico: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <span className="k8sauth-ico" style={{ fontSize: size, width: size, height: size }}>vpn_key</span>
);

const StatusItem: React.FC = () => (
  <div
    className="k8sauth-entry k8sauth-entry-status"
    role="button"
    tabIndex={0}
    title="k8s Auth — пакетный логин в кластеры"
    onClick={openAuthPage}
    onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") openAuthPage();
    }}
  >
    <Ico size={14} />
    <span>k8s Auth</span>
  </div>
);

const PrefsHint: React.FC = () => <span>Логин, kubectl и kubeconfig для пакетной авторизации.</span>;

const PageBody: React.FC = () => (
  <Boundary where="AuthPage">
    <AuthPage />
  </Boundary>
);

const PrefsBody: React.FC = () => (
  <Boundary where="Preferences">
    <Preferences />
  </Boundary>
);

export default class K8sAuthMenuRenderer extends Renderer.LensExtension {
  globalPages = [
    {
      id: PAGE_ID,
      components: { Page: PageBody }
    }
  ];

  welcomeMenus = [
    {
      title: "k8s Auth: пакетный логин в кластеры",
      icon: "vpn_key",
      click: () => openAuthPage()
    }
  ];

  statusBarItems = [
    {
      components: { Item: StatusItem }
    }
  ];

  appPreferences = [
    {
      id: "k8s-auth-menu",
      title: "k8s Auth",
      components: {
        Hint: PrefsHint,
        Input: PrefsBody
      }
    }
  ];

  commands = [
    {
      id: "k8s-auth-menu.open",
      title: "k8s Auth: открыть страницу логина",
      action: () => openAuthPage()
    }
  ];

  private readonly goToPage = (): void => {
    void this.navigate(PAGE_ID);
  };

  async onActivate(): Promise<void> {
    openPage = this.goToPage;

    try {
      injectStyle();
    } catch (e) {
      console.error("[k8s-auth-menu] injectStyle failed:", e);
    }

    (globalThis as Record<string, unknown>).__k8sAuthNav = openAuthPage;

    console.log("[k8s-auth-menu] renderer activated, pathname:", location.pathname);
  }

  onDeactivate(): void {
    if (openPage === this.goToPage) openPage = null;
  }
}
