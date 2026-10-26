import { findPlayerIndex } from "./room";
import type { PlayerView, RoomState } from "./types";

/** Builds what one player is allowed to see. Opponent ships are hidden until the game is finished. */
export function toPlayerView(state: RoomState, playerId: string): PlayerView {
  const index = findPlayerIndex(state, playerId);
  if (index === null) throw new Error("Player is not in this room");
  const me = state.players[index]!;
  const opponent = state.players[index === 0 ? 1 : 0];
  return {
    roomId: state.id,
    phase: state.phase,
    me: {
      index,
      name: me.name,
      ships: me.ships,
      ready: me.ready,
      shotsReceived: me.shotsReceived,
      wantsRematch: me.wantsRematch,
    },
    opponent: opponent
      ? {
          name: opponent.name,
          online: opponent.online,
          ready: opponent.ready,
          shotsReceived: opponent.shotsReceived,
          wantsRematch: opponent.wantsRematch,
          ships: state.phase === "finished" ? opponent.ships : null,
        }
      : null,
    myTurn: state.phase === "battle" && state.turn === index,
    winner: state.winner === null ? null : state.winner === index ? "me" : "opponent",
  };
}
