// A tournament in a list: name, status, players bar, format, rules and when it starts.
import 'package:flutter/material.dart';
import '../models.dart';
import '../theme.dart';
import '../utils/format.dart';
import 'common.dart';

class TournamentCard extends StatelessWidget {
  final Tournament t;
  final VoidCallback onTap;
  const TournamentCard({super.key, required this.t, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final startsIn = t.startTime.difference(DateTime.now());
    final fill = (t.participantCount / t.maxParticipants).clamp(0.0, 1.0);
    final when = t.status == 'registration' ? (startsIn.inSeconds > 0 ? 'Starts in ${formatCountdown(startsIn)}' : 'Starting…') : formatDateTime(t.startTime);

    return GlassCard(
      margin: const EdgeInsets.only(bottom: 12),
      highlight: t.status == 'in_progress' ? AppColors.danger : null,
      onTap: onTap,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Text('🏆', style: TextStyle(fontSize: 30)),
          const SizedBox(width: 10),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(t.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: AppText.heading),
              Text('by @${t.creatorUsername}', style: AppText.small),
            ]),
          ),
          StatusPill(status: t.status, label: t.status == 'in_progress' ? 'Live · R${t.currentRound}' : null),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.sports_esports, size: 16, color: AppColors.textDim),
          const SizedBox(width: 8),
          Text('${t.formatLabel} · ${t.ruleSetName}', style: AppText.dim),
        ]),
        const SizedBox(height: 6),
        Row(children: [
          const Icon(Icons.event, size: 16, color: AppColors.textDim),
          const SizedBox(width: 8),
          Text(when, style: AppText.dim),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          const Icon(Icons.group, size: 16, color: AppColors.gold),
          const SizedBox(width: 10),
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: fill, minHeight: 8, backgroundColor: Colors.white.withAlpha(31), color: AppColors.gold),
            ),
          ),
          const SizedBox(width: 10),
          Text('${t.participantCount}/${t.maxParticipants}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
        ]),
      ]),
    );
  }
}
