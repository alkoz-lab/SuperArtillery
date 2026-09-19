import { describe, expect, it } from 'vitest';
import { Game } from '../ts/game';

describe('Game shot history', () => {
  it('keeps the four most recent shots in newest-first order', () => {
    const game = new Game();

    game.addShotToHistory(10, 100);
    game.addShotToHistory(20, 110);
    game.addShotToHistory(30, 120);
    game.addShotToHistory(40, 130);
    game.addShotToHistory(50, 140);

    expect(game.getShotHistory()).toEqual([
      { angle: 50, velocity: 140 },
      { angle: 40, velocity: 130 },
      { angle: 30, velocity: 120 },
      { angle: 20, velocity: 110 }
    ]);
  });

  it('resets the history', () => {
    const game = new Game();
    game.addShotToHistory(45, 150);

    game.resetShotHistory();

    expect(game.getShotHistory()).toEqual([]);
  });

    it('keeps separate shot history for each player', () => {
      const game = new Game();
      game.setHotSeat(true);
      game.addShotToHistory(40, 120, 0);
      game.addShotToHistory(55, 180, 1);
      game.addShotToHistory(45, 150, 0);

      expect(game.getShotHistoryForPlayer(0)).toEqual([
        { angle: 45, velocity: 150, playerId: 0 },
        { angle: 40, velocity: 120, playerId: 0 }
      ]);
      expect(game.getShotHistoryForPlayer(1)).toEqual([
        { angle: 55, velocity: 180, playerId: 1 }
      ]);
    });
});