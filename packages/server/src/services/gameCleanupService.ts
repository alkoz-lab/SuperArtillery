import { SystemClock, type Clock, type TimerHandle, type TimerScheduler } from '@superartillery/core';
import type { GameRepository } from './gameRepository';
import { GAME_CONFIG } from './gameConfig';

export { SystemClock };
export type { Clock, TimerHandle, TimerScheduler };

export class SystemTimerScheduler implements TimerScheduler {
  public setInterval(callback: () => void, milliseconds: number): TimerHandle {
    return setInterval(callback, milliseconds);
  }

  public clearInterval(timer: TimerHandle): void {
    clearInterval(timer as ReturnType<typeof setInterval>);
  }
}

export interface GameCleanupOptions {
  activeGameTtlMs?: number;
  finishedGameGracePeriodMs?: number;
}

export class GameCleanupService {
  private readonly activeGameTtlMs: number;
  private readonly finishedGameGracePeriodMs: number;

  constructor(
    private readonly games: GameRepository,
    private readonly clock: Clock = new SystemClock(),
    options: GameCleanupOptions = {}
  ) {
    this.activeGameTtlMs = options.activeGameTtlMs ?? GAME_CONFIG.activeGameTtlMs;
    this.finishedGameGracePeriodMs =
      options.finishedGameGracePeriodMs ?? GAME_CONFIG.finishedGameGracePeriodMs;
  }

  public cleanup(): void {
    const now = this.clock.now();
    const toDelete: string[] = [];

    for (const [gameId, game] of this.games.entries()) {
      if (game.status === 'pending' && game.invitation.expiresAt < now) {
        game.status = 'expired';
      }

      if (game.status === 'active' && game.lastActivityAt + this.activeGameTtlMs < now) {
        game.status = 'expired';
      }

      if (
        game.status === 'finished' &&
        game.gameFinishedAt &&
        game.gameFinishedAt + this.finishedGameGracePeriodMs < now
      ) {
        toDelete.push(gameId);
      }

      if (game.status === 'expired' && game.expiresAt < now) {
        toDelete.push(gameId);
      }
    }

    toDelete.forEach(gameId => {
      const game = this.games.get(gameId);
      if (!game) return;

      const sessions = game.lobbySlots?.map(slot => slot.session) ?? [game.initiator, game.invited];
      const connections = new Set(sessions.map(session => session.connection).filter(Boolean));
      connections.forEach(connection => connection?.close());
      this.games.delete(gameId);
    });
  }
}
