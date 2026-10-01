// hooks/useLiveEvents.ts  (put it at src/hooks/useLiveEvents.ts, next to services/ and screens/)
//
// Keeps ONE Server-Sent Events connection open to GET {baseUrl}/events/stream
// and calls your handlers when the server signals that something changed.
// Signals carry no real data: a handler should simply re-run the loader the
// screen already has (e.g. loadStudentNotifications).
//
//   useLiveEvents({
//     baseUrl: API_BASE_URL,
//     userId: currentStudent?.studentId,
//     role: 'student',
//     handlers: { notifications: () => void loadStudentNotifications() },
//     onSync: () => void loadStudentNotifications(),
//   });
//
// Needs:  npm i react-native-sse   (pure JS, fine in Expo managed; only used
// where the platform has no built-in EventSource, i.e. iOS/Android).
//
// Behaviour:
//  - Web uses the browser's EventSource (auto-reconnect built in); native uses
//    react-native-sse. Both send the session cookie (withCredentials).
//  - Stream is closed while the app is in the background and reopened (plus an
//    onSync) when it returns to the foreground.
//  - The server sends a named "ping" event every ~20s. If nothing at all is
//    heard for `staleAfterMs`, the link is treated as dead and reopened.
//  - Bursts of the same topic are coalesced (`debounceMs`, a number for all topics
//    or a { topic: ms } map, e.g. { notifications: 300, 'course-content': 1500 }).
//  - onSync fires after every (re)connect and every `safetySyncMs` as a cheap
//    safety net, so a missed signal can never leave a screen stale for long.

import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import RNEventSource from 'react-native-sse';

export type LiveRole = 'student' | 'teacher' | 'admin';

/** topic name -> callback. Topics must match what the server publishes. */
export type LiveEventHandlers = Record<string, ((payload: any) => void) | undefined>;

export type UseLiveEventsOptions = {
  baseUrl: string;
  userId?: string | null;
  role: LiveRole;
  handlers: LiveEventHandlers;
  /** Called after every (re)connect and on the safety timer. */
  onSync?: () => void;
  enabled?: boolean;
  /** Coalescing window. A number applies to every topic; a map sets it per topic. */
  debounceMs?: number | Record<string, number>;
  /**
   * Extra request headers for the NATIVE stream (react-native-sse supports them).
   * Use it if your native app authenticates with a bearer token instead of the
   * session cookie, e.g.  getHeaders: () => ({ Authorization: `Bearer ${token}` }).
   * The browser EventSource cannot send custom headers and ignores this.
   */
  getHeaders?: () => Record<string, string> | undefined;
  safetySyncMs?: number; // 0 disables the safety timer
  staleAfterMs?: number;
};

type SseLike = {
  addEventListener: (type: string, listener: (event: any) => void) => void;
  close: () => void;
  readyState?: number;
};

const CLOSED = 2; // EventSource.CLOSED

export function useLiveEvents({
  baseUrl,
  userId,
  role,
  handlers,
  onSync,
  enabled = true,
  getHeaders,
  debounceMs = 300,
  safetySyncMs = 120_000,
  staleAfterMs = 50_000,
}: UseLiveEventsOptions) {
  // Latest callbacks live in refs so changing their identity never reconnects.
  const handlersRef = useRef(handlers);
  const onSyncRef = useRef(onSync);
  const getHeadersRef = useRef(getHeaders);
  handlersRef.current = handlers;
  onSyncRef.current = onSync;
  getHeadersRef.current = getHeaders;

  // Only the VALUES matter for effect identity, not a new object every render.
  const debounceKey = typeof debounceMs === 'number' ? String(debounceMs) : JSON.stringify(debounceMs);

  // Only the SET of topics matters for (re)subscribing.
  const topicsKey = Object.keys(handlers).sort().join(',');

  useEffect(() => {
    if (!enabled || !userId || !baseUrl) return;

    const topics = topicsKey ? topicsKey.split(',') : [];
    const url =
      `${baseUrl.replace(/\/+$/, '')}/events/stream` +
      `?userId=${encodeURIComponent(userId)}&role=${encodeURIComponent(role)}`;

    let disposed = false;
    let source: SseLike | null = null;
    let lastHeardAt = Date.now();
    let attempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

    const isBackground = () => AppState.currentState === 'background';

    const closeSource = () => {
      if (source) {
        try {
          source.close();
        } catch {
          /* already closed */
        }
        source = null;
      }
    };

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer) return;
      const delay = Math.min(30_000, 1_000 * 2 ** attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay);
    };

    const debounceFor = (topic: string) => {
      const cfg = JSON.parse(debounceKey);
      return typeof cfg === 'number' ? cfg : Number(cfg?.[topic] ?? cfg?.default ?? 300);
    };

    const fire = (topic: string, payload: any) => {
      // Coalesce bursts (e.g. a teacher posting to a whole class).
      const existing = debounceTimers.get(topic);
      if (existing) clearTimeout(existing);
      debounceTimers.set(
        topic,
        setTimeout(() => {
          debounceTimers.delete(topic);
          if (!disposed) handlersRef.current[topic]?.(payload);
        }, debounceFor(topic))
      );
    };

    function connect() {
      if (disposed || isBackground()) return;
      clearReconnect();
      closeSource();

      const Ctor: any = (globalThis as any).EventSource ?? RNEventSource;
      const headers = getHeadersRef.current?.();
      const mine: SseLike = new Ctor(url, headers ? { withCredentials: true, headers } : { withCredentials: true });
      source = mine;
      lastHeardAt = Date.now();

      const heard = () => {
        lastHeardAt = Date.now();
      };

      mine.addEventListener('open', () => {
        if (mine !== source) return;
        attempt = 0;
        heard();
        onSyncRef.current?.(); // catch up on anything missed while disconnected
      });

      mine.addEventListener('ready', heard);
      mine.addEventListener('ping', heard);

      for (const topic of topics) {
        mine.addEventListener(topic, (event: any) => {
          if (mine !== source) return;
          heard();
          let payload: any = {};
          try {
            payload = event?.data ? JSON.parse(event.data) : {};
          } catch {
            /* signal only; payload is optional */
          }
          fire(topic, payload);
        });
      }

      mine.addEventListener('error', () => {
        if (mine !== source) return;
        // Browsers retry on their own while CONNECTING; they give up for good
        // (CLOSED) on HTTP errors such as 401/403/5xx, so retry those ourselves.
        if (mine.readyState === CLOSED) {
          closeSource();
          scheduleReconnect();
        }
      });
    }

    // Dead-link watchdog: the server pings every ~20s.
    const watchdog = setInterval(() => {
      if (!source || isBackground()) return;
      if (Date.now() - lastHeardAt > staleAfterMs) {
        closeSource();
        connect();
      }
    }, 15_000);

    const safety =
      safetySyncMs > 0
        ? setInterval(() => {
            if (!isBackground()) onSyncRef.current?.();
          }, safetySyncMs)
        : null;

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        clearReconnect();
        closeSource(); // free the server connection while hidden
      } else if (!source) {
        attempt = 0;
        connect(); // 'open' will trigger onSync
      }
    });

    connect();

    return () => {
      disposed = true;
      clearReconnect();
      clearInterval(watchdog);
      if (safety) clearInterval(safety);
      debounceTimers.forEach((timer) => clearTimeout(timer));
      debounceTimers.clear();
      appStateSub?.remove?.();
      closeSource();
    };
  }, [baseUrl, userId, role, enabled, topicsKey, debounceKey, safetySyncMs, staleAfterMs]);
}