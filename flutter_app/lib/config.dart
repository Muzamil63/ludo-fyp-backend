// App settings. The server address can also be changed inside the app (Settings → Server).
//
// Android emulator   → http://10.0.2.2:3000   (10.0.2.2 = "my computer" seen from the emulator)
// Real phone (Wi-Fi) → http://<your PC's IP from ipconfig>:3000
// Phone with USB + `adb reverse tcp:3000 tcp:3000` → http://localhost:3000
const String defaultServerUrl = 'http://10.0.2.2:3000';

const Duration requestTimeout = Duration(seconds: 12);
