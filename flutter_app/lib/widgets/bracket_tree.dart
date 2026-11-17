// The whole knockout tree, round 1 → final: match cards joined by lines (the winner moves to the right).
// It pans both ways and pinch-zooms out, so 64 players (32 first-round matches) fit. Each later match is
// drawn halfway between the matches that feed it (the server sends those as `feeders`). The round chips on top
// jump straight to a round (handy with 6 rounds).
import 'dart:math';
import 'package:flutter/material.dart';
import '../models.dart';
import '../theme.dart';
import '../utils/bracket.dart';
import '../utils/format.dart';

const double _cardW = 172;
const double _colGap = 34; // space between two rounds, where the lines run
const double _rowGap = 14; // space between two first-round cards
const double _headH = 36; // round name above each column
const double _topH = 26; // "M3 · 18:05" row inside a card
const double _seatH = 22;
const double _chipBarH = 46; // the row of round chips above the tree
const _pad = EdgeInsets.symmetric(horizontal: 16, vertical: 12); // space around the tree

class BracketTree extends StatefulWidget {
  final List<TournamentRound> rounds;
  final int? myPlayerId;
  final bool preview; // before the start: the players who joined so far, then "open slot" places
  final void Function(int matchId)? onOpenMatch;
  const BracketTree({super.key, required this.rounds, this.myPlayerId, required this.preview, this.onOpenMatch});
  @override
  State<BracketTree> createState() => _BracketTreeState();
}

class _BracketTreeState extends State<BracketTree> {
  final _view = TransformationController(); // the pan + zoom of the tree, so a round chip can move it

  @override
  void dispose() {
    _view.dispose();
    super.dispose();
  }

  double _x(int r) => r * (_cardW + _colGap);

  // Moves the view so `target` (a point of the tree) is at the top-left of the screen. The zoom stays the
  // same, and the view never moves past the edges of the tree.
  void _jumpTo(Offset target, Size tree, Size screen) {
    final scale = _view.value.getMaxScaleOnAxis();
    double keepInside(double move, double treeLength, double screenLength) => move.clamp(min(0.0, screenLength - scale * treeLength), 0.0);
    final dx = keepInside(-scale * target.dx, tree.width, screen.width);
    final dy = keepInside(-scale * target.dy, tree.height, screen.height);
    _view.value = Matrix4.diagonal3Values(scale, scale, 1)..setTranslationRaw(dx, dy, 0);
  }

  @override
  Widget build(BuildContext context) {
    final rounds = widget.rounds;
    if (rounds.isEmpty) return const SizedBox.shrink();
    final maxSlots = rounds.expand((r) => r.matches).map((m) => m.slots).reduce(max);
    final cardH = _topH + maxSlots * _seatH + 10;

    // Vertical centre of every card. Round 1 cards are stacked; a later card sits between its first and last feeder.
    final centers = <List<double>>[];
    for (var r = 0; r < rounds.length; r++) {
      centers.add([
        for (final (i, m) in rounds[r].matches.indexed)
          r == 0 || m.feeders.isEmpty
              ? _headH + i * (cardH + _rowGap) + cardH / 2
              : (centers[r - 1][m.feeders.first - 1] + centers[r - 1][m.feeders.last - 1]) / 2,
      ]);
    }
    final width = _x(rounds.length) - _colGap;
    final height = _headH + rounds[0].matches.length * (cardH + _rowGap);

    // One elbow line from each feeder card to the card it feeds (gold once that feeder match has a winner).
    final lines = <_Line>[];
    for (var r = 1; r < rounds.length; r++) {
      for (final (i, m) in rounds[r].matches.indexed) {
        for (final f in m.feeders) {
          lines.add(_Line(
            from: Offset(_x(r - 1) + _cardW, centers[r - 1][f - 1]),
            to: Offset(_x(r), centers[r][i]),
            done: rounds[r - 1].matches[f - 1].winnerId != null,
          ));
        }
      }
    }

    final tree = Size(width + _pad.horizontal, height + _pad.vertical);

    return LayoutBuilder(builder: (context, box) {
      final screen = Size(box.maxWidth, box.maxHeight - _chipBarH);
      // A round's column, with its first match a card's height below the top (like the RN app's scrollTo)
      void showRound(int r) => _jumpTo(Offset(_x(r), _pad.top + centers[r][0] - cardH), tree, screen);

      return Column(children: [
        SizedBox(
          height: _chipBarH,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            children: [
              for (final (r, round) in rounds.indexed)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: InkWell(
                    borderRadius: BorderRadius.circular(99),
                    onTap: () => showRound(r),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(99),
                        border: Border.all(color: AppColors.gold, width: 1.5),
                        color: AppColors.card,
                      ),
                      child: Text(roundName(round.roundNo, rounds.length), style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w800, fontSize: 12)),
                    ),
                  ),
                ),
            ],
          ),
        ),
        Expanded(child: _treeView(width, height, cardH, centers, lines)),
      ]);
    });
  }

  // The tree itself: lines, round names and match cards, inside a viewer that pans and zooms.
  Widget _treeView(double width, double height, double cardH, List<List<double>> centers, List<_Line> lines) {
    final rounds = widget.rounds;
    return InteractiveViewer(
      transformationController: _view,
      constrained: false, // the tree keeps its own size; the viewer pans over it
      minScale: 0.3,
      maxScale: 2,
      boundaryMargin: const EdgeInsets.all(40),
      child: Padding(
        padding: _pad,
        child: SizedBox(
          width: width,
          height: height,
          child: Stack(children: [
            Positioned.fill(child: CustomPaint(painter: _LinesPainter(lines))),
            for (final (r, round) in rounds.indexed) ...[
              Positioned(
                left: _x(r),
                top: 0,
                width: _cardW,
                height: _headH,
                child: Text(roundName(round.roundNo, rounds.length),
                    textAlign: TextAlign.center, style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 14)),
              ),
              for (final (i, m) in round.matches.indexed)
                Positioned(
                  left: _x(r),
                  top: centers[r][i] - cardH / 2,
                  width: _cardW,
                  height: cardH,
                  child: _MatchCard(match: m, myPlayerId: widget.myPlayerId, preview: widget.preview, onOpen: widget.onOpenMatch),
                ),
            ],
          ]),
        ),
      ),
    );
  }
}

