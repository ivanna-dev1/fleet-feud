export * from "./types";
export { BOARD_SIZE, cellKey, isInside, neighbors, sameCell } from "./board";
export { FLEET_SIZES, canPlaceShip, makeShip, randomFleet, validateFleet } from "./fleet";
export type { FleetError } from "./fleet";
export { applyShot, hasShot, isFleetSunk } from "./shoot";
export { MAX_NAME_LENGTH, createRoom, findPlayerIndex, reduce } from "./room";
export type { ReduceResult } from "./room";
export { toPlayerView } from "./view";
export { ROOM_ID_ALPHABET, ROOM_ID_LENGTH, isValidRoomId } from "./room-id";
