// No 0/o/1/l: they look alike when the link is read aloud or typed by hand.
export const ROOM_ID_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export const ROOM_ID_LENGTH = 6;

export function generateRoomId(): string {
  const bytes = new Uint8Array(ROOM_ID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ROOM_ID_ALPHABET[b % ROOM_ID_ALPHABET.length]).join("");
}

export function isValidRoomId(id: string): boolean {
  if (id.length !== ROOM_ID_LENGTH) return false;
  for (const ch of id) if (!ROOM_ID_ALPHABET.includes(ch)) return false;
  return true;
}
