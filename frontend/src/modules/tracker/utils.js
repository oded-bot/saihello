const MONTHS_DE = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export function formatEventDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${day}. ${MONTHS_DE[month - 1]} ${year}`;
}

export function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  return Math.ceil((target - today) / 86400000);
}

export function getRefFromUrl() {
  return new URLSearchParams(window.location.search).get('ref') || null;
}
