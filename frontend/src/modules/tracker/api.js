import CONFIG from './config';

export async function getActiveEvent() {
  const res = await fetch(`${CONFIG.apiBaseUrl}/tracker/active`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getUpcomingEvent(id) {
  const res = await fetch(`${CONFIG.apiBaseUrl}/tracker/upcoming/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getUpcomingActive(id) {
  const res = await fetch(`${CONFIG.apiBaseUrl}/tracker/upcoming/${id}/active`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function registerForUpcoming({ name, email, city, upcomingEventId, referredBy }) {
  const res = await fetch(`${CONFIG.apiBaseUrl}/tracker/register-upcoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, city, upcomingEventId, referredBy }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function registerForEvent({ name, email, city, eventId, referredBy }) {
  const res = await fetch(`${CONFIG.apiBaseUrl}/tracker/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, city, eventId, referredBy }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
