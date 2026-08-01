import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import ResSyncPlugin from "./main";

export class ResSyncSettingTab extends PluginSettingTab {
  private plugin: ResSyncPlugin;

  constructor(app: App, plugin: ResSyncPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Res Sync" });

    new Setting(containerEl)
      .setName("Sync server URL")
      .setDesc("The URL of the res sync server (e.g. http://127.0.0.1:3030)")
      .addText((text) =>
        text
          .setPlaceholder("http://127.0.0.1:3030")
          .setValue(this.plugin.settings.serverUrl)
          .onChange(async (value) => {
            this.plugin.settings.serverUrl = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Shared secret")
      .setDesc("Bearer token for Authorization. Must match the server's --secret.")
      .addText((text) =>
        text
          .setPlaceholder("shared secret")
          .setValue(this.plugin.settings.secret ?? "")
          .onChange(async (value) => {
            this.plugin.settings.secret = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sync on startup")
      .setDesc("Start syncing automatically when Obsidian opens")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncOnStart)
          .onChange(async (value) => {
            this.plugin.settings.syncOnStart = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Sync deletions")
      .setDesc(
        "When enabled, deleting a file on one side deletes it on the other. " +
          "Destructive — leave off unless you want deletions propagated.",
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.syncDeletions === true)
          .onChange(async (value) => {
            this.plugin.settings.syncDeletions = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Server channel subscriptions" });

    for (let i = 0; i < this.plugin.settings.subscriptions.length; i++) {
      this.renderSubscriptionItem(containerEl, i);
    }

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText("+ Add subscription")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.subscriptions.push({
            serverChannelId: "",
            localChannelId: "",
          });
          await this.plugin.saveSettings();
          this.display();
        });
    });

    new Setting(containerEl).addButton((button) => {
      button
        .setButtonText("+ Sync entire vault")
        .setCta()
        .onClick(async () => {
          this.plugin.settings.subscriptions.push({
            serverChannelId: "",
            localChannelId: ".",
            localPath: "",
          });
          await this.plugin.saveSettings();
          this.display();
        });
    });

    containerEl.createEl("hr");

    const statusSetting = new Setting(containerEl).setName("Sync");
    if (this.plugin.syncService.isRunning) {
      statusSetting.setDesc("Sync is running");
      statusSetting.addButton((button) =>
        button
          .setButtonText("Stop")
          .onClick(async () => {
            await this.plugin.stopSync();
            new Notice("Res sync stopped");
            this.display();
          })
      );
    } else {
      const canStart = this.plugin.settings.subscriptions.length > 0;
      statusSetting.setDesc(canStart ? "Ready to sync" : "Add a subscription first");
      statusSetting.addButton((button) =>
        button
          .setButtonText("Start")
          .setCta()
          .setDisabled(!canStart)
          .onClick(async () => {
            await this.plugin.startSync();
            new Notice("Res sync started");
            this.display();
          })
      );
    }
  }

  private renderSubscriptionItem(
    containerEl: HTMLElement,
    index: number,
  ): void {
    const sub = this.plugin.settings.subscriptions[index];
    const isVaultRoot = sub.localChannelId === ".";

    const setting = new Setting(containerEl);

    setting.addText((text) =>
      text
        .setPlaceholder("Server channel ID")
        .setValue(sub.serverChannelId)
        .onChange(async (value) => {
          this.plugin.settings.subscriptions[index].serverChannelId = value;
          await this.plugin.saveSettings();
        })
    );

    if (isVaultRoot) {
      setting.setDesc("Syncing the entire vault");
      setting.addExtraButton((button) => {
        button
          .setIcon("trash")
          .setTooltip("Remove subscription")
          .onClick(async () => {
            this.plugin.settings.subscriptions.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          });
      });
    } else {
      setting.addText((text) =>
        text
          .setPlaceholder("Local folder/channel ID")
          .setValue(sub.localChannelId)
          .onChange(async (value) => {
            this.plugin.settings.subscriptions[index].localChannelId = value;
            await this.plugin.saveSettings();
          })
      );
      setting.addExtraButton((button) => {
        button
          .setIcon("trash")
          .setTooltip("Remove subscription")
          .onClick(async () => {
            this.plugin.settings.subscriptions.splice(index, 1);
            await this.plugin.saveSettings();
            this.display();
          });
      });
    }
  }
}
