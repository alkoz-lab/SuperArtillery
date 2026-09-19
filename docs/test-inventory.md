# Test inventory (pre-refactor coverage contract)

Captured before the core-extraction refactor. Old tests are **not** repaired when the refactor breaks
them — the suite is deleted in the phase that refactors its subject, and new tests are written at the
level where the behaviour now lives. Every line below must end marked either:

- `covered-by: <new test file :: test name>`
- `dropped: <one-line reason>`

Unclassified lines block the final phase.

Legend for the status column: `[ ]` unclassified · `[x]` covered · `[-]` intentionally dropped.

---

## server/src/tests/api.routes.test.ts — `API routes`

- [ ] creates a game and returns invite details
- [ ] creates a hot-seat game with credentials for both players
- [ ] creates a hot-seat game with up to 9 players
- [ ] accepts an invitation by code
- [ ] requires a session token for status polling
- [ ] returns status for a valid session token
- [ ] rejects a rematch request before the game has finished
- [ ] requires a session token for rematch requests
- [ ] rejects fire without required payload fields
- [ ] reports lightweight health without totals
- [ ] reports stats including webSockets and lifetime totals

## server/src/tests/battlefield.test.ts — `battlefield generation`

> Moved verbatim to `packages/core` (import paths only).

- [ ] reproduces the same battlefield for the same seed
- [ ] places castles on opposite sides and on the terrain surface
- [ ] generates bounded terrain between the castles
- [ ] generates deterministic wind within the supported range
- [ ] generates independent side elevations and bounded middle terrain
- [ ] can generate both a crest and a depression from different seeds

## server/src/tests/gameCleanupService.test.ts — `GameCleanupService`

- [ ] removes an expired pending game and closes its sockets
- [ ] marks an inactive active game expired without deleting it before its expiry
- [ ] removes a finished game after its grace period
- [ ] does not remove a game at the exact expiration boundary

## server/src/tests/gameManager.integration.test.ts — `Integration: Private Games Flow`

### Full game lifecycle
- [ ] Player A creates a game, Player B accepts, both connect
- [ ] Player cannot fire in another player's game
- [ ] Player cannot impersonate other player by changing tokens

### Game expiration and disconnection
- [ ] Pending game expires when initiator disconnects
- [ ] Active game ends when player disconnects

### Turn-based gameplay
- [ ] Only the current turn player can fire

### Cold start and server readiness
- [ ] Health check returns accurate statistics

### Replay and reconnection
- [ ] ignores a stale socket closing after a replacement connects
- [ ] Player can query game status before connecting WebSocket

### Error cases
- [ ] Helpful error when invitation expired
- [ ] Helpful error when game unavailable
- [ ] Server reports when at max capacity

## server/src/tests/gameManager.test.ts — `GameManager`

### createGame
- [ ] creates a game with two empty player slots
- [ ] generates unique opaque game IDs and invitation codes
- [ ] returns invite URL and code separately
- [ ] rejects invalid player names
- [ ] rejects names longer than 15 characters
- [ ] rejects names starting with non-alphanumeric

### acceptInvitation
- [ ] allocates multiple lobby slots and reports readiness
- [ ] lets the creator skip a partially filled lobby and start with two players
- [ ] starts a full three-player lobby and broadcasts the roster to every socket
- [ ] accepts a valid invitation via token
- [ ] accepts a valid invitation via code
- [ ] rejects an unknown invitation
- [ ] rejects a second acceptance of the same invitation
- [ ] rejects invitation with invalid player name
- [ ] generates separate session token for invited player

### getPlayerIdFromToken
- [ ] derives player ID from session token
- [ ] rejects token for different game
- [ ] rejects invalid token

### expiration and cleanup
- [ ] expires pending invitations after TTL
- [ ] removes expired games from memory
- [ ] enforces maximum active games limit

### WebSocket connection
- [ ] connects player via session token
- [ ] rejects invalid session token on WebSocket connect
- [ ] rejects unknown game ID

### fire action
- [ ] starts a hot-seat game from one connected socket
- [ ] starts a hot-seat game with up to 9 players from one connected socket
- [ ] rejects hot-seat creation with fewer than 2 or more than 9 names
- [ ] ends the whole match when the single hot-seat device disconnects
- [ ] accepts fire with valid session token
- [ ] alternates authenticated turns between both players
- [ ] rejects fire with invalid session token
- [ ] validates angle and velocity

### rematch action
- [ ] starts a new round after both players request it
- [ ] counts a hot-seat rematch under totals.device
- [ ] keeps final rematch answers in the status payload before clearing the state

### game statistics
- [ ] returns accurate game count
- [ ] counts only pending invitations

## server/src/tests/gameRules.test.ts — `GameRules`

> Moved to `packages/core` (import paths + `websocket`→`connection` rename only).

