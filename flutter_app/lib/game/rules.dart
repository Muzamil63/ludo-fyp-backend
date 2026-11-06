// Which of my tokens can move with this dice value. Same rule as the backend's ludoEngine.getValidMoves.
// Only used to show the glowing tokens again after a reconnect — the server still checks every move.
import '../models.dart';
import 'board_layout.dart';

List<int> movableTokenIds(List<Token> myTokens, int dice, RuleSet rules) {
  final unlock = rules.sixToUnlock ? [6] : [1, 6];
  return myTokens
      .where((t) => t.position < 0 ? unlock.contains(dice) : t.position + dice <= homePos)
      .map((t) => t.tokenId)
      .toList();
}
