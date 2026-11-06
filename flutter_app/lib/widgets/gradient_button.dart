// The app's main button: glossy gradient, shrinks a little when pressed, optional icon and loading spinner.
import 'package:flutter/material.dart';
import '../theme.dart';

enum ButtonVariant { primary, gold, danger, success, ghost }

enum ButtonSize { lg, md, sm }

class GradientButton extends StatefulWidget {
  final String title;
  final VoidCallback? onPressed;
  final ButtonVariant variant;
  final ButtonSize size;
  final IconData? icon;
  final bool loading;
  final bool expand;

  const GradientButton({
    super.key,
    required this.title,
    this.onPressed,
    this.variant = ButtonVariant.primary,
    this.size = ButtonSize.lg,
    this.icon,
    this.loading = false,
    this.expand = true,
  });

  @override
  State<GradientButton> createState() => _GradientButtonState();
}

class _GradientButtonState extends State<GradientButton> {
  bool _pressed = false;

  static const _gradients = {
    ButtonVariant.primary: AppGradients.primary,
    ButtonVariant.gold: AppGradients.gold,
    ButtonVariant.danger: AppGradients.danger,
    ButtonVariant.success: AppGradients.success,
  };

  @override
  Widget build(BuildContext context) {
    final disabled = widget.onPressed == null || widget.loading;
    final textColor = widget.variant == ButtonVariant.gold ? AppColors.goldText : Colors.white;
    final height = switch (widget.size) { ButtonSize.lg => 56.0, ButtonSize.md => 46.0, ButtonSize.sm => 36.0 };
    final fontSize = switch (widget.size) { ButtonSize.lg => 17.0, ButtonSize.md => 15.0, ButtonSize.sm => 13.0 };
    final ghost = widget.variant == ButtonVariant.ghost;

    final content = widget.loading
        ? SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2.5, color: textColor))
        : Row(mainAxisSize: MainAxisSize.min, children: [
            if (widget.icon != null) ...[Icon(widget.icon, color: textColor, size: fontSize + 4), const SizedBox(width: 8)],
            Flexible(
              child: Text(widget.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: textColor, fontSize: fontSize, fontWeight: FontWeight.w900, letterSpacing: 0.4)),
            ),
          ]);

    return Opacity(
      opacity: widget.onPressed == null ? 0.45 : 1,
      child: GestureDetector(
        onTapDown: disabled ? null : (_) => setState(() => _pressed = true),
        onTapUp: disabled ? null : (_) => setState(() => _pressed = false),
        onTapCancel: () => setState(() => _pressed = false),
        onTap: disabled ? null : widget.onPressed,
        child: AnimatedScale(
          scale: _pressed ? 0.96 : 1,
          duration: const Duration(milliseconds: 90),
          child: Container(
            height: height,
            width: widget.expand ? double.infinity : null,
            padding: const EdgeInsets.symmetric(horizontal: 18),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(22),
              gradient: ghost ? null : LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: _gradients[widget.variant]!),
              color: ghost ? Colors.white.withAlpha(15) : null,
              border: ghost ? Border.all(color: Colors.white.withAlpha(64), width: 1.5) : null,
              boxShadow: ghost ? null : [BoxShadow(color: Colors.black.withAlpha(70), blurRadius: 10, offset: const Offset(0, 4))],
            ),
            child: Stack(alignment: Alignment.center, children: [
              // glossy highlight on the top half
              if (!ghost)
                Positioned(
                  top: 0,
                  left: -18,
                  right: -18,
                  height: height / 2,
                  child: Container(
                    decoration: BoxDecoration(color: Colors.white.withAlpha(36), borderRadius: const BorderRadius.vertical(top: Radius.circular(22))),
                  ),
                ),
              content,
            ]),
          ),
        ),
      ),
    );
  }
}
