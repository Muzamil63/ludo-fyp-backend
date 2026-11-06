// Which of my tokens can move with this dice value. Same rule as the backend's ludoEngine.getValidMoves.
// Only used to show the glowing tokens again after a reconnect — the server still checks every move.
import type { RuleSet, Token } from '../types';
import { HOME_POS } from './boardLayout';

export function movableTokenIds(myTokens: Token[], dice: number, rules: RuleSet): number[] {
  const unlock = rules.six_to_unlock ? [6] : [1, 6];
  return myTokens
    .filter((t) => (t.position < 0 ? unlock.includes(dice) : t.position + dice <= HOME_POS))
    .map((t) => t.token_id);
}
