// The "LUDO ARENA" logo: four bouncing tokens in the Ludo colours above the title.
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme.dart';
import 'token_piece.dart';

class Logo extends StatefulWidget {
  final double scale;
  const Logo({super.key, this.scale = 1});
  @override
  State<Logo> createState() => _LogoState();
}

class _LogoState extends State<Logo> with SingleTickerProviderStateMixin {
  late final AnimationController _bounce = AnimationController(vsync: this, duration: const Duration(milliseconds: 2200))..repeat();

  @override
  void dispose() {
    _bounce.dispose();
    super.dispose();
  }

  // Each token jumps once per loop, one after the other.
  double _jump(int i) {
    final t = (_bounce.value * 2.2 - i * 0.16).clamp(0.0, 1.0);
    return t < 0.33 ? -12 * sin(t / 0.33 * pi) : 0;
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.scale;
    return Column(mainAxisSize: MainAxisSize.min, children: [
      SizedBox(
        height: 70 * s,
        child: AnimatedBuilder(
          animation: _bounce,
          builder: (context, _) => Row(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (var i = 0; i < 4; i++)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: Transform.translate(offset: Offset(0, _jump(i)), child: TokenPiece(color: LudoColor.values[i], size: 44 * s)),
              ),
          ]),
        ),
      ),
      Text('LUDO',
          style: TextStyle(
            color: Colors.white,
            fontSize: 54 * s,
            fontWeight: FontWeight.w900,
            letterSpacing: 6,
            shadows: const [Shadow(color: Color(0xE67C5CFF), blurRadius: 18)],
          )),
      Transform.translate(
        offset: const Offset(0, -6),
        child: Text('ARENA', style: TextStyle(color: AppColors.gold, fontSize: 18 * s, fontWeight: FontWeight.w900, letterSpacing: 10 * s)),
      ),
    ]);
  }
}
