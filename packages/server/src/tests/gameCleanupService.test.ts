import { describe, expect, it, vi } from 'vitest';
import type { PrivateGame } from '../types/private-game';
import { GameCleanupService, type Clock } from '../services/gameCleanupService';
import { InMemoryGameRepository } from '../services/gameRepository';

function createGame(overrides: Partial<PrivateGame> = {}): PrivateGame {
  return {
    id: 'game-1',
    status: 'pending',
    createdAt: 0,
    expiresAt: 100,
    lastActivityAt: 0,
    invitation: {
      inviteCode: 'ABCD',
      inviteCodeHash: 'code-hash',
      expiresAt: 100,
      accepted: false
    },
    initiator: { name: 'Alice', sessionTokenHash: 'alice-hash', websocket: null },
    invited: { name: 'Bob', sessionTokenHash: 'bob-hash', websocket: null },
    currentTurn: 0,
    gameStarted: false,
    round: 1,
    rematchReady: [false, false],
    ...overrides
  };
}

function createClock(now: number): Clock {
  return { now: () => now };
}

describe('GameCleanupService', () => {
  it('removes an expired pending game and closes its sockets', () => {
    const repository = new InMemoryGameRepository();
    const initiatorSocket = { close: vi.fn() } as any;
    const invitedSocket = { close: vi.fn() } as any;
    repository.set(createGame({
      initiator: { name: 'Alice', sessionTokenHash: 'alice-hash', websocket: initiatorSocket },
      invited: { name: 'Bob', sessionTokenHash: 'bob-hash', websocket: invitedSocket }
    }));

    new GameCleanupService(repository, createClock(101)).cleanup();

    expect(repository.size).toBe(0);
    expect(initiatorSocket.close).toHaveBeenCalledOnce();
    expect(invitedSocket.close).toHaveBeenCalledOnce();
  });

  it('marks an inactive active game expired without deleting it before its expiry', () => {
    const repository = new InMemoryGameRepository();
    repository.set(createGame({
      status: 'active',
      gameStarted: true,
      expiresAt: 1_000,
      lastActivityAt: 0
    }));

    new GameCleanupService(repository, createClock(31), { activeGameTtlMs: 30 }).cleanup();

    const game = repository.get('game-1');
    expect(game?.status).toBe('expired');
    expect(repository.size).toBe(1);
  });

  it('removes a finished game after its grace period', () => {
    const repository = new InMemoryGameRepository();
    repository.set(createGame({
      status: 'finished',
      gameStarted: true,
      gameFinishedAt: 100
    }));

    new GameCleanupService(repository, createClock(201), {
      finishedGameGracePeriodMs: 100
    }).cleanup();

    expect(repository.size).toBe(0);
  });

  it('does not remove a game at the exact expiration boundary', () => {
    const repository = new InMemoryGameRepository();
    repository.set(createGame());

    new GameCleanupService(repository, createClock(100)).cleanup();

    expect(repository.size).toBe(1);
    expect(repository.get('game-1')?.status).toBe('pending');
  });
});
