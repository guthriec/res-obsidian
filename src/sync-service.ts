import { SyncClient } from "res-md/dist/sync-client";
import { ChannelControllerImpl, channelDirectorySlug } from "res-md/dist/channel-controller";
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
      // Use the slugged id consistently (res-md slugs channel names), but keep
      // the raw folder name as the content root so the actual vault folder is
      // synced (and case is preserved on case-sensitive volumes).
      const effectiveChannelId = isRootSync ? "vault-root" : channelDirectorySlug(sub.localChannelId);
      const contentRoot = isRootSync ? "" : (sub.localPath ?? sub.localChannelId);

      const actualChannelId = await this.ensureLocalChannel(effectiveChannelId, contentRoot);
      console.log("[res-sync] subscription:", sub.serverChannelId, "→", actualChannelId,
        isRootSync ? "(vault root)" : "");

      const client = new SyncClient(this.reservoirDir, {
        serverUrl,
        serverChannelId: sub.serverChannelId,
        localChannelId: actualChannelId,
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

  private async ensureLocalChannel(channelId: string, contentRoot?: string): Promise<string> {
    let channel: ReturnType<typeof this.channelController.viewChannel>;
    try {
      channel = this.channelController.viewChannel(channelId);
    } catch {
      const config: ChannelConfig = {
        name: channelId,
        fetchMethod: FetchMethod.RSS,
        contentRoot,
      };
      channel = await this.channelController.addChannel(config);
    }
    // Heal a pre-existing channel whose content root is stale (e.g. created
    // before content-root preservation), so it syncs the correct folder.
    if (channel.contentRoot !== contentRoot) {
      channel = await this.channelController.editChannel(channel.id, { contentRoot });
    }
    return channel.id;
  }
}
