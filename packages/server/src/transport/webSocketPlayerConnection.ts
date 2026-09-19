import { WebSocket } from 'ws';
import type { GameMessage, PlayerConnection } from '@superartillery/core';

/** Adapts a ws socket to the transport-agnostic port the game domain depends on. */
export class WebSocketPlayerConnection implements PlayerConnection {
  constructor(private readonly socket: WebSocket) {}

  public isOpen(): boolean {
    return this.socket.readyState === WebSocket.OPEN;
  }

  public send(message: GameMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  public close(code?: number, reason?: string): void {
    this.socket.close(code, reason);
  }
}
