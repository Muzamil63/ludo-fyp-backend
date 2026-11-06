# CLAUDE.md — Ludo Arena mobile app (React Native)

Android app for the Ludo FYP. **React Native CLI 0.87.1 + TypeScript**, talks to the backend in [../backend](../backend) over REST + Socket.IO.
Backend rules, API and socket events: [../CLAUDE.md](../CLAUDE.md) §8–§9. Run steps: [README.md](README.md).

## Rules
1. **Readable code first.** This is an FYP: the student explains every file in the viva. One screen = one file, short components, a 1–2 line comment at the top of every file, comments on the *why*.
2. **Libraries are fine** when they help (navigation, socket, storage, SVG, gradients, icons, pickers). Prefer well-known ones.
3. **Beautiful UI.** Dark purple "arena" theme with gold accents and glossy Ludo colours. All colours, gradients and sizes live in `src/theme.ts`, so don't hard-code new colours in screens.
4. **The server decides the game.** The app only sends `game:roll` / `game:move` and draws what the server sends back. Never move tokens locally without a server event.
5. **snake_case API data** is used as-is (same field names as the backend). Types are in `src/types.ts`.
6. All REST calls go through `src/api/endpoints.ts` (one function per endpoint), and all socket acks go through `emitAck()` in `src/api/socket.ts`.

## Structure
```
App.tsx                      providers + navigation container
src/
  config.ts                  default server address
  theme.ts                   colours, gradients, sizes, avatars
  types.ts                   API data shapes
  storage.ts                 AsyncStorage: token, guest device id, server url
  api/client.ts              fetch wrapper (JWT, errors, timeout)
  api/endpoints.ts           every REST endpoint
  api/socket.ts              Socket.IO connect + emitAck()
  context/AuthContext.tsx    login state, socket connection, session restore
  context/NotificationContext.tsx  toasts + live invites / tournament alerts
  hooks/useSocketEvent.ts    listen to a socket event in a screen
  hooks/useNow.ts            ticking clock for countdowns
  game/boardLayout.ts        15x15 board geometry (pure, unit tested)
  game/rules.ts              which tokens can move (mirror of the backend rule)
  navigation/                AppNavigator (stack + tabs), types, navigationRef
  components/                ScreenBackground, GameButton, GlassCard, LudoBoard, Dice, TokenPiece, PlayerPanel, …
  screens/auth|home|game|rooms|tournaments|social/
__tests__/boardLayout.test.ts
```

## Board model (must match the backend)
- Token `position`: -1 base, 0–50 track, 51–55 home column, 56 home. Shared square = `(START_OFFSET[color] + position) % 52`. Offsets: red 0, green 13, yellow 26, blue 39.
- `TRACK` in `boardLayout.ts` lists the 52 squares clockwise from red's start (6,1). Red base is top-left, green top-right, yellow bottom-right, blue bottom-left. The 4 inner corners are diagonal steps, as on a real board.
- The board is rotated so **my colour is always bottom-left** (`ROTATION`), and tokens are counter-rotated so they stay upright.

## Commands (inside `mobile/`)
```
npm install
npm start                 # Metro bundler
npm run android           # build + install on emulator / phone
npm test                  # board layout unit tests
npx tsc --noEmit          # type check
```

## Gotchas
- RN 0.87: `StatusBar` has no `translucent` / `backgroundColor` props (edge-to-edge is always on), and `StyleSheet.absoluteFillObject` no longer exists, so write the absolute style out. Use `React.ComponentRef<typeof TextInput>` for refs.
- Every match event from the server carries `match_id`. Screens must ignore events for other matches, because a socket can still be in an old match's room. Leave with `match:leave` when the game screen closes.
- Game screens are opened with `push` (one screen per match). Notifications use `navigationRef`.
- The app allows plain `http://` (`usesCleartextTraffic="true"` in AndroidManifest), so the APK can reach a PC on Wi-Fi.
- Only `arm64-v8a,x86_64` are built (`android/gradle.properties`), for faster builds.
- On Windows the workspace path has spaces, so quote paths. Run Gradle from PowerShell: `& ".\gradlew.bat" assembleDebug`.
