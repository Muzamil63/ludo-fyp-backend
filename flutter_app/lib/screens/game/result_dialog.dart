// End-of-match popup: winner banner + final ranking, with buttons to go home or to the tournament.
import 'package:flutter/material.dart';
import '../../models.dart';
import '../../theme.dart';
import '../../utils/format.dart';
import '../../widgets/gradient_button.dart';

const _medals = ['🥇', '🥈', '🥉', '🏅'];

Future<void> showResultDialog(
  BuildContext context, {
  required List<Ranking> rankings,
  required List<Seat> seats,
  required int? myPlayerId,
  required bool isTournament,
  required VoidCallback onHome,
  VoidCallback? onTournament,
}) {
  final mine = rankings.where((r) => r.playerId == myPlayerId).firstOrNull;
  final won = mine?.finishPosition == 1;
  final sorted = [...rankings]..sort((a, b) => a.finishPosition.compareTo(b.finishPosition));
  final title = won ? (isTournament ? 'You win! Next round!' : 'Victory!') : mine != null ? 'You finished ${ordinal(mine.finishPosition)}' : 'Match over';

  return showDialog(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.6, end: 1),
        duration: const Duration(milliseconds: 450),
        curve: Curves.elasticOut,
        builder: (context, scale, child) => Transform.scale(scale: scale, child: child),
        child: Container(
          padding: const EdgeInsets.all(22),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withAlpha(90), width: 2),
            gradient: LinearGradient(colors: won ? const [Color(0xFFFFD86B), Color(0xFFF29D00)] : const [Color(0xFF2B3375), Color(0xFF1A2056)]),
          ),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(won ? '🏆' : mine != null ? '🎲' : '🏁', style: const TextStyle(fontSize: 64)),
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: won ? const Color(0xFF3A2000) : Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
            if (isTournament && mine != null && !won)
              const Padding(padding: EdgeInsets.only(top: 4), child: Text('You are out of this tournament. Well played!', style: AppText.dim)),
            const SizedBox(height: 18),
            for (final r in sorted)
              Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withAlpha(56),
                  borderRadius: BorderRadius.circular(16),
                  border: r.playerId == myPlayerId ? Border.all(color: Colors.white, width: 2) : null,
                ),
                child: Row(children: [
                  SizedBox(width: 34, child: Text(r.finishPosition <= 4 ? _medals[r.finishPosition - 1] : '•', style: const TextStyle(fontSize: 22))),
                  Container(
                    width: 12,
                    height: 12,
                    margin: const EdgeInsets.only(right: 8),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: ludoShades[seats.where((s) => s.seatNo == r.seatNo).firstOrNull?.color ?? LudoColor.red]!.main,
                    ),
                  ),
                  Expanded(
                    child: Text('${r.displayName}${r.playerId == myPlayerId ? ' (You)' : ''}${r.botId != null ? ' 🤖' : ''}',
                        maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 15)),
                  ),
                  Text(ordinal(r.finishPosition), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900)),
                ]),
              ),
            const SizedBox(height: 10),
            if (isTournament && onTournament != null) ...[
              GradientButton(title: 'View Tournament', icon: Icons.emoji_events, variant: won ? ButtonVariant.primary : ButtonVariant.gold, onPressed: onTournament),
              const SizedBox(height: 10),
            ],
            GradientButton(title: 'Home', icon: Icons.home, variant: ButtonVariant.ghost, onPressed: onHome),
          ]),
        ),
      ),
    ),
  );
}
