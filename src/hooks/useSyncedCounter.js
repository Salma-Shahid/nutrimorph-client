import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/**
 * A counter that stays instant under rapid taps and syncs safely.
 *
 * - Every tap updates a ref first (functional, never a stale closure), so
 *   fast +/- presses are never lost or double-applied.
 * - Persistence is debounced and serialized: only the latest absolute value
 *   is sent, one request at a time.
 * - A server response is applied only if no newer tap happened meanwhile,
 *   so slow responses can't make the count jump back.
 * - Failed syncs keep the local value (never revert to a stale count) and
 *   retry with backoff, on the next change, on resync(), or when the app
 *   returns to the foreground.
 *
 * `sync(value)` must persist `value` and may resolve to the server's value.
 */
export default function useSyncedCounter({
  value,
  sync,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  delay = 650,
  resetKey,
  onLocalChange,
  onPendingChange,
}) {
  const initial = Math.min(max, Math.max(min, Number(value) || 0));
  const [count, setCountState] = useState(initial);
  const [status, setStatus] = useState("idle"); // idle | saving | saved | offline
  const countRef = useRef(initial);
  const versionRef = useRef(0);
  const syncedVersionRef = useRef(0);
  const queueRef = useRef(Promise.resolve());
  const timerRef = useRef(null);
  const retryRef = useRef({ timer: null, attempt: 0 });
  const mountedRef = useRef(true);
  const syncRef = useRef(sync);
  const onLocalChangeRef = useRef(onLocalChange);
  const onPendingChangeRef = useRef(onPendingChange);
  syncRef.current = sync;
  onLocalChangeRef.current = onLocalChange;
  onPendingChangeRef.current = onPendingChange;

  const isDirty = useCallback(
    () => versionRef.current !== syncedVersionRef.current,
    [],
  );

  const apply = useCallback((next) => {
    countRef.current = next;
    if (mountedRef.current) setCountState(next);
    onLocalChangeRef.current?.(next);
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!isDirty()) return queueRef.current;
    const version = versionRef.current;
    const valueToSave = countRef.current;
    if (mountedRef.current) setStatus("saving");

    queueRef.current = queueRef.current
      .catch(() => undefined)
      .then(async () => {
        // A newer flush already covered this version.
        if (syncedVersionRef.current >= version) return;
        try {
          const serverValue = await syncRef.current(valueToSave);
          syncedVersionRef.current = Math.max(syncedVersionRef.current, version);
          retryRef.current.attempt = 0;
          const latest = versionRef.current === version;
          const parsed = Number(serverValue);
          if (latest && Number.isFinite(parsed) && parsed !== countRef.current) {
            apply(Math.min(max, Math.max(min, parsed)));
          }
          if (latest) onPendingChangeRef.current?.(false);
          if (mountedRef.current) setStatus(latest ? "saved" : "saving");
        } catch (error) {
          if (mountedRef.current) setStatus("offline");
          // Keep the local value; retry later with backoff (max ~60 s).
          const attempt = Math.min(retryRef.current.attempt + 1, 5);
          retryRef.current.attempt = attempt;
          clearTimeout(retryRef.current.timer);
          retryRef.current.timer = setTimeout(
            () => mountedRef.current && flush(),
            Math.min(60000, 2000 * 2 ** (attempt - 1)),
          );
        }
      });
    return queueRef.current;
  }, [apply, isDirty, max, min]);

  const update = useCallback(
    (updater) => {
      const current = countRef.current;
      const raw = typeof updater === "function" ? updater(current) : updater;
      const next = Math.min(max, Math.max(min, Math.floor(Number(raw) || 0)));
      if (next === current) return current;
      versionRef.current += 1;
      apply(next);
      onPendingChangeRef.current?.(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, delay);
      return next;
    },
    [apply, delay, flush, max, min],
  );

  // Adopt external values (server fetch, account switch) only when there are
  // no unsynced local changes, so a refresh never undoes pending taps.
  useEffect(() => {
    const external = Math.min(max, Math.max(min, Number(value) || 0));
    if (!isDirty() && external !== countRef.current) {
      countRef.current = external;
      setCountState(external);
    }
  }, [isDirty, max, min, value]);

  // A new account/day starts clean.
  useEffect(() => {
    versionRef.current = 0;
    syncedVersionRef.current = 0;
    retryRef.current.attempt = 0;
    clearTimeout(retryRef.current.timer);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    const external = Math.min(max, Math.max(min, Number(value) || 0));
    countRef.current = external;
    setCountState(external);
    setStatus("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  useEffect(() => {
    mountedRef.current = true;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") flush();
      else if (isDirty()) flush();
    });
    return () => {
      mountedRef.current = false;
      subscription.remove();
      clearTimeout(retryRef.current.timer);
      // Persist anything still pending when the screen unmounts.
      flush();
    };
  }, [flush, isDirty]);

  return {
    count,
    status,
    increment: (step = 1) => update((current) => current + step),
    decrement: (step = 1) => update((current) => current - step),
    set: update,
    flush,
    isDirty,
    getLatest: () => countRef.current,
  };
}
