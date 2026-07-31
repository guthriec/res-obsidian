import { SyncClient } from "res-md/dist/sync-client";
import { ChannelControllerImpl } from "res-md/dist/channel-controller";
import { FetchMethod } from "res-md/dist/types";
import type { ChannelConfig } from "res-md/dist/types";
import { type ResSyncSubscription } from "./types";

export class SyncService {
  private clients: Map<string, SyncClient> = new Map();
  private channelController: ChannelControllerImpl;
  private reservoirDir: string;
  private running = false;

  constructor(reservoirDir: string) {
    this.reservoirDir = reservoirDir;
    this.channelController = new ChannelControllerImpl(reservoirDir);
  }

  get isRunning(): boolean {
    return this.running;
  }

  async start(serverUrl: string, subscriptions: ResSyncSubscription[], secret?: string): Promise<void> {
    await this.stop();
    console.log("[res-sync] starting", subscriptions.length, "subscriptions →", serverUrl);

    for (const sub of subscriptions) {
      // For vault-root sync we use a stable channel ID "vault-root"
      // with contentRoot: "" so SyncClient writes to the vault root.
      const isRootSync = !sub.localChannelId || sub.localChannelId === ".";
      const effectiveChannelId = isRootSync ? "vault-root" : sub.localChannelId;
      const contentRoot = isRootSync ? "" : sub.localPath;

      await this.ensureLocalChannel(effectiveChannelId, contentRoot);
      console.log("[res-sync] subscription:", sub.serverChannelId, "→", effectiveChannelId,
        isRootSync ? "(vault root)" : "");

      const client = new SyncClient(this.reservoirDir, {
        serverUrl,
        serverChannelId: sub.serverChannelId,
        localChannelId: effectiveChannelId,
        secret,
      });

      this.clients.set(sub.serverChannelId, client);
      await client.start();
      console.log("[res-sync] client started for", sub.serverChannelId);
    }

    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
    for (const [id, client] of this.clients) {
      await client.stop();
      console.log("[res-sync] client stopped for", id);
    }
    this.clients.clear();
  }

  async triggerPublish(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.triggerPublish();
    }
  }

  getStatus(): Array<{ serverChannelId: string; localChannelId: string; active: boolean }> {
    return Array.from(this.clients.keys()).map((serverChannelId) => ({
      serverChannelId,
      localChannelId: "",
      active: this.running,
    }));
  }

  private async ensureLocalChannel(channelId: string, contentRoot?: string): Promise<void> {
    try {
      this.channelController.viewChannel(channelId);
    } catch {
      const config: ChannelConfig = {
        name: channelId,
        fetchMethod: FetchMethod.RSS,
        contentRoot,
      };
      await this.channelController.addChannel(config);
    }
  }
}
