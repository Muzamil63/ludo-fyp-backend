// Small shared widgets used by every screen: background, header, card, avatar, status pill,
// empty state, loading, section title and the bottom sheet helper.
import 'package:flutter/material.dart';
import '../theme.dart';
import 'gradient_button.dart';

/// Full-screen background: deep purple gradient + soft glows in the 4 Ludo colours.
class AppBackground extends StatelessWidget {
  final Widget child;
  final bool safeBottom;
  const AppBackground({super.key, required this.child, this.safeBottom = true});

  Widget _glow(Color color, double size, {double? top, double? left, double? right, double? bottom}) => Positioned(
        top: top,
        left: left,
        right: right,
        bottom: bottom,
        child: IgnorePointer(
          child: Container(
            width: size,
            height: size,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: RadialGradient(colors: [color.withAlpha(90), color.withAlpha(0)]),
            ),
          ),
        ),
      );

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: AppGradients.background),
      ),
      child: Stack(children: [
        _glow(ludoShades[LudoColor.red]!.main, 320, top: -120, left: -140),
        _glow(ludoShades[LudoColor.blue]!.main, 340, top: 140, right: -170),
        _glow(ludoShades[LudoColor.green]!.main, 300, bottom: 80, left: -160),
        _glow(ludoShades[LudoColor.yellow]!.main, 280, bottom: -120, right: -100),
        SafeArea(bottom: safeBottom, child: child),
      ]),
    );
  }
}

/// Screen title bar: round back button, title (+ subtitle) and an optional widget on the right.
class AppHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final bool back;
  final Widget? right;
  final VoidCallback? onBack;
  const AppHeader({super.key, required this.title, this.subtitle, this.back = true, this.right, this.onBack});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
      child: Row(children: [
        if (back)
          InkWell(
            borderRadius: BorderRadius.circular(21),
            onTap: onBack ?? () => Navigator.of(context).maybePop(),
            child: Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withAlpha(26),
                border: Border.all(color: Colors.white.withAlpha(38)),
              ),
              child: const Icon(Icons.chevron_left, color: Colors.white, size: 26),
            ),
          ),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(left: back ? 12 : 0, right: 8),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(title, style: AppText.title, maxLines: 1, overflow: TextOverflow.ellipsis),
              if (subtitle != null) Text(subtitle!, style: const TextStyle(color: AppColors.textDim, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis),
            ]),
          ),
        ),
        if (right != null) right!,
      ]),
    );
  }
}

/// A frosted-glass looking card. Optional coloured border and tap action.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final Color? highlight;
  final VoidCallback? onTap;
  const GlassCard({super.key, required this.child, this.padding = const EdgeInsets.all(16), this.margin = EdgeInsets.zero, this.highlight, this.onTap});

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(22),
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: AppGradients.card),
        border: Border.all(color: highlight ?? AppColors.cardBorder, width: highlight != null ? 1.5 : 1),
      ),
      child: child,
    );
    return Padding(
      padding: margin,
      child: onTap == null ? card : InkWell(borderRadius: BorderRadius.circular(22), onTap: onTap, child: card),
    );
  }
}

/// Round player picture: emoji avatar or initials, with an optional coloured ring.
class AvatarCircle extends StatelessWidget {
  final String? avatar;
  final String name;
  final double size;
  final Color? ring;
  final bool dim;
  const AvatarCircle({super.key, this.avatar, this.name = '?', this.size = 44, this.ring, this.dim = false});

  @override
  Widget build(BuildContext context) {
    final initials = name.trim().isEmpty ? '?' : name.trim().substring(0, name.trim().length >= 2 ? 2 : 1).toUpperCase();
    return Opacity(
      opacity: dim ? 0.45 : 1,
      child: Container(
        width: size + 6,
        height: size + 6,
        decoration: BoxDecoration(shape: BoxShape.circle, border: Border.all(color: ring ?? Colors.white.withAlpha(64), width: 2.5)),
        alignment: Alignment.center,
        child: Container(
          width: size,
          height: size,
          decoration: const BoxDecoration(shape: BoxShape.circle, gradient: LinearGradient(colors: AppGradients.primary)),
          alignment: Alignment.center,
          child: Text(avatar ?? initials,
              style: TextStyle(fontSize: avatar != null ? size * 0.55 : size * 0.38, color: Colors.white, fontWeight: FontWeight.w900)),
        ),
      ),
    );
  }
}

