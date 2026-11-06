// Colours, gradients and the app theme used by every screen. Change the look of the app here.
import 'package:flutter/material.dart';

class AppColors {
  static const bg = Color(0xFF0B1026);
  static const sheet = Color(0xFF18204E);
  static const card = Color(0x12FFFFFF);
  static const cardBorder = Color(0x1FFFFFFF);
  static const input = Color(0x14FFFFFF);

  static const text = Colors.white;
  static const textDim = Color(0xFFB4BBE0);
  static const textMuted = Color(0xFF7179A6);

  static const primary = Color(0xFF7C5CFF);
  static const gold = Color(0xFFFFC93C);
  static const goldText = Color(0xFF3A2600);
  static const success = Color(0xFF2ECC71);
  static const danger = Color(0xFFFF4D6D);
  static const info = Color(0xFF45AAF2);
}

/// The four Ludo colours. Seat 1 red, 2 green, 3 yellow, 4 blue.
enum LudoColor { red, green, yellow, blue }

LudoColor ludoColorFromName(String name) => LudoColor.values.byName(name);

class LudoShades {
  final Color main;
  final Color light;
  final Color dark;
  const LudoShades(this.main, this.light, this.dark);
}

const Map<LudoColor, LudoShades> ludoShades = {
  LudoColor.red: LudoShades(Color(0xFFEF3B4E), Color(0xFFFF8A96), Color(0xFFA81E2D)),
  LudoColor.green: LudoShades(Color(0xFF1FB860), Color(0xFF7BE3A4), Color(0xFF0E7A3C)),
  LudoColor.yellow: LudoShades(Color(0xFFF8C41D), Color(0xFFFFE27A), Color(0xFFB88A00)),
  LudoColor.blue: LudoShades(Color(0xFF2F7FF0), Color(0xFF86B7FF), Color(0xFF1550A8)),
};

class AppGradients {
  static const background = [Color(0xFF23185E), Color(0xFF121A4A), Color(0xFF0B1026)];
  static const primary = [Color(0xFF9B7BFF), Color(0xFF6A45F5)];
  static const gold = [Color(0xFFFFE08A), Color(0xFFFFB81F)];
  static const danger = [Color(0xFFFF7A8F), Color(0xFFE8304F)];
  static const success = [Color(0xFF5BE59A), Color(0xFF1FAE5B)];
  static const card = [Color(0x1AFFFFFF), Color(0x0AFFFFFF)];
  static const red = [Color(0xFFFF6B7A), Color(0xFFD9263A)];
  static const green = [Color(0xFF4BDA88), Color(0xFF14994C)];
  static const yellow = [Color(0xFFFFD95A), Color(0xFFE6A800)];
  static const blue = [Color(0xFF5FA0FF), Color(0xFF1E64D6)];
}

/// Emoji avatars a player can pick on the profile screen (saved in players.avatar).
const List<String> avatarChoices = ['🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐨', '🐙', '🦄', '🐲', '🤖', '👑'];

class AppText {
  static const title = TextStyle(color: AppColors.text, fontSize: 22, fontWeight: FontWeight.w900);
  static const heading = TextStyle(color: AppColors.text, fontSize: 17, fontWeight: FontWeight.w900);
  static const body = TextStyle(color: AppColors.text, fontSize: 15);
  static const dim = TextStyle(color: AppColors.textDim, fontSize: 14);
  static const small = TextStyle(color: AppColors.textMuted, fontSize: 12);
  static const label = TextStyle(color: AppColors.textDim, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 1);
}

ThemeData buildAppTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: AppColors.bg,
    colorScheme: const ColorScheme.dark(primary: AppColors.gold, secondary: AppColors.primary, surface: AppColors.sheet),
    snackBarTheme: const SnackBarThemeData(behavior: SnackBarBehavior.floating),
  );
}
