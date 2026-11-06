# Ludo Arena — Flutter app

The same Ludo game as the React Native app in [../mobile](../mobile), written in **Flutter**. It uses the same backend ([../backend](../backend)) with no backend changes, and has the same screens and the same dark "arena" design.

## First-time setup (on the PC where you run it)

You need the Flutter SDK, Android Studio (or just the Android SDK) and an emulator or a phone.

1. Copy the whole `flutter_app` folder to that PC.
2. In PowerShell, inside `flutter_app`:
   ```powershell
   .\setup.ps1
   ```
   This does three things:
   - runs `flutter create --platforms=android .`, which generates the `android/` folder and keeps our `lib/`, `test/` and `pubspec.yaml`
   - adds the **INTERNET** permission and allows plain **http://** in `AndroidManifest.xml`
   - runs `flutter pub get`
3. Start the backend (`cd backend && npm run dev`), start an emulator or plug in a phone, then:
   ```powershell
   flutter run
   ```

### Doing step 2 by hand
If you'd rather not run the script:
1. Run `flutter create --platforms=android --org com.ludoarena --project-name ludo_arena .`
2. Open `android/app/src/main/AndroidManifest.xml`.
   - Above `<application`, add `<uses-permission android:name="android.permission.INTERNET" />`.
   - Inside the `<application` tag, add `android:usesCleartextTraffic="true"`.
3. Run `flutter pub get`.

## Connecting to the backend

In the app, tap ⚙️ (top right of the start screen, or Profile → Server settings), choose or type the address, press **Test**, then **Save**:

| Where the app runs | Server address |
|--------------------|----------------|
| Android emulator | `http://10.0.2.2:3000` (default) |
| Phone on USB | `adb reverse tcp:3000 tcp:3000`, then `http://localhost:3000` |
| Phone on the same Wi-Fi | `http://<PC IP from ipconfig>:3000` (allow Node in Windows Firewall) |

## Commands

```powershell
flutter run                          # run on emulator / phone
flutter analyze                      # check the code (0 issues when it was handed over)
flutter test                         # board geometry, rules, helpers and widget smoke tests (12 tests)
flutter test test_live/              # with the backend running on localhost:3000: plays a full match through the real API + socket code
flutter build apk --release          # APK to share: build/app/outputs/flutter-apk/app-release.apk
```

## Demo accounts

`demo1` … `demo4`, password `password123`. demo1 owns the "Demo Cup" tournament. Pick **Demo** rules for quick games (1 token home wins).

## Packages

| Package | Used for |
|---------|----------|
| `http` | REST API calls (`lib/api/api_client.dart`) |
| `socket_io_client` | the live game (`lib/api/socket_service.dart`) |
| `shared_preferences` | remembering the login token, the guest device id and the server address |
| `provider` | sharing the login state (`AuthState`) with every screen |

The board, the tokens and the dice are drawn with Flutter's own `CustomPainter`, so they need no extra packages.
