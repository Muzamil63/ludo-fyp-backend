# Ludo Arena — mobile app

React Native (Android) app for the Ludo FYP. It needs the backend from [../backend](../backend) running.

## Run it

1. Start MySQL and the backend: `cd backend && npm run dev`. It runs at http://localhost:3000.
2. Install the app's packages:
   ```bash
   cd mobile
   npm install
   ```
3. Start an Android emulator (Android Studio → Device Manager), or plug in a phone with USB debugging.
4. Run:
   ```bash
   npm run android
   ```
   This builds the app, installs it and starts Metro. The first build takes 10–30 minutes.

## Connecting to the backend

Open the app → ⚙️ (top right of the start screen, or Profile → Server settings), pick an address, press **Test**, then **Save**:

| Where the app runs | Server address |
|--------------------|----------------|
| Android emulator | `http://10.0.2.2:3000` (default) |
| Phone on USB | run `adb reverse tcp:3000 tcp:3000`, then use `http://localhost:3000` |
| Phone on the same Wi-Fi | `http://<PC IP from ipconfig>:3000`, and allow Node in Windows Firewall |

If the backend uses another port (e.g. `PORT=3100` in `backend/.env`), change `3000` to match.

## Demo accounts

`demo1` … `demo4`, password `password123`. demo1 is friends with demo2 and demo3, and owns the "Demo Cup" tournament.

## What's inside

- **Auth:** play as guest (same phone = same guest), register, log in. The session is remembered.
- **Play:** vs computer (2–4 players, 2v2, easy/hard bots), online matchmaking (1v1, 4 players, 2v2), private rooms with a code and friend invites.
- **Board:**
  - an animated 15×15 board with tokens that slide square by square
  - your colour always at the bottom-left
  - glowing tokens you can move
  - a dice with roll animation
  - turn timers, auto-move when time runs out, and a results screen
- **Tournaments:**
  - create, edit, invite friends, join or leave
  - creator controls: start, cancel, remove players, change a match time, start a match now
  - a bracket with times and winners
  - a lobby that starts the match early when everyone is there
  - the champion, plus live notifications
- **Social:** friends (requests, search), invitations inbox, profile with emoji avatar and stats, leaderboard.

## Build an APK to share

```bash
cd mobile/android
./gradlew assembleRelease     # Windows PowerShell: & ".\gradlew.bat" assembleRelease
```
The APK is in `android/app/build/outputs/apk/release/app-release.apk`. It's signed with the debug key, which is fine for a demo but not for the Play Store.
