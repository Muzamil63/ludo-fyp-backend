// First screen: logo, "Play as guest", "Log in", "Create account", and the server settings gear.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/auth_state.dart';
import '../../state/notifications.dart';
import '../../theme.dart';
import '../../widgets/common.dart';
import '../../widgets/form_widgets.dart';
import '../../widgets/gradient_button.dart';
import '../../widgets/logo.dart';
import 'login_screen.dart';
import 'register_screen.dart';
import 'server_settings_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  void _push(BuildContext context, Widget page) => Navigator.of(context).push(MaterialPageRoute(builder: (_) => page));

  // Asks for an optional name, then logs in as a guest (same phone = same guest).
  void _playAsGuest(BuildContext context) {
    final name = TextEditingController();
    showAppSheet(context, title: 'Play as Guest', builder: (sheetContext) {
      var loading = false;
      return StatefulBuilder(
        builder: (ctx, setSheetState) => Column(children: [
          AppTextField(label: 'Your name (optional)', hint: 'e.g. Ali', icon: Icons.person, controller: name, maxLength: 50),
          GradientButton(
            title: "Let's Play",
            variant: ButtonVariant.gold,
            loading: loading,
            onPressed: () async {
              setSheetState(() => loading = true);
              try {
                await context.read<AuthState>().playAsGuest(name.text.trim());
                if (sheetContext.mounted) Navigator.of(sheetContext).pop();
              } catch (err) {
                showError(err);
                setSheetState(() => loading = false);
              }
            },
          ),
        ]),
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final serverUrl = context.watch<AuthState>().serverUrl;
    return Scaffold(
      body: AppBackground(
        child: Stack(children: [
          Positioned(
            top: 8,
            right: 12,
            child: IconButton(icon: const Icon(Icons.settings, color: AppColors.textDim), onPressed: () => _push(context, const ServerSettingsScreen())),
          ),
          Column(children: [
            const Expanded(
              child: Center(
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  Logo(),
                  SizedBox(height: 14),
                  Text('Roll. Race. Rule the board.', style: TextStyle(color: AppColors.textDim, fontSize: 16, letterSpacing: 1)),
                ]),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 20),
              child: Column(children: [
                GradientButton(title: 'Play as Guest', icon: Icons.person, variant: ButtonVariant.gold, onPressed: () => _playAsGuest(context)),
                const SizedBox(height: 12),
                GradientButton(title: 'Log In', icon: Icons.login, onPressed: () => _push(context, const LoginScreen())),
                const SizedBox(height: 12),
                GradientButton(title: 'Create Account', icon: Icons.person_add, variant: ButtonVariant.ghost, onPressed: () => _push(context, const RegisterScreen())),
                const SizedBox(height: 18),
                const Text('Guests can play vs computer, online and join rooms.\nCreate an account for friends, rooms and tournaments.',
                    textAlign: TextAlign.center, style: AppText.small),
                const SizedBox(height: 8),
                Text('Server: $serverUrl', style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
              ]),
            ),
          ]),
        ]),
      ),
    );
  }
}
