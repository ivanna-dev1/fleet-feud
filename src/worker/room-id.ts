import { ROOM_ID_ALPHABET, ROOM_ID_LENGTH } from "../game";

export { ROOM_ID_ALPHABET, isValidRoomId } from "../game";

export function generateRoomId(): string {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_ID_ALPHABET[b % ROOM_ID_ALPHABET.length]).join("");
}
