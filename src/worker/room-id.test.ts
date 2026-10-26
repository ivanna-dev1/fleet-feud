import { describe, expect, it } from "vitest";
import { ROOM_ID_ALPHABET, generateRoomId, isValidRoomId } from "./room-id";

describe("room id", () => {
  it("generates 6 chars from the alphabet", () => {
    for (let i = 0; i < 50; i++) {
      const id = generateRoomId();
      expect(id).toHaveLength(6);
      for (const ch of id) expect(ROOM_ID_ALPHABET).toContain(ch);
    }
  });

  it("validates ids", () => {
    expect(isValidRoomId("k7f3x9")).toBe(true);
    expect(isValidRoomId("k7f3x0")).toBe(false); // 0 is not allowed
    expect(isValidRoomId("k7f3x")).toBe(false);
    expect(isValidRoomId("K7F3X9")).toBe(false);
  });
});
