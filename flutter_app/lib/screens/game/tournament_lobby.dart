// Shown on the game screen while a tournament match is still waiting to start:
// round info, countdown to the start time, and who is already in the lobby.
import 'dart:async';
import 'package:flutter/material.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';

class TournamentLobby extends StatefulWidget {
  final MatchInfo match;
  final List<Seat> seats;
  final List<int> presentIds;
  final int? myPlayerId;
  const TournamentLobby({super.key, required this.match, required this.seats, required this.presentIds, this.myPlayerId});

  @override
  State<TournamentLobby> createState() => _TournamentLobbyState();
}

class _TournamentLobbyState extends State<TournamentLobby> {
  Timer? _tick;

  @override
  void initState() {
    super.initState();
    _tick = Timer.periodic(const Duration(seconds: 1), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final startsAt = widget.match.scheduledAt ?? DateTime.now();
    final left = startsAt.difference(DateTime.now());

    return GlassCard(
      highlight: AppColors.gold,
      child: Column(mainAxisSize: MainAxisSize.min, children: [
        Text('🏆 Round ${widget.match.roundNo} · Match ${widget.match.matchNo}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 15)),
        const SizedBox(height: 6),
        Text(left.inSeconds > 0 ? formatCountdown(left) : 'Starting…', style: const TextStyle(color: Colors.white, fontSize: 46, fontWeight: FontWeight.w900)),
        Text('Starts at ${formatTime(startsAt)} — or as soon as everyone is here', textAlign: TextAlign.center, style: AppText.dim),
        const SizedBox(height: 18),
        Wrap(spacing: 14, runSpacing: 10, alignment: WrapAlignment.center, children: [
          for (final s in widget.seats)
            SizedBox(
              width: 74,
              child: Column(children: [
                AvatarCircle(name: s.displayName, size: 44, ring: ludoShades[s.color]!.main, dim: !widget.presentIds.contains(s.playerId)),
                const SizedBox(height: 6),
                Text(s.playerId == widget.myPlayerId ? 'You' : s.displayName,
                    maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 12)),
                Text(widget.presentIds.contains(s.playerId) ? '● Ready' : '○ Waiting',
                    style: TextStyle(color: widget.presentIds.contains(s.playerId) ? AppColors.success : AppColors.textMuted, fontSize: 11, fontWeight: FontWeight.w800)),
              ]),
            ),
        ]),
        const SizedBox(height: 16),
        const Text('Stay on this screen. Absent players are auto-played when the match starts.', textAlign: TextAlign.center, style: AppText.small),
      ]),
    );
  }
}
