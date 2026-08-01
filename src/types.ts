export interface ResSyncSubscription {
  serverChannelId: string;
  /** Local channel ID, or empty string to sync the entire vault root */
  localChannelId: string;
  /**
   * Custom content root relative to the vault root.
   * When set, overrides the channel ID as the content directory.
   * Use "." or "" to sync the entire vault.
   */
  localPath?: string;
}

export interface ResSyncSettings {
  serverUrl: string;
  /** Optional shared secret sent as Authorization: Bearer <secret> header. */
  secret?: string;
  subscriptions: ResSyncSubscription[];
  syncOnStart: boolean;
  /** When true, file deletions propagate both ways (destructive — opt-in). */
  syncDeletions?: boolean;
}

export const DEFAULT_SETTINGS: ResSyncSettings = {
  serverUrl: "http://127.0.0.1:3030",
  secret: "",
  subscriptions: [],
  syncOnStart: true,
  syncDeletions: false,
};

export const VAULT_ROOT_CHANNEL = "." as const;
