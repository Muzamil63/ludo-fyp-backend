// Opens the "Custom rules" page and waits for it, like a dialog (same idea as pickDateTime): resolves with the
// rules the player saved, or null when they go back without saving.
import { navigationRef } from '../navigation/navigationRef';
import type { CustomRules } from '../types';

let waiting: ((rules: CustomRules | null) => void) | null = null;

export function editCustomRules(initial: CustomRules): Promise<CustomRules | null> {
  waiting?.(null); // an older page that never answered
  return new Promise((resolve) => {
    waiting = resolve;
    navigationRef.navigate('CustomRules', { initial });
  });
}

// Called by the page: with the rules on "Use these rules", with null when it closes without saving.
export function finishCustomRules(rules: CustomRules | null) {
  waiting?.(rules);
  waiting = null;
}
