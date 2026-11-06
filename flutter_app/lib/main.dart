// App entry: login state (provider), notifications, theme and the first screen.
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'screens/auth/welcome_screen.dart';
import 'screens/main_tabs.dart';
import 'state/auth_state.dart';
import 'state/notifications.dart';
import 'state/refresh_on_return.dart';
import 'theme.dart';
import 'widgets/common.dart';
import 'widgets/logo.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  final auth = AuthState()..init(); // restores the saved session in the background
  Notifications.instance.start(); // live invites / tournament alerts
  runApp(ChangeNotifierProvider.value(value: auth, child: const LudoApp()));
}

class LudoApp extends StatelessWidget {
  const LudoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Ludo Arena',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      navigatorKey: Notifications.instance.navigatorKey,
      scaffoldMessengerKey: Notifications.instance.messengerKey,
      navigatorObservers: [routeObserver],
      home: const RootGate(),
    );
  }
}

/// Splash while the session is restored, then the welcome screen (logged out) or the main tabs.
class RootGate extends StatelessWidget {
  const RootGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthState>();
    Notifications.instance.myPlayerId = auth.player?.playerId;
    if (auth.booting) {
      return const Scaffold(body: AppBackground(child: Center(child: Logo())));
    }
    return auth.player == null ? const WelcomeScreen() : const MainTabs();
  }
}
