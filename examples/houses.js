// Whole-sign, Porphyry, and Placidus cusps.
// Run from the repo root: node examples/houses.js
//
// Placidus is left unset when |latitude| > 66°. The script then uses
// Porphyry, and it always prints whole-sign cusps as well.
//
// The second place is the same UTC instant at Tromsø (69.65°N), where
// Placidus has no semi-arc solution for part of the ecliptic.
// There the ascendant and midheaven share a sign, so Porphyry cusps
// bunch into the short quadrants. Whole-sign cusps stay 30° apart.

import { e_tilt, MakeTime, SiderealTime } from "astronomy-engine";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function wrap(deg) {
  return ((deg % 360) + 360) % 360;
}

const rad = (d) => (d * Math.PI) / 180;
const deg = (r) => (r * 180) / Math.PI;

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

function ramcDegrees(date, lonDeg) {
  const lstHours = SiderealTime(date) + lonDeg / 15;
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

function angles(date, lat, lon) {
  const eps = e_tilt(MakeTime(date)).tobl;
  const ramc = ramcDegrees(date, lon);
  return { eps, ramc, asc: ascendant(ramc, lat, eps), mc: midheaven(ramc, eps) };
}

function equatorial(lonDeg, epsDeg) {
  const lon = rad(lonDeg);
  const eps = rad(epsDeg);
  const ra = Math.atan2(Math.sin(lon) * Math.cos(eps), Math.cos(lon));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lon));
  return { ra: wrap(deg(ra)), dec: deg(dec) };
}

/** Semi-diurnal arc in degrees, or null when the point never rises and sets. */
function semiArc(latDeg, decDeg) {
  const x = -Math.tan(rad(latDeg)) * Math.tan(rad(decDeg));
  if (x <= -1 || x >= 1) return null;
  return deg(Math.acos(x));
}

/**
 * Twelve Placidus cusps, index 0 = house 1.
 * Returns null when |lat| > 66°, where part of the ecliptic is circumpolar
 * and a semi-arc trisection has no solution.
 */
function placidusCusps(date, lat, lon) {
  if (Math.abs(lat) > 66) return null;
  const { eps, ramc, asc, mc } = angles(date, lat, lon);
  const find = (fraction) => {
    let best = null;
    let err = Infinity;
    for (let step = 0; step < 3600; step++) {
      const lambda = step / 10;
      const eq = equatorial(lambda, eps);
      const arc = semiArc(lat, eq.dec);
      if (arc == null) continue;
      const target = wrap(ramc + fraction * arc);
      const gap = Math.abs(((eq.ra - target + 540) % 360) - 180);
      if (gap < err) {
        err = gap;
        best = lambda;
      }
    }
    return best;
  };
  const eleventh = find(1 / 3);
  const twelfth = find(2 / 3);
  const ninth = find(-1 / 3);
  const eighth = find(-2 / 3);
  if ([eleventh, twelfth, ninth, eighth].some((cusp) => cusp == null)) return null;
  return [
    asc,
    wrap(eighth + 180),
    wrap(ninth + 180),
    wrap(mc + 180),
    wrap(eleventh + 180),
    wrap(twelfth + 180),
    wrap(asc + 180),
    eighth,
    ninth,
    mc,
    eleventh,
    twelfth,
  ];
}

/** Eastward arc from `fromDeg` to `toDeg`, in [0, 360). */
function forward(fromDeg, toDeg) {
  return wrap(toDeg - fromDeg);
}

/** Trisect ASC→IC→DSC→MC in ecliptic longitude. Defined wherever ASC and MC are. */
function porphyryCusps(asc, mc) {
  const ic = wrap(mc + 180);
  const dsc = wrap(asc + 180);
  const between = (from, to, fraction) => wrap(from + forward(from, to) * fraction);
  return [
    asc,
    between(asc, ic, 1 / 3),
    between(asc, ic, 2 / 3),
    ic,
    between(ic, dsc, 1 / 3),
    between(ic, dsc, 2 / 3),
    dsc,
    between(dsc, mc, 1 / 3),
    between(dsc, mc, 2 / 3),
    mc,
    between(mc, asc, 1 / 3),
    between(mc, asc, 2 / 3),
  ];
}

/** House 1 starts at 0° of the rising sign. Later cusps are 30° apart. */
function wholeSignCusps(asc) {
  const start = Math.floor(wrap(asc) / 30) * 30;
  return Array.from({ length: 12 }, (_, i) => wrap(start + i * 30));
}

function wholeSignHouse(lon, asc) {
  const sign = (value) => Math.floor(wrap(value) / 30) % 12;
  return ((sign(lon) - sign(asc) + 12) % 12) + 1;
}

function printCusps(title, cusps) {
  console.log(title);
  cusps.forEach((lon, i) => {
    console.log(`  ${String(i + 1).padStart(2)}  ${lon.toFixed(2).padStart(6)}°  ${formatLon(lon)}`);
  });
}

function report(label, date, lat, lon) {
  const { asc, mc } = angles(date, lat, lon);
  console.log(label);
  console.log(`  φ ${lat.toFixed(4)}°   λ ${lon.toFixed(4)}°`);
  console.log(`  ASC ${asc.toFixed(2)}°  ${formatLon(asc)}`);
  console.log(`  MC  ${mc.toFixed(2)}°  ${formatLon(mc)}`);

  const placidus = placidusCusps(date, lat, lon);
  if (placidus) {
    printCusps("  Placidus", placidus);
    printCusps("  Porphyry", porphyryCusps(asc, mc));
  } else {
    console.log("  Placidus is undefined (|φ| > 66°).");
    printCusps("  Porphyry (fallback)", porphyryCusps(asc, mc));
  }
  printCusps("  whole sign", wholeSignCusps(asc));
  console.log(`  whole-sign house of the midheaven: ${wholeSignHouse(mc, asc)}`);
  console.log("");
}

const when = zonedToUtc("1994-04-12", "07:42", "Asia/Singapore");
console.log(`UTC ${when.toISOString()}`);
console.log("");

report("Singapore", when, 1.3521, 103.8198);
report("Tromsø, same instant", when, 69.6492, 18.9553);
