// Every REST endpoint of the backend, grouped like the backend's routes/ folder.
import { api } from './client';
import type {
  Player, RuleSet, MatchState, Friend, RoomInvitation, Tournament, TournamentDetail,
  TournamentInvitation, UpcomingMatch, HistoryMatch, Seat,
} from '../types';

type AuthResult = { token: string; player: Player };

export const authApi = {
  guest: (device_id: string, display_name?: string) => api.post<AuthResult>('/auth/guest', { device_id, display_name }),
  register: (body: { username: string; email: string; password: string; display_name?: string }) =>
    api.post<AuthResult>('/auth/register', body),
  login: (login: string, password: string) => api.post<AuthResult>('/auth/login', { login, password }),
  me: () => api.get<Player>('/auth/me'),
  health: () => api.get<{ status: string; db: string }>('/health'),
};

export const userApi = {
  updateMe: (body: { display_name?: string; avatar?: string }) => api.put<Player>('/users/me', body),
  myMatches: () => api.get<HistoryMatch[]>('/users/me/matches'),
  search: (q: string) => api.get<Friend[]>(`/users/search?q=${encodeURIComponent(q)}`),
  leaderboard: () =>
    api.get<{ player_id: number; username: string; display_name: string; avatar: string | null; games_played: number; games_won: number }[]>(
      '/users/leaderboard'
    ),
};

export const friendApi = {
  list: () => api.get<Friend[]>('/friends'),
  requests: () => api.get<{ received: (Friend & { created_at: string })[]; sent: (Friend & { created_at: string })[] }>('/friends/requests'),
  send: (username: string) => api.post('/friends/requests', { username }),
  respond: (friendshipId: number, action: 'accept' | 'reject') => api.put(`/friends/requests/${friendshipId}`, { action }),
  remove: (playerId: number) => api.delete(`/friends/${playerId}`),
};

export const matchApi = {
  ruleSets: () => api.get<RuleSet[]>('/rule-sets'),
  createBot: (body: { rule_set_id: number; total_players: number; game_mode: string; difficulty: string }) =>
    api.post<{ match_id: number }>('/matches/bot', body),
  state: (matchId: number) => api.get<MatchState>(`/matches/${matchId}`),
};

export const roomApi = {
  create: (body: { rule_set_id: number; max_players: number; game_mode: string }) =>
    api.post<{ match_id: number; room_code: string }>('/rooms', body),
  byCode: (code: string) => api.get<{ match_id: number; room_code: string; host_id: number; status: string; seats: Seat[] }>(`/rooms/code/${code}`),
  join: (room_code: string) => api.post<{ match_id: number; room_code: string; seat_no: number }>('/rooms/join', { room_code }),
  leave: (matchId: number) => api.post(`/rooms/${matchId}/leave`),
  start: (matchId: number, fill_with_bots: boolean) => api.post(`/rooms/${matchId}/start`, { fill_with_bots }),
  invite: (matchId: number, receiver_id: number) => api.post(`/rooms/${matchId}/invitations`, { receiver_id }),
  invitations: () => api.get<RoomInvitation[]>('/rooms/invitations'),
  respond: (invitationId: number, action: 'accept' | 'decline') =>
    api.put<{ match_id: number; room_code: string }>(`/rooms/invitations/${invitationId}`, { action }),
};

export interface TournamentFields {
  name: string;
  description?: string | null;
  rule_set_id: number;
  max_participants: number;
  players_per_match: number;
  start_time: string;
  round_break_minutes: number;
  join?: boolean;
}

export const tournamentApi = {
  list: (status?: string) => api.get<Tournament[]>(`/tournaments${status ? `?status=${status}` : ''}`),
  mine: () => api.get<Tournament[]>('/tournaments/mine'),
  myMatches: () => api.get<UpcomingMatch[]>('/tournaments/my-matches'),
  detail: (id: number) => api.get<TournamentDetail>(`/tournaments/${id}`),
  create: (body: TournamentFields) => api.post<Tournament>('/tournaments', body),
  update: (id: number, body: Partial<TournamentFields>) => api.put<Tournament>(`/tournaments/${id}`, body),
  start: (id: number) => api.post<Tournament>(`/tournaments/${id}/start`),
  cancel: (id: number) => api.post<Tournament>(`/tournaments/${id}/cancel`),
  join: (id: number) => api.post(`/tournaments/${id}/register`),
  leave: (id: number) => api.delete(`/tournaments/${id}/register`),
  removePlayer: (id: number, playerId: number) => api.delete(`/tournaments/${id}/participants/${playerId}`),
  invite: (id: number, receiver_id: number) => api.post(`/tournaments/${id}/invitations`, { receiver_id }),
  invitations: () => api.get<TournamentInvitation[]>('/tournaments/invitations'),
  respond: (invitationId: number, action: 'accept' | 'decline') =>
    api.put<{ tournament_id: number }>(`/tournaments/invitations/${invitationId}`, { action }),
  rescheduleMatch: (id: number, matchId: number, scheduled_at: string) =>
    api.put(`/tournaments/${id}/matches/${matchId}/schedule`, { scheduled_at }),
  startMatchNow: (id: number, matchId: number) => api.post(`/tournaments/${id}/matches/${matchId}/start`),
};