class _Line {
  final Offset from;
  final Offset to;
  final bool done;
  const _Line({required this.from, required this.to, required this.done});
}

/// Draws the connector lines: right from the feeder card, down/up halfway between the columns, then right.
class _LinesPainter extends CustomPainter {
  final List<_Line> lines;
  _LinesPainter(this.lines);

  @override
  void paint(Canvas canvas, Size size) {
    for (final l in lines) {
      final midX = l.from.dx + _colGap / 2;
      final path = Path()
        ..moveTo(l.from.dx, l.from.dy)
        ..lineTo(midX, l.from.dy)
        ..lineTo(midX, l.to.dy)
        ..lineTo(l.to.dx, l.to.dy);
      final paint = Paint()
        ..color = l.done ? AppColors.gold : AppColors.cardBorder
        ..strokeWidth = 2
        ..style = PaintingStyle.stroke;
      canvas.drawPath(path, paint);
    }
  }

  @override
  bool shouldRepaint(_LinesPainter old) => old.lines != lines;
}

/// One match: number + state, then its players (or who will play there).
class _MatchCard extends StatelessWidget {
  final BracketMatch match;
  final int? myPlayerId;
  final bool preview;
  final void Function(int matchId)? onOpen;
  const _MatchCard({required this.match, required this.myPlayerId, required this.preview, required this.onOpen});

  // The small text at the top right of the card
  (String, Color) _state() {
    final m = match;
    if (m.status == 'in_progress') return ('● LIVE', AppColors.danger);
    if (m.status == 'finished') return ('Done', AppColors.textMuted);
    if (m.status == 'cancelled') return ('Cancelled', AppColors.textMuted);
    // A drawn match shows its time in blue; an upcoming one shows the planned time of the fixed schedule in grey
    if (m.scheduledAt != null) return (formatTime(m.scheduledAt!), m.status == 'waiting' ? AppColors.info : AppColors.textMuted);
    return ('Upcoming', AppColors.textMuted);
  }

  Widget _row({required Color? dot, required Widget text, Widget? trailing, bool winner = false}) => Container(
        height: _seatH,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(6), color: winner ? AppColors.gold.withAlpha(46) : null),
        child: Row(children: [
          Container(
            width: 8,
            height: 8,
            margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(shape: BoxShape.circle, color: dot, border: dot == null ? Border.all(color: AppColors.textMuted) : null),
          ),
          Expanded(child: text),
          if (trailing != null) trailing,
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final m = match;
    final mine = m.seats.any((s) => s.playerId == myPlayerId);
    final canOpen = mine && m.isOpen && m.matchId != null && onOpen != null;
    final (stateText, stateColor) = _state();
    // Places without a player yet: later rounds wait for the winners of their feeder matches;
    // in round 1 the places after the players who joined so far are still open.
    final placeholders = m.feeders.isNotEmpty
        ? (m.seats.isNotEmpty ? <String>[] : [for (final f in m.feeders) 'Winner of R${m.roundNo - 1} M$f'])
        : List.filled(max(0, m.slots - m.seats.length), preview ? 'Open slot' : 'TBD');

    return GestureDetector(
      onTap: canOpen ? () => onOpen!(m.matchId!) : null,
      child: Container(
        padding: const EdgeInsets.fromLTRB(9, 5, 9, 0),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: AppColors.cardSolid,
          border: Border.all(
            color: m.status == 'in_progress' ? AppColors.danger : (mine ? AppColors.gold : AppColors.cardBorder),
            width: mine ? 2 : 1.5,
          ),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          SizedBox(
            height: _topH - 4,
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('M${m.matchNo}', style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w900, fontSize: 12)),
              Text(stateText, style: TextStyle(color: stateColor, fontWeight: FontWeight.w800, fontSize: 11)),
            ]),
          ),
          // the players first, then the places still waiting for one
          for (final s in m.seats) _seatRow(m, s),
          for (final text in placeholders)
            _row(
              dot: null,
              text: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: AppColors.textMuted, fontSize: 12, fontStyle: FontStyle.italic)),
            ),
        ]),
      ),
    );
  }

  Widget _seatRow(BracketMatch m, Seat s) {
    final winner = m.winnerId != null && s.playerId == m.winnerId;
    final lost = m.status == 'finished' && !winner;
    final me = s.playerId == myPlayerId;
    return _row(
      dot: ludoShades[s.color]!.main,
      winner: winner,
      text: Text(
        me ? 'You' : s.displayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          color: me ? AppColors.gold : (lost ? AppColors.textMuted : Colors.white),
          fontWeight: FontWeight.w700,
          fontSize: 12.5,
          decoration: lost ? TextDecoration.lineThrough : null,
        ),
      ),
      trailing: winner ? const Icon(Icons.workspace_premium, color: AppColors.gold, size: 13) : null,
    );
  }
}
