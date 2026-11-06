// One player's card around the board: avatar, name, colour, "your turn" glow + timer bar, finish place.
import 'dart:async';
import 'package:flutter/material.dart';
import '../models.dart';
import '../theme.dart';
import '../utils/format.dart';
import 'common.dart';

class PlayerPanel extends StatefulWidget {
  final Seat seat;
  final bool isMe;
  final bool isTurn;
  final int? deadline; // ms since epoch
  final int turnSeconds;
  final int? lastDice;
  final bool? present; // tournament lobby: is this player here?
  final bool alignRight;

  const PlayerPanel({
    super.key,
    required this.seat,
    required this.isMe,
    required this.isTurn,
    this.deadline,
    required this.turnSeconds,
    this.lastDice,
    this.present,
    this.alignRight = false,
  });

  @override
  State<PlayerPanel> createState() => _PlayerPanelState();
}

class _PlayerPanelState extends State<PlayerPanel> {
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    // redraw 4 times a second so the timer bar moves
    _tick = Timer.periodic(const Duration(milliseconds: 250), (_) {
      if (widget.isTurn && widget.deadline != null) setState(() {});
    });
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  String get _meta {
    final s = widget.seat;
    if (s.finishPosition != null) return '${ordinal(s.finishPosition!)} place';
    if (widget.present == false) return 'Not here yet';
    if (widget.present == true) return 'Ready';
    if (s.teamNo != null) return 'Team ${s.teamNo}';
    return s.botId != null ? 'Computer' : 'Player';
  }

  @override
  Widget build(BuildContext context) {
    final shade = ludoShades[widget.seat.color]!;
    final left = widget.deadline == null ? 0 : widget.deadline! - DateTime.now().millisecondsSinceEpoch;
    final fraction = widget.deadline == null ? 0.0 : (left / (widget.turnSeconds * 1000)).clamp(0.0, 1.0);

    final info = Expanded(
      child: Column(crossAxisAlignment: widget.alignRight ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
        Text('${widget.seat.displayName}${widget.isMe ? ' (You)' : ''}',
            maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13)),
        const SizedBox(height: 3),
        Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: shade.main, shape: BoxShape.circle)),
          const SizedBox(width: 4),
          Flexible(child: Text(_meta, style: const TextStyle(color: AppColors.textDim, fontSize: 11), overflow: TextOverflow.ellipsis)),
          if (widget.lastDice != null)
            Padding(
              padding: const EdgeInsets.only(left: 4),
              child: Text('🎲 ${widget.lastDice}', style: const TextStyle(color: AppColors.gold, fontSize: 11, fontWeight: FontWeight.w800)),
            ),
        ]),
        if (widget.isTurn && widget.deadline != null)
          Container(
            margin: const EdgeInsets.only(top: 5),
            height: 4,
            decoration: BoxDecoration(color: Colors.white.withAlpha(38), borderRadius: BorderRadius.circular(2)),
            child: FractionallySizedBox(
              alignment: Alignment.centerLeft,
              widthFactor: fraction,
              child: Container(decoration: BoxDecoration(color: fraction < 0.3 ? AppColors.danger : shade.light, borderRadius: BorderRadius.circular(2))),
            ),
          ),
      ]),
    );

    final avatar = AvatarCircle(avatar: widget.seat.botId != null ? '🤖' : null, name: widget.seat.displayName, size: 36, ring: shade.main, dim: widget.present == false);

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      padding: const EdgeInsets.all(8),
      constraints: const BoxConstraints(minHeight: 62),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: widget.isTurn ? shade.main.withAlpha(51) : Colors.white.withAlpha(15),
        border: Border.all(color: widget.isTurn ? shade.light : Colors.white.withAlpha(31), width: 2),
        boxShadow: widget.isTurn ? [BoxShadow(color: shade.main.withAlpha(110), blurRadius: 12)] : null,
      ),
      child: Row(
        children: widget.alignRight ? [info, const SizedBox(width: 8), avatar] : [avatar, const SizedBox(width: 8), info],
      ),
    );
  }
}