/// Small coloured label for a tournament / match status ("Open", "Live", "Finished" ...).
class StatusPill extends StatelessWidget {
  final String status;
  final String? label;
  const StatusPill({super.key, required this.status, this.label});

  static const _map = {
    'registration': ('Open', AppColors.success),
    'in_progress': ('Live', AppColors.danger),
    'finished': ('Finished', AppColors.textMuted),
    'cancelled': ('Cancelled', AppColors.textMuted),
    'waiting': ('Scheduled', AppColors.info),
    'active': ('Playing', AppColors.success),
    'eliminated': ('Out', AppColors.textMuted),
    'champion': ('Champion', AppColors.gold),
  };

  @override
  Widget build(BuildContext context) {
    final (text, color) = _map[status] ?? (status, AppColors.textDim);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: color.withAlpha(34), borderRadius: BorderRadius.circular(99), border: Border.all(color: color)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (status == 'in_progress') Container(width: 7, height: 7, margin: const EdgeInsets.only(right: 5), decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        Text((label ?? text).toUpperCase(), style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 0.6)),
      ]),
    );
  }
}

/// Friendly placeholder when a list is empty.
class EmptyState extends StatelessWidget {
  final String emoji;
  final String title;
  final String? text;
  final String? actionLabel;
  final VoidCallback? onAction;
  const EmptyState({super.key, required this.emoji, required this.title, this.text, this.actionLabel, this.onAction});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text(emoji, style: const TextStyle(fontSize: 54)),
        const SizedBox(height: 10),
        Text(title, textAlign: TextAlign.center, style: AppText.heading),
        if (text != null)
          Padding(padding: const EdgeInsets.only(top: 6), child: Text(text!, textAlign: TextAlign.center, style: AppText.dim)),
        if (actionLabel != null && onAction != null)
          Padding(padding: const EdgeInsets.only(top: 18), child: GradientButton(title: actionLabel!, variant: ButtonVariant.gold, size: ButtonSize.md, onPressed: onAction)),
      ]),
    );
  }
}

class LoadingView extends StatelessWidget {
  final String? message;
  const LoadingView({super.key, this.message});
  @override
  Widget build(BuildContext context) => Center(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const CircularProgressIndicator(color: AppColors.gold),
          if (message != null) Padding(padding: const EdgeInsets.only(top: 14), child: Text(message!, style: AppText.dim, textAlign: TextAlign.center)),
        ]),
      );
}

class SectionTitle extends StatelessWidget {
  final String text;
  const SectionTitle(this.text, {super.key});
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(top: 22, bottom: 10),
        child: Text(text.toUpperCase(), style: const TextStyle(color: AppColors.textDim, fontSize: 13, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
      );
}

/// A panel that slides up from the bottom (used for "invite friends", "play online" ...).
Future<T?> showAppSheet<T>(BuildContext context, {required String title, required Widget Function(BuildContext) builder}) {
  return showModalBottomSheet<T>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.sheet,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(30))),
    builder: (ctx) => Padding(
      padding: EdgeInsets.fromLTRB(20, 10, 20, MediaQuery.of(ctx).viewInsets.bottom + 24),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.8),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 44, height: 5, decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(3)))),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 14),
          Flexible(child: SingleChildScrollView(child: builder(ctx))),
        ]),
      ),
    ),
  );
}

/// Simple yes / no question. Returns true when the user presses the confirm button.
Future<bool> confirmDialog(BuildContext context, String title, String message, {String yes = 'Yes'}) async {
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: AppColors.sheet,
      title: Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
      content: Text(message, style: AppText.dim),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
        TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(yes, style: const TextStyle(color: AppColors.danger))),
      ],
    ),
  );
  return result ?? false;
}
