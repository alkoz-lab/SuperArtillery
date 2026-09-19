import type { GameMessage } from '../contract/messages';

/**
 * A single player's outbound channel. Implemented by a WebSocket on the server and by an
 * in-memory queue in the browser, so the domain never depends on a transport.
 */
export interface PlayerConnection {
  isOpen(): boolean;
  send(message: GameMessage): void;
  close(code?: number, reason?: string): void;
}
