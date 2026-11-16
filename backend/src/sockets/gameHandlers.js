// Socket events for playing: match:join (also the lobby of rooms and tournament matches), game:roll, game:move.
const gameManager = require('../game/gameManager');
const tournamentManager = require('../game/tournamentManager');
const matchModel = require('../models/matchModel');
const httpError = require('../utils/httpError');
const { toId } = require('../utils/validate');
const on = require('./on');

module.exports = function registerGameHandlers(io, socket) {
  const playerId = socket.user.player_id;

  // Only players who have a seat in the match may join or play it.
  async function mySeat(matchIdValue) {
    const matchId = toId(matchIdValue, 'match_id');
    const seat = await matchModel.findSeatByPlayer(matchId, playerId);
    if (!seat) throw httpError(403, 'You are not in this match');
    return { matchId, seat };
  }

  // A tournament match that has not started: tell everyone in its lobby who is here
  // (this also starts the match early when all its players are present).
  async function updateLobby(matchId) {
    const match = await matchModel.findById(matchId);
    if (match && match.match_type === 'tournament' && match.status === 'waiting') {
      await tournamentManager.onLobbyJoin(matchId);
    }
  }

  on(socket, 'match:join', async ({ match_id }) => {
    const { matchId } = await mySeat(match_id);
    socket.join(`match:${matchId}`);
    await gameManager.ensureTimer(matchId);
    await updateLobby(matchId);
    // Read the state AFTER the lobby check: if this join started the match, the app must get the running match
    return gameManager.getState(matchId);
  });

  // Leaving the board screen: stop receiving this match's events (the match itself goes on).
  on(socket, 'match:leave', async ({ match_id }) => {
    const matchId = toId(match_id, 'match_id');
    socket.leave(`match:${matchId}`);
    await updateLobby(matchId);
    return { left: true };
  });

  // App closed or connection lost: the lobbies this socket was in must stop showing the player as "here".
  let lobbyMatchIds = [];
  socket.on('disconnecting', () => {
    lobbyMatchIds = [...socket.rooms].filter((r) => r.startsWith('match:')).map((r) => Number(r.slice(6)));
  });
  socket.on('disconnect', () => {
    for (const matchId of lobbyMatchIds) updateLobby(matchId).catch(() => {});
  });

  on(socket, 'game:roll', async ({ match_id }) => {
    const { matchId, seat } = await mySeat(match_id);
    const result = await gameManager.rollDice(matchId, seat.seat_no);
    return { dice_value: result.dice_value, valid_token_ids: result.valid_token_ids };
  });

  on(socket, 'game:move', async ({ match_id, token_id }) => {
    const { matchId, seat } = await mySeat(match_id);
    return gameManager.moveToken(matchId, seat.seat_no, toId(token_id, 'token_id'));
  });
};