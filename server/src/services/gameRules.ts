import { WebSocket } from 'ws';
import type { Battlefield } from '../types/messages';
import type { GameStatus, PrivateGame } from '../types/private-game';
import { createBattlefield } from '../utils/battlefield';
import { calculateCastleHits } from '../utils/shotResolver';

export type FireTransition =
  | { kind: 'hit'; hitTime: number; targetPlayerId: number; targetPlayerIds: number[]; winnerPlayerId?: number }
  | { kind: 'miss'; nextPlayerId: number };

export type RematchTransition =
  | { kind: 'waiting'; answered: number; playersReady: number; answers: Array<import('../types/private-game').RematchAnswer | null> }
  | { kind: 'started'; answered: number; playersReady: number; battlefield: Battlefield; round: number; answers: Array<import('../types/private-game').RematchAnswer | null> };

export class GameRules {
  public startIfReady(game: PrivateGame, now: number = Date.now()): { battlefield: Battlefield } | null {
    const slots = this.ensureLobbySlots(game);
    if (
      game.gameStarted ||
      slots.length < 2 ||
      slots.some(slot => slot.status !== 'skipped' &&
        (slot.session.websocket === null || slot.session.websocket.readyState !== WebSocket.OPEN))
    ) {
      return null;
    }

    game.status = 'active';
    game.gameStarted = true;
    game.currentTurn = 0;
    game.lastActivityAt = now;

    slots.forEach(slot => {
      slot.active = slot.status !== 'skipped';
      slot.eliminated = !slot.active;
    });
    game.battlefield = createBattlefield(Date.now(), slots.filter(slot => slot.active).map(s => s.playerId));
    return { battlefield: game.battlefield };
  }

  public disconnect(
    game: PrivateGame,
    playerId: number,
    now: number = Date.now()
  ): { statusChanged: boolean; status: GameStatus } {
    const slot = this.ensureLobbySlots(game)[playerId];
    if (slot) {
      slot.session.websocket = null;
      game.rematchReady[playerId] = false;
    }

    if (game.status === 'finished') {
      return { statusChanged: false, status: game.status };
    }

    if (game.gameStarted) {
      if (slot) {
        slot.active = false;
        slot.eliminated = true;
      }
      const activePlayers = game.lobbySlots.filter(candidate => candidate.active && !candidate.eliminated);
      if (activePlayers.length <= 1) {
        game.status = 'finished';
        game.gameFinishedAt = now;
        return { statusChanged: true, status: game.status };
      }
      game.currentTurn = this.nextActivePlayer(game, playerId);
      return { statusChanged: false, status: game.status };
    }

    if (game.status === 'pending' && playerId === 0) {
      game.status = 'expired';
      return { statusChanged: true, status: game.status };
    }

    return { statusChanged: false, status: game.status };
  }

  public requestRematch(
    game: PrivateGame,
    playerId: number,
    answerOrNow: import('../types/private-game').RematchAnswer | number = 'play_again',
    now: number = Date.now()
  ): RematchTransition {
    const answer = typeof answerOrNow === 'number' ? 'play_again' : answerOrNow;
    if (typeof answerOrNow === 'number') now = answerOrNow;

    const slots = this.ensureLobbySlots(game);

    // Find the slot index for this playerId
    const slotIndex = slots.findIndex(s => s.playerId === playerId);
    if (slotIndex === -1) {
      // Player not in lobby; you can choose to ignore or return a waiting transition
      return {
        kind: 'waiting',
        answered: 0,
        playersReady: 0,
        answers: game.rematchAnswers ?? slots.map(() => null)
      };
    }

    // Always size rematch arrays to current slots
    if (!game.rematchAnswers || game.rematchAnswers.length !== slots.length) {
      game.rematchAnswers = slots.map(() => null);
    }
    if (!game.rematchReady || game.rematchReady.length !== slots.length) {
      game.rematchReady = slots.map(() => false);
    }

    game.rematchAnswers[slotIndex] = answer;
    game.rematchReady[slotIndex] = answer === 'play_again';
    game.lastActivityAt = now;

    const rematchAnswers = game.rematchAnswers;
    const answered = rematchAnswers.filter(value => value !== null).length;
    const playersReady = game.rematchReady.filter(Boolean).length;
    const answerSnapshot = [...rematchAnswers];

    if (answered < slots.length) {
      return { kind: 'waiting', answered, playersReady, answers: answerSnapshot };
    }

    const remainingSlots = slots.filter((_, index) => rematchAnswers[index] === 'play_again');
    const playersLeaving = slots.filter((_, index) => rematchAnswers[index] === 'had_enough');

    if (remainingSlots.length < 2) {
      game.rematchReady = slots.map(() => false);
      game.rematchAnswers = slots.map(() => null);
      if (remainingSlots.length === 1) {
        game.status = 'finished';
      }
      return {
        kind: 'waiting',
        answered,
        playersReady: remainingSlots.length,
        answers: answerSnapshot
      };
    }

    if (playersLeaving.length > 0) {
      game.lobbySlots = remainingSlots.map(slot => ({
        ...slot,
        playerId: slot.playerId, // keep existing playerId
        status: 'ready' as const,
        active: true,
        eliminated: false,
        session: { ...slot.session }
      }));
      if (game.lobbySlots.length > 0) {
        game.initiator = game.lobbySlots[0].session;
      }
      if (game.lobbySlots.length > 1) {
        game.invited = game.lobbySlots[1].session;
      }
    }

    // Reset rematch arrays to match *new* lobbySlots
    game.rematchReady = game.lobbySlots.map(() => false);
    game.rematchAnswers = game.lobbySlots.map(() => null);

    game.round += 1;
    game.status = 'active';
    game.gameStarted = true;
    game.currentTurn = game.lobbySlots[0]?.playerId ?? 0; // first player's actual playerId
    game.gameFinishedAt = undefined;

    game.lobbySlots.forEach(slot => {
      slot.status = 'ready';
      slot.active = true;
      slot.eliminated = false;
    });

    game.battlefield = createBattlefield(Date.now(), game.lobbySlots.map(s => s.playerId));

    return {
      kind: 'started',
      answered,
      playersReady: remainingSlots.length,
      battlefield: game.battlefield,
      round: game.round,
      answers: answerSnapshot
    };
  }

