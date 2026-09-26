/**
 * Kalenderwoche (ISO 8601) zu einem Datum
 * @param {string|Date} dateStr - Datum z. B. "2026-03-15"
 * @returns {number} KW 1–53
 */
export function getISOWeek(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7; // So = 7
  date.setDate(date.getDate() + 4 - day);
  const yearStart = new Date(date.getFullYear(), 0, 1);
  return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}

/**
 * Montag einer ISO-Kalenderwoche als YYYY-MM-DD (KW 1 = Woche mit 4. Jan.)
 * @param {number} year
 * @param {number} week - KW 1–53
 */
export function getMondayOfISOWeek(year, week) {
  const jan4 = new Date(year, 0, 4);
  const daysToMonday = (jan4.getDay() + 6) % 7; // So=0 -> 6, Mo=1 -> 0
  const monday = new Date(year, 0, 4 - daysToMonday + (week - 1) * 7);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
