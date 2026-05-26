const KEY = 'saihello_seen_hints';

function getSeenHints() {
  try { return new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); }
  catch { return new Set(); }
}

export function hasSeenHint(id) {
  return getSeenHints().has(id);
}

export function markHintSeen(id) {
  const seen = getSeenHints();
  seen.add(id);
  localStorage.setItem(KEY, JSON.stringify([...seen]));
}

export function resetAllHints() {
  localStorage.removeItem(KEY);
}
