import type { Env } from "./env";
import { generateRoomId, isValidRoomId } from "./room-id";

export { Room } from "./room-do";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/room") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
      return json({ id: generateRoomId() });
    }

    const wsMatch = url.pathname.match(/^\/ws\/([^/]+)$/);
    if (wsMatch) {
      const id = wsMatch[1]!;
      if (!isValidRoomId(id)) return json({ error: "bad_room_id" }, 400);
      if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
        return json({ error: "websocket_expected" }, 426);
      }
      const stub = env.ROOMS.get(env.ROOMS.idFromName(id));
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
