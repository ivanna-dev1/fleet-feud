export type Phase = "waiting" | "placing" | "battle" | "finished";

export type Cell = { r: number; c: number };

export type Ship = { cells: Cell[] };

export type ShotResult = "miss" | "hit" | "sunk";

export type Shot = Cell & { result: ShotResult };

export type PlayerIndex = 0 | 1;

export type PlayerState = {
  id: string;
  name: string;
  online: boolean;
  ships: Ship[];
  ready: boolean;
  shotsReceived: Shot[];
  wantsRematch: boolean;
};

export type RoomState = {
  id: string;
  phase: Phase;
  players: [PlayerState | null, PlayerState | null];
  turn: PlayerIndex | null;
  winner: PlayerIndex | null;
  createdAt: number;
};

export type ClientCommand =
  | { type: "join"; playerId: string; name: string }
  | { type: "setName"; name: string }
  | { type: "placeShips"; ships: Ship[] }
  | { type: "ready" }
  | { type: "fire"; cell: Cell }
  | { type: "rematch" };

export type ErrorCode =
  | "room_full"
  | "not_joined"
  | "bad_phase"
  | "not_your_turn"
  | "already_shot"
  | "invalid_fleet"
  | "not_ready"
  | "bad_name"
  | "bad_message";

export type ServerError = { code: ErrorCode; message: string };

export type OpponentView = {
  name: string;
  online: boolean;
  ready: boolean;
  shotsReceived: Shot[];
  wantsRematch: boolean;
  ships: Ship[] | null;
};

export type PlayerView = {
  roomId: string;
  phase: Phase;
  me: {
    index: PlayerIndex;
    name: string;
    ships: Ship[];
    ready: boolean;
    shotsReceived: Shot[];
    wantsRematch: boolean;
  };
  opponent: OpponentView | null;
  myTurn: boolean;
  winner: "me" | "opponent" | null;
};

export type ServerMessage =
  | { type: "state"; view: PlayerView }
  | { type: "error"; code: ErrorCode; message: string };