- [ ] starts a game when both players have open sockets
- [ ] transitions a pending game to expired when the initiator disconnects
- [ ] finishes an active game when a player disconnects
- [ ] switches turns after a miss and updates activity
- [ ] switches back to player one after player two misses
- [ ] finishes the game after a hit without switching turns
- [ ] waits for both players before starting a rematch
- [ ] clears rematch answers when a final response declines a rematch
- [ ] starts a new round with only the players who stayed in when another player had enough
- [ ] clears rematch readiness when a finished player disconnects

## server/src/tests/invitationService.test.ts — `InvitationService`

- [ ] creates an invite URL that preserves the deployment path
- [ ] accepts an invite once and rejects reuse

## server/src/tests/shotResolver.test.ts

> Moved verbatim to `packages/core` (import paths only).

### calculateCastleHitTime
- [ ] resolves a hit using the canonical battlefield
- [ ] keeps player one firing toward the left castle
- [ ] returns no collision for a projectile that falls short
- [ ] requires the projectile to enter the central 80 percent of the castle
- [ ] does not count a corner touch as a castle hit

### calculateCastleHits
- [ ] pierces every castle in the flat trajectory before the ground stops it

## server/src/tests/tokenService.test.ts — `TokenService`

### generateGameId
- [ ] generates a valid UUID
- [ ] generates unique IDs

### generateSessionToken
- [ ] generates a high-entropy token
- [ ] generates unique tokens

### generateInviteCode
- [ ] generates a 4-character alphanumeric code
- [ ] generates unique codes
- [ ] only uses uppercase letters and numbers

### hashToken
- [ ] produces a consistent hash for the same token
- [ ] produces different hashes for different tokens
- [ ] produces hex-encoded output

### verifyToken
- [ ] returns true for a matching token and hash
- [ ] returns false for a non-matching token and hash
- [ ] returns false for empty token
- [ ] uses constant-time comparison (prevents timing attacks)

### validatePlayerName
- [ ] accepts valid player names
- [ ] rejects empty names
- [ ] rejects names longer than 15 characters
- [ ] rejects names starting with non-alphanumeric character
- [ ] accepts names with spaces and special chars in middle
- [ ] rejects null/undefined

### normalizeName
- [ ] returns trimmed name for valid names
- [ ] returns null for invalid names
- [ ] rejects names exceeding 15 chars

---

## client/src/tests/game-client.test.ts — `GameClient private-game flow`

- [ ] stores a create-game session and exposes it
- [ ] restores a previously saved session from storage
- [ ] returns player id from the stored session when available
- [ ] records only local player shots received from the server
- [ ] dispatches rematch readiness updates from the server
- [ ] applies consecutive turn changes for both players

## client/src/tests/game.test.ts — `Game shot history`

- [ ] keeps the four most recent shots in newest-first order
- [ ] resets the history
- [ ] keeps separate shot history for each player

## client/src/tests/projectile-animator.test.ts — `ProjectileAnimator active trajectory lifecycle`

- [ ] emits an active frame and clears it when stopped
- [ ] clears the active channel when a projectile reaches the terrain
- [ ] notifies completion separately from the active-frame clear

## client/src/tests/renderer.test.ts — `Renderer trajectory styles`

- [ ] draws historical and active trajectories with dark gray styles
- [ ] draws an active trajectory with the same dark gray color
- [ ] uses the requested historical dark gray fade steps
- [ ] applies historical opacity directly to the dark gray stroke
- [ ] draws castle emojis 2px further left and on the ground line
- [ ] replaces the defeated castle emoji with an explosion
- [ ] keeps earlier RIP castles when a later player is defeated
- [ ] chooses two different random castle emoji for each player from the approved set
- [ ] assigns a unique emoji to every local player

## client/src/tests/ui-manager.test.ts — `UIManager private game flow`

- [ ] provides editable server address choices
- [ ] shows server health details after selecting a server
- [ ] checks the preselected server automatically
- [ ] checks the current server when the refresh button is pressed
- [ ] shows a red error when the selected server health check fails
- [ ] shows Create and over Internet as the collapsed default selections
- [ ] allows creating a private game from the lobby
- [ ] creates a game after explicitly selecting Create
- [ ] switches between create modes and starts hot seat on this device
- [ ] supports adding and removing hot-seat players up to a maximum of 9
- [ ] blocks names longer than 15 characters and enforces the HTML max length
- [ ] fires when Enter is pressed in the velocity input
- [ ] restores shot inputs and focuses angle on the active turn
- [ ] enforces angle and velocity limits
- [ ] changes to join mode when Join is selected
- [ ] enables joining only for populated invite-code input and hides server selection for invite links
- [ ] shows invite details after creation
- [ ] controls direction field visibility and default value
- [ ] hides lobby inputs while creating and restores them after an error
- [ ] copies the invite URL to the clipboard when the copy button is clicked
- [ ] hides invite details after a connection timeout
- [ ] updates player names and turn state correctly
- [ ] positions player names at their castle labels when coordinates are provided
- [ ] shows both player names in the game over message
- [ ] offers a rematch after game over and shows waiting state after selection
- [ ] renders angle and velocity as rows with newest-first history columns
