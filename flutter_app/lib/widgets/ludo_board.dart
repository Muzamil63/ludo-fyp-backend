// The Ludo board: painted on a canvas (bases, track, stars, home triangles) + the tokens on top.
// Tokens slide square by square when they move. Tokens the player can move pulse and are tappable.
// The whole board is rotated so the player's own colour is always at the bottom-left.
import 'dart:math';
import 'package:flutter/material.dart';
import '../game/board_layout.dart';
import '../models.dart';
import '../theme.dart';
import 'token_piece.dart';

class LudoBoard extends StatelessWidget {
  final double size;
  final List<Token> tokens;
  final LudoColor? myColor;
  final LudoColor? activeColor;
  final List<int> movableTokenIds;
  final void Function(int tokenId) onTokenTap;

  const LudoBoard({
    super.key,
    required this.size,
    required this.tokens,
    this.myColor,
    this.activeColor,
    required this.movableTokenIds,
    required this.onTokenTap,
  });

  @override
  Widget build(BuildContext context) {
    final cell = size / boardCells;
    final turns = myColor == null ? 0 : rotationTurns[myColor]!;

    // Tokens on the same square are shrunk and spread a little so all of them stay visible.
    final groups = <String, List<Token>>{};
    for (final t in tokens) {
      groups.putIfAbsent(squareKey(t.color, t.position, t.tokenNo), () => []).add(t);
    }

    final tokenWidgets = <Widget>[];
    for (final t in tokens) {
      final group = groups[squareKey(t.color, t.position, t.tokenNo)]!;
      final crowded = group.length > 1;
      final tokenSize = cell * (crowded ? 0.78 : 1.0);
      final spread = crowded ? (group.indexOf(t) - (group.length - 1) / 2) * cell * 0.28 : 0.0;
      final p = tokenPoint(t.color, t.position, t.tokenNo);
      final target = Offset(p.dx * cell - tokenSize / 2 + spread, p.dy * cell - tokenSize / 2 - (crowded ? spread * 0.3 : 0));
      tokenWidgets.add(_AnimatedToken(
        key: ValueKey(t.tokenId),
        token: t,
        cell: cell,
        tokenSize: tokenSize,
        target: target,
        counterTurns: -turns,
        selectable: movableTokenIds.contains(t.tokenId),
        onTap: () => onTokenTap(t.tokenId),
      ));
    }
    // movable tokens on top so they are easy to tap
    tokenWidgets.sort((a, b) => ((a as _AnimatedToken).selectable ? 1 : 0) - ((b as _AnimatedToken).selectable ? 1 : 0));

    return Container(
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        color: const Color(0xFF2A1E66),
        borderRadius: BorderRadius.circular(cell * 0.8 + 6),
        border: Border.all(color: AppColors.gold.withAlpha(150), width: 2),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(128), blurRadius: 16, offset: const Offset(0, 8))],
      ),
      child: Transform.rotate(
        angle: turns * pi / 2,
        child: SizedBox(
          width: size,
          height: size,
          child: Stack(children: [
            CustomPaint(size: Size.square(size), painter: _BoardPainter(activeColor)),
            ...tokenWidgets,
          ]),
        ),
      ),
    );
  }
}

// ---------- one token: slides along its path ----------
class _AnimatedToken extends StatefulWidget {
  final Token token;
  final double cell;
  final double tokenSize;
  final Offset target; // top-left pixel position
  final int counterTurns;
  final bool selectable;
  final VoidCallback onTap;

  const _AnimatedToken({
    super.key,
    required this.token,
    required this.cell,
    required this.tokenSize,
    required this.target,
    required this.counterTurns,
    required this.selectable,
    required this.onTap,
  });

  @override
  State<_AnimatedToken> createState() => _AnimatedTokenState();
}

class _AnimatedTokenState extends State<_AnimatedToken> with SingleTickerProviderStateMixin {
  late Offset _pos = widget.target;
  late int _lastPosition = widget.token.position;
  Duration _stepTime = const Duration(milliseconds: 250);
  int _moveId = 0; // a newer move cancels an older animation
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 380), lowerBound: 1, upperBound: 1.22);

  @override
  void initState() {
    super.initState();
    if (widget.selectable) _pulse.repeat(reverse: true);
  }

  @override
  void didUpdateWidget(_AnimatedToken old) {
    super.didUpdateWidget(old);
    if (widget.selectable && !_pulse.isAnimating) _pulse.repeat(reverse: true);
    if (!widget.selectable && _pulse.isAnimating) {
      _pulse.stop();
      _pulse.value = 1;
    }

    final from = _lastPosition;
    final to = widget.token.position;
    if (from == to) {
      if (widget.target != _pos) setState(() => _pos = widget.target); // stacking changed
      return;
    }
    _lastPosition = to;
    _walk(from, to);
  }

  // Step through every square between from and to (captured tokens fly home in one go).
  Future<void> _walk(int from, int to) async {
    final id = ++_moveId;
    final points = movePath(widget.token.color, from, to, widget.token.tokenNo)
        .map((p) => Offset(p.dx * widget.cell - widget.tokenSize / 2, p.dy * widget.cell - widget.tokenSize / 2))
        .toList();
    if (points.isEmpty) {
      points.add(widget.target);
    } else {
      points[points.length - 1] = widget.target; // the final spot includes the stacking offset
    }
    _stepTime = Duration(milliseconds: to < 0 ? 420 : 140);
    for (final p in points) {
      if (!mounted || id != _moveId) return;
      setState(() => _pos = p);
      await Future.delayed(_stepTime);
    }
  }

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = widget.tokenSize;
    return AnimatedPositioned(
      duration: _stepTime,
      curve: Curves.easeOut,
      left: _pos.dx,
      top: _pos.dy,
      width: size,
      height: size,
      child: ScaleTransition(
        scale: _pulse,
        child: Transform.rotate(
          angle: widget.counterTurns * pi / 2, // keep the pawn upright on a rotated board
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: widget.selectable ? widget.onTap : null,
            child: Stack(children: [
              if (widget.selectable)
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.gold.withAlpha(64),
                    border: Border.all(color: AppColors.gold, width: 3),
                  ),
                ),
              TokenPiece(color: widget.token.color, size: size),
            ]),
          ),
        ),
      ),
    );
  }
}

