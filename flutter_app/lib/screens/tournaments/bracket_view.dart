// The knockout bracket: one column per round, one card per match (players, winner, time, status).
// The creator gets "Start now" / "Time" on waiting matches; players get "Play" on their own match.
import 'package:flutter/material.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/common.dart';
import '../../widgets/gradient_button.dart';

class BracketView extends StatelessWidget {
  final List<TournamentRound> rounds;
  final int? myPlayerId;
  final bool isCreator;
  final String? nextRoundNote;
  final String? busy;
  final void Function(int matchId) onPlay;
  final void Function(int matchId) onStartNow;
  final void Function(BracketMatch match) onChangeTime;

  const BracketView({
    super.key,
    required this.rounds,
    required this.myPlayerId,
    required this.isCreator,
    this.nextRoundNote,
    this.busy,
    required this.onPlay,
    required this.onStartNow,
    required this.onChangeTime,
  });

  String _roundName(TournamentRound r) =>
      r == rounds.last && r.matches.length == 1 && nextRoundNote == null ? 'Final' : 'Round ${r.roundNo}';

  Widget _matchCard(BracketMatch m) {
    final mine = m.seats.any((s) => s.playerId == myPlayerId);
    final left = m.scheduledAt.difference(DateTime.now());
    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      highlight: mine && m.isOpen ? AppColors.gold : null,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Row(children: [
          Expanded(child: Text('Match ${m.matchNo}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900))),
          StatusPill(status: m.status, label: m.status == 'in_progress' ? 'Live' : null),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.schedule, size: 14, color: AppColors.textMuted),
          const SizedBox(width: 5),
          Text(
            m.status == 'waiting' ? (left.inSeconds > 0 ? '${formatTime(m.scheduledAt)} · in ${formatCountdown(left)}' : 'Starting…') : formatDateTime(m.scheduledAt),
            style: AppText.small,
          ),
        ]),
        const SizedBox(height: 8),
        for (final s in m.seats) _seatRow(m, s),
        if (mine && m.isOpen) ...[
          const SizedBox(height: 10),
          GradientButton(title: m.status == 'in_progress' ? 'Play now' : 'Enter lobby', icon: Icons.play_arrow, size: ButtonSize.sm, variant: ButtonVariant.gold, onPressed: () => onPlay(m.matchId)),
        ],
        if (isCreator && m.status == 'waiting') ...[
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: GradientButton(
                title: 'Start now',
                icon: Icons.bolt,
                size: ButtonSize.sm,
                variant: ButtonVariant.success,
                loading: busy == 'start-${m.matchId}',
                onPressed: () => onStartNow(m.matchId),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(child: GradientButton(title: 'Time', icon: Icons.schedule, size: ButtonSize.sm, variant: ButtonVariant.ghost, onPressed: () => onChangeTime(m))),
          ]),
        ],
      ]),
    );
  }

  Widget _seatRow(BracketMatch m, Seat s) {
    final winner = m.winnerId != null && s.playerId == m.winnerId;
    final lost = m.status == 'finished' && !winner;
    return Container(
      margin: const EdgeInsets.only(top: 4),
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), color: winner ? AppColors.gold.withAlpha(46) : Colors.white.withAlpha(13)),
      child: Row(children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(shape: BoxShape.circle, color: ludoShades[s.color]!.main)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            s.playerId == myPlayerId ? 'You' : s.displayName,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              color: lost ? AppColors.textMuted : (s.playerId == myPlayerId ? AppColors.gold : Colors.white),
              fontWeight: FontWeight.w700,
              decoration: lost ? TextDecoration.lineThrough : null,
            ),
          ),
        ),
        if (winner) const Icon(Icons.workspace_premium, color: AppColors.gold, size: 18),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        for (final r in rounds)
          Container(
            width: 230,
            margin: const EdgeInsets.only(right: 12),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_roundName(r), style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 15))),
              for (final m in r.matches) _matchCard(m),
            ]),
          ),
        if (nextRoundNote != null)
          Opacity(
            opacity: 0.7,
            child: SizedBox(
              width: 230,
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                const Padding(padding: EdgeInsets.only(bottom: 8), child: Text('Next round', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 15))),
                GlassCard(padding: const EdgeInsets.all(12), child: Text(nextRoundNote!, style: AppText.dim)),
              ]),
            ),
          ),
      ]),
    );
  }
}
