export type HeartbeatHandle = { stop: () => void };
export type HeartbeatEvent = 'lost' | 'error';

export function startHeartbeat(
  letter: string,
  lockToken: string,
  onEvent: (e: HeartbeatEvent) => void,
  intervalMs = 15_000,
): HeartbeatHandle {
  let stopped = false;
  const tick = async () => {
    if (stopped) return;
    try {
      const res = await fetch('/api/locks/heartbeat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letter, lock_token: lockToken }),
      });
      if (res.status === 410) onEvent('lost');
      else if (!res.ok) onEvent('error');
    } catch {
      onEvent('error');
    }
  };
  const id = setInterval(tick, intervalMs);
  void tick();
  return {
    stop() {
      stopped = true;
      clearInterval(id);
    },
  };
}
