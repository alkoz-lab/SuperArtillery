# Core Extraction Refactor — Plan And Progress

Working document for the refactor that extracts a transport-independent `packages/core`, enables a
fully offline "on this device" mode, and then splits the oversized classes. Update the status markers
as phases land.

Branch: `Refactor`.

## Goals

1. Extract a `core` package holding all game logic, runnable unchanged in Node and in the browser.
2. Let "on this device" games run entirely in the browser with **zero network calls** and no server
   process, by putting the same core behind a client-side gateway abstraction.
3. Break up the god classes (`GameManager`, `routes/api.ts`, `ui-manager.ts`, `main.ts`, `renderer.ts`).

## Decisions

| Decision | Choice |
| --- | --- |
| Repo layout | npm workspaces: `packages/core`, `packages/server`, `packages/client` |
| Offline fidelity | Full — offline adapter implements the same gateway interface and emits the same OpenAPI-derived message types as the remote one |
| Offline runtime | 100% in-browser; no server process, no `fetch`, no WebSocket |
| Server hot-seat | `/api/v1/hot-seat/games` deprecated once offline mode ships |
| Sequencing | Core extraction first, SOLID splits after |

## Testing policy

Tests broken by the refactor are **not repaired**. Instead:

1. All 158 pre-refactor test titles are archived in [test-inventory.md](test-inventory.md).
2. The phase that refactors a subject deletes its old suite and writes new tests at the level where
   the behaviour now lives.
3. Every inventory line must end marked `covered-by: <new test>` or `dropped: <reason>`.
   Unclassified lines block the final phase.

Exception: a pure fixture *field rename* is cheap enough to apply in place rather than deleting a
suite (done for `gameRules.test.ts` and `gameCleanupService.test.ts` in Phase 2).

## Phases

### Phase 0 — Test inventory — DONE
[test-inventory.md](test-inventory.md) created: 158 titles from 14 files, all unclassified.

### Phase 1 — Workspace scaffolding — DONE
- `client/` → `packages/client`, `server/` → `packages/server`, new `packages/core`.
- Contract types and `CONTRACT_VERSION` generated **only** into `packages/core/src/contract/`;
  server and client re-export from core. The four duplicated generated files were deleted.
- Server consumes core through a TypeScript **project reference** (`core/dist`). Client and both
  Vitest configs **alias** `@superartillery/core` to `core/src/index.ts`, so tests and the browser
  bundle build from core source with no prior build step.
- Core is compiled with `"lib": ["ES2022"]` and `"types": []`. This is the guard that turns any
  Node-only or DOM-only reference in core into a compile error — keep it.
- Single root lockfile; CI, `railway.toml`, `.gitignore` and READMEs updated.

### Phase 2 — De-Node the domain — DONE
`packages/server/src/{services,types,utils}` now contains no reference to `ws`, `node:*`, `crypto`,
`process.env` or `NodeJS.*` types.

- **`PlayerConnection` port** (`isOpen` / `send` / `close`) replaces `ws.WebSocket` in the domain;
  `PlayerSession.websocket` became `connection`. The ws adapter is
  `packages/server/src/transport/webSocketPlayerConnection.ts`. `server.ts` creates exactly one
  adapter per socket and stores it in `connectionMetadata`, because `disconnectPlayer` and
  `broadcastToGame` compare connections by reference identity.
- **Core crypto**, pure TypeScript, no platform ports: `sha256Hex`, `encodeBase64`, `randomBytes`,
  `randomUuid`. The only platform capability required is `globalThis.crypto.getRandomValues`, a
  standard global in both browsers and Node 19+. A port with a weaker browser implementation was
  rejected as a silent security asymmetry. `packages/core/src/crypto/crypto.test.ts` verifies parity
  with Node's `crypto`/`Buffer` using FIPS 180-4 vectors, block/padding boundaries, multi-byte and
  astral characters, and random tokens.
- `Clock`, `TimerScheduler` and an opaque `TimerHandle` are core ports; `NodeJS.Timeout` is gone.
- Origin defaults are injected via `GameManagerOptions`; only `server.ts` reads `process.env`.
- `packages/server/src/http/errorMapper.ts` replaced five duplicated status-code ternaries.
- Deleted `gameManager.test.ts` and `gameManager.integration.test.ts` (49 tests) per the testing
  policy; the inventory records them as awaiting the Phase 3 `GameEngine` suite.
