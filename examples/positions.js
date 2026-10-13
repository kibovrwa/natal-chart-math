// Geocentric tropical ecliptic longitudes.
// Run from the repo root: node examples/positions.js
//
// Sample birth: 12 April 1994, 07:42, Asia/Singapore.
// The city supplies the time zone. A geocentric longitude is the same
// from every geographic place.

import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from "astronomy-engine";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const PLANETS = [
  ["Mercury", Body.Mercury],
  ["Venus", Body.Venus],
  ["Mars", Body.Mars],
  ["Jupiter", Body.Jupiter],
  ["Saturn", Body.Saturn],
  ["Uranus", Body.Uranus],
  ["Neptune", Body.Neptune],
  ["Pluto", Body.Pluto],
];

function wrap(deg) {
  return ((deg % 360) + 360) % 360;
}

/** Civil YYYY-MM-DD and HH:MM in an IANA zone, as a UTC Date. */
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
  let deg = Math.floor(minutes / 60);
  minutes %= 60;
  if (deg === 30) {
    deg = 0;
    sign = (sign + 1) % 12;
  }
  return `${SIGNS[sign]} ${deg}°${String(minutes).padStart(2, "0")}′`;
}

function longitudeOf(body, date) {
  if (body === "sun") return wrap(SunPosition(date).elon);
  if (body === "moon") return wrap(EclipticGeoMoon(date).lon);
  return wrap(Ecliptic(GeoVector(body, date, true)).elon);
}

const when = zonedToUtc("1994-04-12", "07:42", "Asia/Singapore");
console.log("1994-04-12 07:42 Asia/Singapore");
console.log(`UTC ${when.toISOString()}`);
console.log("");

const rows = [
  ["Sun", longitudeOf("sun", when)],
  ["Moon", longitudeOf("moon", when)],
];
for (const [name, body] of PLANETS) rows.push([name, longitudeOf(body, when)]);

for (const [name, lon] of rows) {
  console.log(`${name.padEnd(9)} ${lon.toFixed(2).padStart(6)}°  ${formatLon(lon)}`);
}
