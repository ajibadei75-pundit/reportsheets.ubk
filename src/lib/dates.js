const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ord = (n) => n + (["th", "st", "nd", "rd"][(n % 100 - 20) % 10] || ["th", "st", "nd", "rd"][n % 100] || "th");

function parse(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}
// "Monday, 12th January, 2026"; free text that is not a date is returned unchanged
export function longDate(v) {
  const d = parse(v);
  if (!d) return v || "";
  return `${DAYS[d.getDay()]}, ${ord(d.getDate())} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}
// "Mon, 12th Jan 2026" for tight spaces
export function shortDate(v) {
  const d = parse(v);
  if (!d) return v || "";
  return `${DAYS[d.getDay()].slice(0, 3)}, ${ord(d.getDate())} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}