- Scope change: the `Result<T>` / `GameError` migration moved from Phase 2 to Phase 3, to avoid
  churning return shapes immediately before the `GameEngine` facade rewrites those call sites.

### Phase 3 — Extract core — NEXT
Move into `packages/core`: physics, battlefield/terrain, shotResolver, `GameRules`,
`GameRepository`, `GameCleanupService`, `TokenService`, `InvitationService`, `gameConfig`,
`gameErrors`, and the `PrivateGame` domain types. Then:

- Add a `GameEngine` facade with one method per contract operation (`createGame`,
  `acceptInvitation`, `createLocalGame`, `getGameStatus`, `skipWaiting`, `fire`, `requestRematch`,
  `connect`, `disconnect`, `getStats`, `shutdown`) returning `Result<T>` and pushing messages through
  `PlayerConnection`.
- Add `GameMessageFactory` for the `game_start` / `turn_change` / `game_over` / `lobby_status` /
  `rematch_status` payloads currently inlined in `GameManager`.
- Introduce `Result<T>` and `GameError` (deferred from Phase 2).
- Delete the client's duplicated `physics.ts` and `terrain.ts` in favour of core.
- Move `battlefield.test.ts`, `shotResolver.test.ts` and `gameRules.test.ts` to core (import paths only).
- Write the `GameEngine` suite that absorbs the 49 deleted `GameManager` tests, then reconcile those
  inventory lines.

### Phase 4 — Client transport abstraction
`GameGateway` interface whose verbs mirror the REST contract and whose pushes mirror the WebSocket
messages. `RemoteGameGateway` wraps the existing `ApiClient` and `WebSocketClient`. `GameClient`
depends only on the interface. No behaviour change.

### Phase 5 — Offline "on this device"
`LocalGameGateway` owns an in-browser `GameEngine` and fans messages out via `queueMicrotask` so
async ordering matches the socket path. `createMode === 'device'` selects it. Deprecate
`/api/v1/hot-seat/games` in the OpenAPI contract with a version bump, keeping the route for one
release for cached clients.

### Phase 6 — Server splits
`GameManager` → `LobbyService` / `SessionService` / `GameplayService` / `Broadcaster` /
`StatsCollector`. `routes/api.ts` → per-tag route modules plus request-logging middleware and the
`client-base-url` and `uptime` helpers. `server.ts` → `createHttpApp` + `WsConnectionHandler` +
bootstrap.

### Phase 7 — Client splits
`main.ts` → `PendingPresentationQueue`, `roster-view`, `direction-policy`, `server-address`,
`invite-link`. `ui-manager.ts` → `dom/elements` plus Lobby / HotSeat / Game / Rematch / LobbyStatus /
Roster / ServerHealth views. `renderer.ts` → Terrain / Castle / Trajectory / Wind renderers plus
`CastleVisualState`. `game-client.ts` → `GameMessageDispatcher`, `SessionStore`, typed event emitter.

## Current baseline

`npm run build` and `npm test` from the repository root: 9 core + 62 server + 47 client =
**118 tests passing**.

## Open questions

1. Offline games cannot increment `totals.device` in `StatsResponse`. Options: drop the field
   (contract change, recommended), send a best-effort telemetry beacon, or keep it reporting zero.
2. Offline state is lost on page refresh. Options: accept it (recommended — it matches today's
   behaviour after a server restart), or snapshot the engine to `localStorage`.

## Gotchas

- TypeScript 7 **removed** `baseUrl`; `paths` entries resolve relative to the tsconfig.
- Under npm workspaces, `allowScripts` is ignored in package manifests and must live in the **root**
  `package.json`, otherwise esbuild's postinstall stays blocked and Vite/Vitest break.
- The client tsconfig must not glob `../core/src/**/*` into `include`: that drags core's `*.test.ts`
  (which imports `node:crypto` and `Buffer` as a test oracle) into the client program and breaks
  `tsc --noEmit`. The `paths` mapping already pulls in whatever the client imports.
- `server.ts` resolves the OpenAPI document at `../../../contracts/...` from `dist` after the move.
- `vitest run` needs `--passWithNoTests` in a package that has no tests yet.
