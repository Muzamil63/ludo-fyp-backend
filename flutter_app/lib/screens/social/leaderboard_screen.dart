// Top 20 registered players by wins, with a podium for the top three.
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../api/endpoints.dart';
import '../../models.dart';
import '../../state/auth_state.dart';
import '../../theme.dart';
import '../../widgets/common.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});
  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  static const _medalColors = [Color(0xFFFFC93C), Color(0xFFC9D1E8), Color(0xFFE39A5B)];
  List<Person>? _rows;

  @override
  void initState() {
    super.initState();
    UserApi.leaderboard().then((r) => setState(() => _rows = r)).catchError((_) => setState(() => _rows = []));
  }

  Widget _podiumColumn(Person? r, int place) {
    if (r == null) return const Expanded(child: SizedBox());
    final color = _medalColors[place - 1];
    return Expanded(
      child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
        Text(place == 1 ? '👑' : ' ', style: const TextStyle(fontSize: 26)),
        AvatarCircle(avatar: r.avatar, name: r.displayName, size: place == 1 ? 70 : 54, ring: color),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Text(r.displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
        ),
        Container(
          height: place == 1 ? 90 : place == 2 ? 66 : 50,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          decoration: BoxDecoration(color: color, borderRadius: const BorderRadius.vertical(top: Radius.circular(14))),
          alignment: Alignment.center,
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text('$place', style: const TextStyle(color: Color(0xFF2A1B00), fontWeight: FontWeight.w900, fontSize: 26)),
            Text('${r.gamesWon} wins', style: const TextStyle(color: Color(0xFF2A1B00), fontWeight: FontWeight.w800, fontSize: 11)),
          ]),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = context.watch<AuthState>().player?.playerId;
    final rows = _rows;
    return Scaffold(
      body: AppBackground(
        child: Column(children: [
          const AppHeader(title: 'Leaderboard', subtitle: 'Most wins'),
          Expanded(
            child: rows == null
                ? const LoadingView()
                : rows.isEmpty
                    ? const EmptyState(emoji: '👑', title: 'No champions yet', text: 'Win a match to get on the board!')
                    : ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 40), children: [
                        SizedBox(
                          height: 230,
                          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                            _podiumColumn(rows.length > 1 ? rows[1] : null, 2),
                            _podiumColumn(rows[0], 1),
                            _podiumColumn(rows.length > 2 ? rows[2] : null, 3),
                          ]),
                        ),
                        const SizedBox(height: 20),
                        for (var i = 0; i < rows.length; i++)
                          Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha(13),
                              borderRadius: BorderRadius.circular(16),
                              border: rows[i].playerId == me ? Border.all(color: AppColors.gold, width: 1.5) : null,
                            ),
                            child: Row(children: [
                              SizedBox(width: 28, child: Text('${i + 1}', style: const TextStyle(color: AppColors.textDim, fontWeight: FontWeight.w900, fontSize: 16))),
                              AvatarCircle(avatar: rows[i].avatar, name: rows[i].displayName, size: 36),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                  Text(rows[i].displayName, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
                                  Text('@${rows[i].username} · ${rows[i].gamesPlayed} played', style: AppText.small),
                                ]),
                              ),
                              Text('${rows[i].gamesWon}', style: const TextStyle(color: AppColors.gold, fontWeight: FontWeight.w900, fontSize: 20)),
                            ]),
                          ),
                      ]),
          ),
        ]),
      ),
    );
  }
}
