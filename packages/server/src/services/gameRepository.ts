import type { PrivateGame } from '../types/private-game';

export interface GameRepository {
  get(gameId: string): PrivateGame | undefined;
  set(game: PrivateGame): void;
  values(): IterableIterator<PrivateGame>;
  entries(): IterableIterator<[string, PrivateGame]>;
  delete(gameId: string): boolean;
  get size(): number;
}

export class InMemoryGameRepository implements GameRepository {
  private readonly games = new Map<string, PrivateGame>();

  public get(gameId: string): PrivateGame | undefined {
    return this.games.get(gameId);
  }

  public set(game: PrivateGame): void {
    this.games.set(game.id, game);
  }

  public values(): IterableIterator<PrivateGame> {
    return this.games.values();
  }

  public entries(): IterableIterator<[string, PrivateGame]> {
    return this.games.entries();
  }

  public delete(gameId: string): boolean {
    return this.games.delete(gameId);
  }

  public get size(): number {
    return this.games.size;
  }
}
