import { Plugin, Notice } from "obsidian";
import { SyncService } from "./sync-service";
import { ResSyncSettingTab } from "./settings-tab";
import { DEFAULT_SETTINGS, ResSyncSettings } from "./types";

export default class ResSyncPlugin extends Plugin {
  settings!: ResSyncSettings;
  syncService!: SyncService;
  private statusBarItem: HTMLElement | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    const basePath = (this.app.vault.adapter as any).getBasePath();
    console.log("[res-sync] vault path:", basePath);
    this.syncService = new SyncService(basePath);

    this.statusBarItem = this.addStatusBarItem();
    this.statusBarItem.setText("Res Sync: idle");

    this.addSettingTab(new ResSyncSettingTab(this.app, this));

    this.addCommand({
      id: "res-sync-toggle",
      name: "Toggle sync",
      callback: async () => {
        if (this.syncService.isRunning) {
          await this.stopSync();
          new Notice("Res sync stopped");
        } else {
          await this.startSync();
          new Notice("Res sync started");
        }
      },
    });

    if (this.settings.syncOnStart && this.settings.subscriptions.length > 0) {
      console.log("[res-sync] auto-starting sync");
      await this.startSync();
    }
  }

  async onunload(): Promise<void> {
    console.log("[res-sync] unloading");
    await this.stopSync();
  }

  async startSync(): Promise<void> {
    if (this.syncService.isRunning) {
      console.log("[res-sync] already running");
      return;
    }

    try {
      console.log("[res-sync] starting sync →", this.settings.serverUrl);
      this.statusBarItem?.setText("Res Sync: starting...");
      await this.syncService.start(this.settings.serverUrl, this.settings.subscriptions, this.settings.secret, this.settings.syncDeletions);
      this.statusBarItem?.setText("Res Sync: running");
      console.log("[res-sync] sync started successfully");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[res-sync] FAILED:", message, err);
      new Notice(`Res sync failed: ${message}`);
      this.statusBarItem?.setText("Res Sync: error");
    }
  }

  async stopSync(): Promise<void> {
    console.log("[res-sync] stopping sync");
    await this.syncService.stop();
    this.statusBarItem?.setText("Res Sync: idle");
    console.log("[res-sync] sync stopped");
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }
}
