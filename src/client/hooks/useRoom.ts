import { useCallback, useEffect, useRef, useState } from "react";
import type { ClientCommand, PlayerView, ServerError, ServerMessage } from "../../game";
import { getName, getPlayerId } from "../lib/identity";

const CLOSE_ROOM_FULL = 4001;
const CLOSE_EXPIRED = 4002;
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];

export type RoomConnection = {
  view: PlayerView | null;
  error: ServerError | null;
  connected: boolean;
  roomFull: boolean;
  expired: boolean;
  send: (cmd: ClientCommand) => void;
  clearError: () => void;
};

export function useRoom(roomId: string): RoomConnection {
  const [view, setView] = useState<PlayerView | null>(null);
  const [error, setError] = useState<ServerError | null>(null);
  const [connected, setConnected] = useState(false);
  const [roomFull, setRoomFull] = useState(false);
  const [expired, setExpired] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    // `disposed` belongs to this effect run only, so a socket from a previous run
    // (StrictMode double-run, roomId change) can never touch the current one.
    let disposed = false;
    retryRef.current = 0;

    function connect() {
      if (disposed) return;
      timerRef.current = null;
      const proto = location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${location.host}/ws/${roomId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed || wsRef.current !== ws) return;
        retryRef.current = 0;
        setConnected(true);
        ws.send(JSON.stringify({ type: "join", playerId: getPlayerId(), name: getName() }));
      };

      ws.onmessage = (event) => {
        if (disposed || wsRef.current !== ws) return;
        const msg = JSON.parse(event.data as string) as ServerMessage;
        if (msg.type === "state") {
          setView(msg.view);
        } else {
          setError({ code: msg.code, message: msg.message });
        }
      };

      ws.onclose = (event) => {
        if (disposed || wsRef.current !== ws) return;
        setConnected(false);
        wsRef.current = null;
        if (event.code === CLOSE_ROOM_FULL) {
          setRoomFull(true);
          return;
        }
        if (event.code === CLOSE_EXPIRED) {
          setExpired(true);
          return;
        }
        const delay = RETRY_DELAYS_MS[Math.min(retryRef.current, RETRY_DELAYS_MS.length - 1)]!;
        retryRef.current += 1;
        timerRef.current = window.setTimeout(connect, delay);
      };
    }

    // A phone waking up should not wait out the backoff delay.
    function reconnectNow() {
      if (disposed || document.visibilityState !== "visible" || timerRef.current === null) return;
      window.clearTimeout(timerRef.current);
      retryRef.current = 0;
      connect();
    }

    connect();
    document.addEventListener("visibilitychange", reconnectNow);
    window.addEventListener("online", reconnectNow);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", reconnectNow);
      window.removeEventListener("online", reconnectNow);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      const ws = wsRef.current;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
      wsRef.current = null;
    };
  }, [roomId]);

  const send = useCallback((cmd: ClientCommand) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(cmd));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { view, error, connected, roomFull, expired, send, clearError };
}
