// App settings. The server address can also be changed inside the app (Settings → Server).
//
// The app finds the backend by itself at start (src/api/findServer.ts). It tries, in this order:
//   the saved address → the PC that Metro runs on → http://localhost:3000 (USB + adb reverse) → the emulator address.
// Android emulator  → http://10.0.2.2:3000   (10.0.2.2 = "my computer" seen from the emulator)
// Real phone (Wi-Fi) → http://<your PC's IP from ipconfig>:3000
// Phone with USB + `adb reverse tcp:3000 tcp:3000` → http://localhost:3000
export const SERVER_PORT = 3000;
export const DEFAULT_SERVER_URL = `http://10.0.2.2:${SERVER_PORT}`;

export const REQUEST_TIMEOUT_MS = 12000;
