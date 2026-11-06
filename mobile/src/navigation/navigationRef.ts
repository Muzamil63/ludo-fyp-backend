// Lets code outside screens (e.g. notifications) open a screen.
import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigate(name: keyof RootStackParamList, params?: object) {
  if (!navigationRef.isReady()) return;
  // Game screens are always opened as a new screen (one screen per match)
  if (name === 'Game') navigationRef.dispatch(StackActions.push(name, params));
  else navigationRef.dispatch(StackActions.push(name, params));
}
