export const GAME_CONFIG = {
  invitationTtlMs: 30 * 60 * 1000,
  activeGameTtlMs: 30 * 60 * 1000,
  finishedGameGracePeriodMs: 5 * 60 * 1000,
  maxActiveGames: 100,
  cleanupIntervalMs: 60 * 1000
} as const;