  public fire(
    game: PrivateGame,
    playerId: number,
    angle: number,
    velocity: number,
    directionOrNow?: 'Left' | 'Right' | number,
    now: number = Date.now()
  ): FireTransition {
    const direction = typeof directionOrNow === 'number' ? undefined : directionOrNow;
    if (typeof directionOrNow === 'number') now = directionOrNow;
    game.lastActivityAt = now;
    const slots = this.ensureLobbySlots(game);
    const battlefield = game.battlefield ?? createBattlefield(Date.now(), slots.map(s => s.playerId));
    game.battlefield = battlefield;
    const hits = calculateCastleHits(battlefield, playerId, angle, velocity, direction);

    if (hits.length > 0) {
      // A shot pierces every castle in its path, so all of them are eliminated together.
      const targetPlayerIds = hits.map(hit => hit.playerId);
      targetPlayerIds.forEach(targetId => {
        const target = slots[targetId];
        if (target) {
          target.active = false;
          target.eliminated = true;
        }
      });
      const lastHitTime = hits[hits.length - 1].hitTime;
      const survivors = slots.filter(slot => slot.active && !slot.eliminated);
      if (survivors.length <= 1) {
        game.status = 'finished';
        game.gameFinishedAt = now;
        return { kind: 'hit', hitTime: lastHitTime, targetPlayerId: targetPlayerIds[0], targetPlayerIds, winnerPlayerId: survivors[0]?.playerId };
      }
      game.currentTurn = this.nextActivePlayer(game, playerId);
      return { kind: 'hit', hitTime: lastHitTime, targetPlayerId: targetPlayerIds[0], targetPlayerIds };
    }

    game.currentTurn = this.nextActivePlayer(game, playerId);
    return { kind: 'miss', nextPlayerId: game.currentTurn };
  }

  private nextActivePlayer(game: PrivateGame, playerId: number): number {
    const slots = this.ensureLobbySlots(game);

    if (slots.length === 0) return playerId;

    // Find the index of the current player in the slots array
    const currentIndex = slots.findIndex(s => s.playerId === playerId);

    // If current player is not found, you can decide what to do:
    // here we just start from index 0
    const startIndex = currentIndex === -1 ? 0 : currentIndex;

    // Walk forward by slot index, wrapping around
    for (let offset = 1; offset <= slots.length; offset += 1) {
      const candidate = slots[(startIndex + offset) % slots.length];
      if (candidate?.active && !candidate.eliminated) {
        return candidate.playerId; // use the slot's playerId, not arithmetic on the input
      }
    }

    // No other active, non-eliminated player found; stay on current
    return playerId;
  }

  private ensureLobbySlots(game: PrivateGame): NonNullable<PrivateGame['lobbySlots']> {
    if (game.lobbySlots?.length) return game.lobbySlots;
    game.lobbySlots = [game.initiator, game.invited].map((session, playerId) => ({
      playerId,
      session,
      status: 'ready' as const,
      active: true,
      eliminated: false
    }));
    return game.lobbySlots;
  }
}