// ---------- the static board drawing ----------
class _BoardPainter extends CustomPainter {
  final LudoColor? activeColor;
  _BoardPainter(this.activeColor);

  static const _colors = LudoColor.values;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / boardCells;
    final grid = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8
      ..color = const Color(0xFFCFC8B8);

    void cell(int r, int c, Color fill) {
      final rect = Rect.fromLTWH(c * s, r * s, s, s);
      canvas.drawRect(rect, Paint()..color = fill);
      canvas.drawRect(rect, grid);
    }

    // board background
    canvas.drawRRect(RRect.fromRectAndRadius(Offset.zero & size, Radius.circular(s * 0.6)), Paint()..color = const Color(0xFFFFFDF7));

    // the 4 bases
    for (final color in _colors) {
      final shade = ludoShades[color]!;
      final r = baseOrigin[color]![0].toDouble();
      final c = baseOrigin[color]![1].toDouble();
      canvas.drawRect(Rect.fromLTWH(c * s, r * s, 6 * s, 6 * s), Paint()..color = shade.main);
      final inner = RRect.fromRectAndRadius(Rect.fromLTWH((c + 1) * s, (r + 1) * s, 4 * s, 4 * s), Radius.circular(s * 0.7));
      canvas.drawRRect(inner, Paint()..color = Colors.white);
      final active = color == activeColor;
      canvas.drawRRect(inner, Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = active ? 4 : 1.5
        ..color = active ? AppColors.gold : shade.dark);
      for (final slot in const [[2, 2], [2, 4], [4, 2], [4, 4]]) {
        final centre = Offset((c + slot[1]) * s, (r + slot[0]) * s);
        canvas.drawCircle(centre, s * 0.62, Paint()..color = shade.light);
        canvas.drawCircle(centre, s * 0.62, Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2
          ..color = shade.main);
      }
    }

    // the shared track: start squares are coloured
    for (var i = 0; i < track.length; i++) {
      final startOf = _colors.where((col) => startOffset[col] == i).firstOrNull;
      cell(track[i][0], track[i][1], startOf == null ? Colors.white : ludoShades[startOf]!.main);
    }
    // home columns
    for (final color in _colors) {
      for (final sq in homeColumn[color]!) {
        cell(sq[0], sq[1], ludoShades[color]!.main);
      }
    }
    // stars: grey on safe squares, white on the start squares
    for (final i in safeCells) {
      final isStart = startOffset.values.contains(i);
      final centre = Offset((track[i][1] + 0.5) * s, (track[i][0] + 0.5) * s);
      canvas.drawPath(_star(centre, s * 0.37, s * 0.15), Paint()..color = isStart ? Colors.white.withAlpha(220) : const Color(0xFFC9C1AE));
    }

    // centre: 4 triangles meeting in the middle
    final m = Offset(7.5 * s, 7.5 * s);
    void triangle(Offset a, Offset b, LudoColor color) =>
        canvas.drawPath(Path()..moveTo(a.dx, a.dy)..lineTo(b.dx, b.dy)..lineTo(m.dx, m.dy)..close(), Paint()..color = ludoShades[color]!.main);
    triangle(Offset(6 * s, 6 * s), Offset(6 * s, 9 * s), LudoColor.red);
    triangle(Offset(6 * s, 6 * s), Offset(9 * s, 6 * s), LudoColor.green);
    triangle(Offset(9 * s, 6 * s), Offset(9 * s, 9 * s), LudoColor.yellow);
    triangle(Offset(6 * s, 9 * s), Offset(9 * s, 9 * s), LudoColor.blue);
    canvas.drawCircle(m, s * 0.45, Paint()..color = Colors.white.withAlpha(230));
  }

  // A 5-pointed star (for the safe squares).
  Path _star(Offset c, double outer, double inner) {
    final path = Path();
    for (var i = 0; i < 10; i++) {
      final r = i.isEven ? outer : inner;
      final a = pi / 5 * i - pi / 2;
      final p = Offset(c.dx + r * cos(a), c.dy + r * sin(a));
      i == 0 ? path.moveTo(p.dx, p.dy) : path.lineTo(p.dx, p.dy);
    }
    return path..close();
  }

  @override
  bool shouldRepaint(covariant _BoardPainter old) => old.activeColor != activeColor;
}
