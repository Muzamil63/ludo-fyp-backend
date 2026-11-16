// Every screen and the parameters it needs. Used by React Navigation for type checking.
import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CustomRules } from '../types';

export type TabParamList = {
  Home: undefined;
  Tournaments: undefined;
  Friends: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  // Logged out
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ServerSettings: undefined;
  // Logged in
  Main: NavigatorScreenParams<TabParamList> | undefined;
  BotSetup: undefined;
  CustomRules: { initial: CustomRules }; // the "Custom rules" page (opened from the Rules picker)
  Matchmaking: { queueKey: 'ffa2' | 'ffa4' | '2v2' };
  Game: { matchId: number };
  CreateRoom: undefined;
  JoinRoom: { code?: string } | undefined;
  RoomLobby: { matchId: number; roomCode: string };
  TournamentDetail: { tournamentId: number };
  TournamentForm: { tournamentId?: number } | undefined;
  Bracket: { tournamentId: number }; // full bracket map
  Invites: undefined;
  Leaderboard: undefined;
};
