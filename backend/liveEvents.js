// liveEvents.js
//
// Server-Sent Events hub. Each signed-in user keeps ONE long-lived connection
// open (GET /events/stream). When something changes, the server pushes a tiny
// "something changed" signal down the connections that care. Signals carry no
// real data: the client reacts by re-fetching through the endpoints it already
// uses.
//
// Two ways to target a signal:
//   publishLiveEvent(topic, { userId, role }, payload)  -> one specific user
//   publishToClass(topic, classId, payload, filter?)    -> everyone in a class
//
// Class membership is loaded by the stream route when a connection opens and
// refreshed with setLiveClassIds() whenever someone joins/leaves a class.
//
// IMPORTANT: connections live in this process's memory. That is correct while
// the Render service runs a single instance (always true on Render's free
// tier). With 2+ instances, a write handled by instance A cannot reach a
// stream held by instance B — put Redis pub/sub (or Firestore listeners)
// behind these publish functions before scaling out.

const HEARTBEAT_MS = 20_000; // named "ping" events; clients use them to detect dead links
const RETRY_MS = 3_000; // EventSource reconnect delay hint sent to the browser
const MAX_STREAMS_PER_USER = 5; // multiple tabs/devices are fine, leaks are not

// "role:userId" -> Set<client>, client = { res, userId, role, classIds:Set<string> }
const streams = new Map();

const keyFor = (role, userId) => `${role}:${userId}`;
const toClassSet = (ids) =>
  new Set((Array.isArray(ids) ? ids : []).map((id) => String(id).trim()).filter(Boolean));

function send(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data ?? {})}\n\n`);
}

/**
 * Turns an already-authenticated, already-authorised request into an SSE stream.
 * The caller (the route in server.js) is responsible for auth + ownership checks
 * and for passing the user's current classIds.
 */
export function openLiveStream(req, res, { userId, role, classIds = [], authUid = null }) {
  // Never let Node/the OS time this socket out; keep it flowing.
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.status(200).set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // tell proxies not to buffer the stream
  });
  res.flushHeaders();
  res.write(`retry: ${RETRY_MS}\n\n`);

  const key = keyFor(role, userId);
  let set = streams.get(key);
  if (!set) {
    set = new Set();
    streams.set(key, set);
  }

  // Too many open streams for one user? Drop the oldest.
  while (set.size >= MAX_STREAMS_PER_USER) {
    const oldest = set.values().next().value;
    set.delete(oldest);
    try {
      oldest.res.end();
    } catch {
      /* already gone */
    }
  }

  const client = { res, userId, role, authUid: authUid ? String(authUid).trim() : null, classIds: toClassSet(classIds) };
  set.add(client);
  send(res, "ready", { t: Date.now() });

  const heartbeat = setInterval(() => {
    try {
      send(res, "ping", { t: Date.now() });
    } catch {
      cleanup();
    }
  }, HEARTBEAT_MS);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    clearInterval(heartbeat);
    set.delete(client);
    if (set.size === 0 && streams.get(key) === set) streams.delete(key);
  }

  req.on("close", cleanup);
  res.on("close", cleanup);
  res.on("error", cleanup); // an unhandled 'error' on res would crash the process
}

/** Does this user currently have at least one open stream? */
export function hasLiveStream(userId, role) {
  const set = streams.get(keyFor(role, userId));
  return !!set && set.size > 0;
}

/** Replace the class list on all of one user's open streams (join/leave a class). */
export function setLiveClassIds(userId, role, classIds) {
  const set = streams.get(keyFor(role, userId));
  if (!set) return;
  const next = toClassSet(classIds);
  for (const client of set) client.classIds = new Set(next);
}

/**
 * Push a signal to every open stream of ONE user. Never throws, so it is safe
 * to call from inside write paths (e.g. createNotification).
 * Returns how many streams received it.
 */
export function publishLiveEvent(topic, { userId, role } = {}, payload = {}) {
  try {
    if (!userId || !role) return 0;
    const set = streams.get(keyFor(role, userId));
    if (!set || set.size === 0) return 0;

    let delivered = 0;
    for (const client of set) {
      try {
        send(client.res, topic, payload);
        delivered += 1;
      } catch {
        /* that connection will clean itself up on 'close' */
      }
    }
    return delivered;
  } catch (error) {
    console.error("publishLiveEvent error:", error);
    return 0;
  }
}

/**
 * Push a signal to everyone who belongs to a class and is connected right now.
 * `filter(client)` can narrow it further (client = { userId, role }), e.g. only
 * teachers plus one specific student. Never throws. Returns delivery count.
 */
export function publishToClass(topic, classId, payload = {}, filter) {
  try {
    const cid = classId == null ? "" : String(classId).trim();
    if (!cid) return 0;

    let delivered = 0;
    for (const set of streams.values()) {
      for (const client of set) {
        if (!client.classIds.has(cid)) continue;
        try {
          if (filter && !filter(client)) continue;
          send(client.res, topic, { classId: cid, ...payload });
          delivered += 1;
        } catch {
          /* that connection will clean itself up on 'close' */
        }
      }
    }
    return delivered;
  } catch (error) {
    console.error("publishToClass error:", error);
    return 0;
  }
}

/**
 * Push a signal to specific people, wherever they are connected. `people` is a
 * list of { userId, userUid } (e.g. a chat's participants). A stream matches when
 * its user id equals a person's userId OR its auth uid equals their userUid, so it
 * works whichever id the data was saved with. `filter(client)` can narrow it.
 * Never throws. Returns delivery count.
 */
export function publishToPeople(topic, people, payload = {}, filter) {
  try {
    const ids = new Set();
    const uids = new Set();
    for (const person of Array.isArray(people) ? people : []) {
      if (person?.userId) ids.add(String(person.userId).trim());
      if (person?.userUid) uids.add(String(person.userUid).trim());
    }
    if (!ids.size && !uids.size) return 0;

    let delivered = 0;
    for (const set of streams.values()) {
      for (const client of set) {
        if (!ids.has(client.userId) && !(client.authUid && uids.has(client.authUid))) continue;
        try {
          if (filter && !filter(client)) continue;
          send(client.res, topic, payload);
          delivered += 1;
        } catch {
          /* that connection will clean itself up on 'close' */
        }
      }
    }
    return delivered;
  } catch (error) {
    console.error("publishToPeople error:", error);
    return 0;
  }
}

/**
 * Push a signal to every connected user (optionally narrowed by `filter`). Only for
 * genuinely app-wide feeds such as the community board. Never throws.
 */
export function publishToAll(topic, payload = {}, filter) {
  try {
    let delivered = 0;
    for (const set of streams.values()) {
      for (const client of set) {
        try {
          if (filter && !filter(client)) continue;
          send(client.res, topic, payload);
          delivered += 1;
        } catch {
          /* that connection will clean itself up on 'close' */
        }
      }
    }
    return delivered;
  } catch (error) {
    console.error("publishToAll error:", error);
    return 0;
  }
}

/** Handy for /health or debugging: how many users / connections are live. */
export function getLiveStreamStats() {
  let connections = 0;
  for (const set of streams.values()) connections += set.size;
  return { users: streams.size, connections };
}