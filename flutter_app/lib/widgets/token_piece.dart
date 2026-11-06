// A glossy Ludo pawn painted with Flutter's canvas, in one of the four colours.
import 'package:flutter/material.dart';
import '../theme.dart';

class TokenPiece extends StatelessWidget {
  final LudoColor color;
  final double size;
  const TokenPiece({super.key, required this.color, this.size = 32});

  @override
  Widget build(BuildContext context) => CustomPaint(size: Size.square(size), painter: _PawnPainter(ludoShades[color]!));
}

class _PawnPainter extends CustomPainter {
  final LudoShades c;
  _PawnPainter(this.c);

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 100; // the pawn is designed on a 100 x 100 grid
    canvas.scale(s);
    final white = Paint()..color = Colors.white;

    // shadow on the board
    canvas.drawOval(Rect.fromCenter(center: const Offset(50, 90), width: 60, height: 14), Paint()..color = Colors.black.withAlpha(72));
    // base
    canvas.drawOval(Rect.fromCenter(center: const Offset(50, 82), width: 62, height: 22), Paint()..color = c.dark);
    // body
    final body = Path()
      ..moveTo(22, 80)
      ..quadraticBezierTo(25, 58, 40, 50)
      ..lineTo(60, 50)
      ..quadraticBezierTo(75, 58, 78, 80)
      ..quadraticBezierTo(50, 92, 22, 80)
      ..close();
    canvas.drawPath(
      body,
      Paint()..shader = LinearGradient(colors: [c.dark, c.main, c.dark], stops: const [0, 0.45, 1]).createShader(const Rect.fromLTWH(22, 50, 56, 40)),
    );
    canvas.drawPath(body, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3
      ..color = Colors.white);
    // head
    const head = Offset(50, 34);
    canvas.drawCircle(
      head,
      22,
      Paint()
        ..shader = RadialGradient(center: const Alignment(-0.25, -0.35), radius: 0.9, colors: [c.light, c.main, c.dark], stops: const [0, 0.55, 1])
            .createShader(Rect.fromCircle(center: head, radius: 22)),
    );
    canvas.drawCircle(head, 22, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.5
      ..color = Colors.white);
    canvas.drawCircle(head, 8.5, white..color = Colors.white.withAlpha(235));
    // shine
    canvas.drawOval(Rect.fromCenter(center: const Offset(42, 24), width: 12, height: 8), Paint()..color = Colors.white.withAlpha(140));
  }

  @override
  bool shouldRepaint(covariant _PawnPainter old) => old.c != c;
}
