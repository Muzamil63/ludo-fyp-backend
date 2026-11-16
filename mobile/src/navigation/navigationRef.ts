// Lets code outside screens (e.g. notifications) open a screen.
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: object) {
  if (!navigationRef.isReady()) return;
  // Already on this exact screen (e.g. a toast tapped twice): don't stack a copy of it
  const current = navigationRef.getCurrentRoute();
  if (current?.name === name && JSON.stringify(current.params ?? {}) === JSON.stringify(params ?? {})) return;
  // Otherwise open it as a new screen (one screen per match / tournament)
  navigationRef.dispatch(StackActions.push(name, params));
}
