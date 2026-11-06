// The dice. Spins and shows random faces while rolling, then lands on the value the server rolled.
import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';

class DiceView extends StatefulWidget {
  final int? value;
  final bool rolling;
  final VoidCallback? onTap; // null = not my turn to roll
  final Color glowColor;
  final double size;
  const DiceView({super.key, this.value, required this.rolling, this.onTap, this.glowColor = AppColors.gold, this.size = 60});

  @override
  State<DiceView> createState() => _DiceViewState();
}

class _DiceViewState extends State<DiceView> with TickerProviderStateMixin {
  // Which of the 9 spots (3 x 3 grid) have a pip, for faces 1..6.
  static const _pips = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  late final AnimationController _spin = AnimationController(vsync: this, duration: const Duration(milliseconds: 420));
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 500), lowerBound: 1, upperBound: 1.1);
  Timer? _shuffle;
  int _face = 6;

  @override
  void initState() {
    super.initState();
    _face = widget.value ?? 6;
    _sync();
  }

  @override
  void didUpdateWidget(DiceView old) {
    super.didUpdateWidget(old);
    if (!widget.rolling && widget.value != null) _face = widget.value!;
    _sync();
  }

  // Start / stop the spin and the "tap me" pulse to match the current props.
  void _sync() {
    if (widget.rolling) {
      if (!_spin.isAnimating) _spin.repeat();
      _shuffle ??= Timer.periodic(const Duration(milliseconds: 80), (_) => setState(() => _face = 1 + Random().nextInt(6)));
    } else {
      _spin.stop();
      _spin.value = 0;
      _shuffle?.cancel();
      _shuffle = null;
    }
    final canRoll = widget.onTap != null && !widget.rolling;
    if (canRoll && !_pulse.isAnimating) {
      _pulse.repeat(reverse: true);
    } else if (!canRoll) {
      _pulse.stop();
      _pulse.value = 1;
    }
  }

  @override
  void dispose() {
    _shuffle?.cancel();
    _spin.dispose();
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.size;
    final pip = size * 0.17;
    return GestureDetector(
      onTap: widget.rolling ? null : widget.onTap,
      child: AnimatedBuilder(
        animation: Listenable.merge([_spin, _pulse]),
        builder: (context, child) => Transform.scale(
          scale: _pulse.value,
          child: Transform.rotate(angle: _spin.value * 2 * pi, child: child),
        ),
        child: Container(
          width: size + 18,
          height: size + 18,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular((size + 18) * 0.3),
            border: Border.all(color: widget.glowColor, width: 3),
            color: Colors.white.withAlpha(20),
            boxShadow: [BoxShadow(color: widget.glowColor.withAlpha(150), blurRadius: 14)],
          ),
          alignment: Alignment.center,
          child: Container(
            width: size,
            height: size,
            padding: EdgeInsets.all(size * 0.12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(size * 0.24),
              border: const Border(bottom: BorderSide(color: Color(0xFFC9CDE6), width: 5)),
            ),
            child: Column(children: [
              for (var row = 0; row < 3; row++)
                Expanded(
                  child: Row(children: [
                    for (var col = 0; col < 3; col++)
                      Expanded(
                        child: Center(
                          child: _pips[_face]!.contains(row * 3 + col)
                              ? Container(
                                  width: pip,
                                  height: pip,
                                  decoration: BoxDecoration(shape: BoxShape.circle, color: _face == 1 ? AppColors.danger : const Color(0xFF1B1F3B)),
                                )
                              : null,
                        ),
                      ),
                  ]),
                ),
            ]),
          ),
        ),
      ),
    );
  }
}
