// Ascendant and midheaven from sidereal time, latitude, and obliquity.
// Run from the repo root: node examples/ascendant.js
//
// Sample: 12 April 1994, 07:42, Singapore (1.3521°N, 103.8198°E).

import { e_tilt, MakeTime, SiderealTime } from "astronomy-engine";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const birth = {
  date: "1994-04-12",
  time: "07:42",
  timeZone: "Asia/Singapore",
  lat: 1.3521,
  lon: 103.8198,
};

function wrap(deg) {
  return ((deg % 360) + 360) % 360;
}

const rad = (deg) => (deg * Math.PI) / 180;
const deg = (radian) => (radian * 180) / Math.PI;

function zonedToUtc(date, time, timeZone) {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if (![y, mo, d, hh, mm].every(Number.isFinite)) {
    throw new Error("Expected a date YYYY-MM-DD and a time HH:MM.");
  }
  const wall = Date.UTC(y, mo - 1, d, hh, mm, 0);
  let utc = wall;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  for (let i = 0; i < 4; i++) {
    const part = Object.fromEntries(fmt.formatToParts(new Date(utc)).map((p) => [p.type, p.value]));
    const shown = Date.UTC(+part.year, +part.month - 1, +part.day, +part.hour % 24, +part.minute);
    if (shown === wall) return new Date(utc);
    utc += wall - shown;
  }
  return new Date(utc);
}

function formatLon(lon) {
  const n = wrap(lon);
  let sign = Math.floor(n / 30) % 12;
  let minutes = Math.round((n % 30) * 60);
  let whole = Math.floor(minutes / 60);
  minutes %= 60;
  if (whole === 30) {
    whole = 0;
    sign = (sign + 1) % 12;
  }
  return `${SIGNS[sign]} ${whole}°${String(minutes).padStart(2, "0")}′`;
}

/** Right ascension of the local meridian, in degrees. Longitude is east-positive. */
function ramcDegrees(date, lonDeg) {
  const gastHours = SiderealTime(date);
  const lstHours = gastHours + lonDeg / 15;
  return wrap((((lstHours % 24) + 24) % 24) * 15);
}

function midheaven(ramcDeg, epsDeg) {
  const ramc = rad(ramcDeg);
  const eps = rad(epsDeg);
  return wrap(deg(Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps))));
}

function ascendant(ramcDeg, latDeg, epsDeg) {
  const ramc = rad(ramcDeg);
  const lat = rad(latDeg);
  const eps = rad(epsDeg);
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps));
  return wrap(deg(Math.atan2(y, x)));
}

const when = zonedToUtc(birth.date, birth.time, birth.timeZone);
const eps = e_tilt(MakeTime(when)).tobl;
const gast = SiderealTime(when);
const ramc = ramcDegrees(when, birth.lon);
const asc = ascendant(ramc, birth.lat, eps);
const mc = midheaven(ramc, eps);

console.log(`${birth.date} ${birth.time} ${birth.timeZone}`);
console.log(`UTC     ${when.toISOString()}`);
console.log(`GAST    ${gast.toFixed(4)} h`);
console.log(`RAMC    ${ramc.toFixed(2)}°`);
console.log(`ε       ${eps.toFixed(4)}°`);
console.log(`φ       ${birth.lat}°   λ ${birth.lon}°`);
console.log(`ASC     ${asc.toFixed(2)}°  ${formatLon(asc)}`);
console.log(`MC      ${mc.toFixed(2)}°  ${formatLon(mc)}`);
