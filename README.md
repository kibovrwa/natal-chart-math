# natal-chart-math

Reference math for the angles in a tropical natal chart.

A chart here is a civil clock time and a geographic place, turned into ecliptic longitudes. The Sun, Moon, and planets have geocentric longitudes. The ascendant is the longitude on the eastern horizon, and the midheaven is the longitude on the meridian. House cusps are a convention laid on those angles. Sentences about character or fate are entertainment. The positions and the horizon geometry are ordinary astronomy.

The free in-browser chart at [astralhoro.com/chart](https://astralhoro.com/chart) is built on this approach. The scripts in `examples/` are the same kind of calculation, small enough to read straight through.

## Usage

Node 18 or newer. The only dependency is [`astronomy-engine`](https://www.npmjs.com/package/astronomy-engine).

```bash
npm install
node examples/positions.js
node examples/ascendant.js
node examples/houses.js
```

Worked example: 12 April 1994, 07:42, Singapore. Zone `Asia/Singapore`, latitude 1.3521°N, longitude 103.8198°E. Singapore does not use daylight saving, so that clock time is 1994-04-11 23:42 UTC.

## Tropical longitude

Ecliptic longitude is measured along the Earth's orbital plane, eastward from the March equinox of date, from 0° to 360°. That zero point is 0° tropical Aries. Each sign is the next 30°.

| Longitude | Sign | Longitude | Sign |
| --- | --- | --- | --- |
| 0° | Aries | 180° | Libra |
| 30° | Taurus | 210° | Scorpio |
| 60° | Gemini | 240° | Sagittarius |
| 90° | Cancer | 270° | Capricorn |
| 120° | Leo | 300° | Aquarius |
| 150° | Virgo | 330° | Pisces |

```
wrap(x)    = ((x mod 360) + 360) mod 360
sign index = floor(wrap(L) / 30)      # 0 = Aries … 11 = Pisces
degree     = wrap(L) mod 30
```

`astronomy-engine` already returns tropical longitude of date. A sidereal chart would subtract an ayanamsa from these degrees. This reference keeps the tropical value.

A geocentric longitude is the same from every city. The city still chooses the time zone, and the ascendant needs the city's latitude and longitude.

## Local civil time to UTC

The birth clock is civil time in the birthplace's IANA zone, with the daylight-saving rule that zone used on that date. Pass that zone explicitly. The zone of the machine running the script is a different place and selects a different instant.

Treat the civil fields as a UTC timestamp, format that instant in the target zone, and add the difference. Repeat until the zone clock matches the typed numbers. Offsets change at daylight-saving boundaries, so a real local time settles within a few passes. Stop after four.

```js
function zonedToUtc(date, time, timeZone) {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
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
    const p = Object.fromEntries(fmt.formatToParts(new Date(utc)).map((x) => [x.type, x.value]));
    const shown = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute);
    if (shown === wall) break;
    utc += wall - shown;
  }
  return new Date(utc);
}
```

`hourCycle: "h23"` asks for hours 00–23. The parsed hour is still taken modulo 24, because some engines format midnight as 24.

The same numbers in `America/New_York` are a different UTC instant, and the April offset there differs from the January offset. `Intl` applies the historical rule for the date you pass.

## Ecliptic longitude

```js
import { Body, Ecliptic, EclipticGeoMoon, GeoVector, SunPosition } from "astronomy-engine";

const sun = wrap(SunPosition(date).elon);
const moon = wrap(EclipticGeoMoon(date).lon);
const mars = wrap(Ecliptic(GeoVector(Body.Mars, date, true)).elon);
```

- `SunPosition(date).elon` is the apparent geocentric ecliptic longitude of the Sun, equinox of date.
- `EclipticGeoMoon(date).lon` is the geocentric ecliptic longitude of the Moon, equinox of date.
- For Mercury through Pluto, `GeoVector(body, date, true)` is a J2000 equatorial vector from the center of the Earth with aberration applied. `Ecliptic` rotates that vector onto the true ecliptic of date. Read `elon`.

`examples/positions.js` prints the Sun, the Moon, and the eight planets for the sample birth.

## Ascendant and midheaven

`SiderealTime(date)` is Greenwich apparent sidereal time in hours, in `[0, 24)`. Geographic longitude λ is east-positive, in degrees, so a place west of Greenwich is negative. Latitude φ is north-positive. Dividing longitude by 15 converts degrees to hours.

```
LST  = GAST + λ / 15
RAMC = wrap24(LST) × 15
```

`wrap24` folds hours into `[0, 24)` before the multiply. RAMC is the right ascension on the local meridian, in degrees.

True obliquity of date, ε, is `e_tilt(MakeTime(date)).tobl`, in degrees. Use that ε for the angles below and for the Placidus equatorial conversion. With RAMC, latitude φ, and ε in radians:

```
MC  = atan2( sin RAMC,  cos RAMC · cos ε )
ASC = atan2( cos RAMC, −(sin RAMC · cos ε + tan φ · sin ε) )
```

`atan2` returns radians. Convert to degrees and wrap into `[0, 360)`.

The midheaven is where the ecliptic crosses the local meridian. The ascendant is where it crosses the eastern horizon. The descendant is ASC + 180°, and the imum coeli is MC + 180°.

`examples/ascendant.js` prints GAST, RAMC, ε, the ascendant, and the midheaven for the Singapore sample.

At φ = ±90°, `tan φ` is undefined. Keep the latitude strictly inside the poles.

## Whole-sign houses

House 1 is the sign that contains the ascendant. The next sign is house 2, and so on around the zodiac. Any degree of the rising sign is house 1.

```
house(L) = ((floor(wrap(L) / 30) − floor(wrap(ASC) / 30) + 12) mod 12) + 1
```

The twelve cusps are the starts of those signs: `floor(wrap(ASC) / 30) × 30`, then every 30°.

## Placidus, and latitudes past about 66°

Houses 1, 4, 7, and 10 are the ascendant, the imum coeli, the descendant, and the midheaven. The other Placidus cusps trisect the semi-diurnal arc.

Convert a trial ecliptic longitude L to the equator of date with obliquity ε:

```
α = atan2( sin L · cos ε,  cos L )     right ascension, then wrapped to degrees
δ = asin( sin ε · sin L )              declination
```

The semi-diurnal arc, in degrees, is the hour angle from the meridian to the horizon:

```
H = arccos( −tan φ · tan δ )
```

H exists only when `−tan φ · tan δ` lies strictly inside (−1, 1). Outside that range the point stays above the horizon or stays below it, so it cannot mark a Placidus cusp.

The 11th, 12th, 9th, and 8th cusps are the longitudes whose right ascension satisfies

```
α = wrap( RAMC + f · H(δ) )
```

for f = +1/3, +2/3, −1/3, and −2/3. Those fractions are the eastern houses (still rising: 12, then 11) and the western houses (already culminated: 9, then 8). The example tries every 0.1° of longitude and keeps the closest right ascension. The night houses are the opposites:

| House | Cusp | House | Cusp |
| --- | --- | --- | --- |
| 1 | ASC | 7 | ASC + 180° |
| 2 | 8th + 180° | 8 | 8th |
| 3 | 9th + 180° | 9 | 9th |
| 4 | MC + 180° | 10 | MC |
| 5 | 11th + 180° | 11 | 11th |
| 6 | 12th + 180° | 12 | 12th |

Declination along the ecliptic stays within ±ε of the celestial equator, and ε is about 23.4°. A point of declination δ is circumpolar once `|φ| > 90° − |δ|`. The solstice degrees of the ecliptic reach that first, near ±66.6° of geographic latitude, which is where the polar circles sit. `examples/houses.js` treats Placidus as undefined when `|φ| > 66` (latitude 66 still runs the search; 66.1 does not) and whenever a fraction has no semi-arc solution.

Two replacements stay defined at that latitude.

**Whole sign** needs only the sign of the ascendant.

**Porphyry** keeps the four angles and trisects each ecliptic quadrant. With IC = MC + 180°, DSC = ASC + 180°, and `forward(a, b)` the eastward arc from a to b in `[0, 360)`:

```
2, 3   = ASC + (1/3, 2/3) · forward(ASC, IC)
5, 6   = IC  + (1/3, 2/3) · forward(IC,  DSC)
8, 9   = DSC + (1/3, 2/3) · forward(DSC, MC)
11, 12 = MC  + (1/3, 2/3) · forward(MC,  ASC)
```

`examples/houses.js` prints Placidus, Porphyry, and whole-sign cusps for the sample instant in Singapore. It then repeats the instant at Tromsø, 69.6492°N, 18.9553°E. Placidus is undefined there. The script falls back to Porphyry and still prints whole-sign cusps, which are the other usual replacement. In that Tromsø instant the ascendant and the midheaven fall in the same sign, so the Porphyry quadrants on either side of those angles are only about 20° long and several cusps pile up. Whole-sign cusps stay 30° apart.

## Pitfalls

- The IANA zone is part of the input. `07:42` in `Asia/Singapore` and `07:42` in `America/New_York` are different instants. April and January in New York use different offsets, and `Intl` carries the historical rule for the civil date.
- When clocks fall back, one civil time happens twice. When they spring forward, one civil time happens never. Run the conversion on a clock time that exists in that zone. Four offset corrections are enough for a real local time; a skipped hour has no UTC instant whose zone clock shows the typed numbers.
- East longitude is positive. Singapore is about +104°. New York is about −74°. The opposite sign shifts sidereal time by `2|λ|/15` hours and moves the ascendant by a large angle.
- The longitudes above are geocentric. The Moon's horizontal parallax reaches about 1°, so a topocentric Moon is a further correction. Aberration, included by `SunPosition` and by `GeoVector(..., true)`, is about 20″ of longitude.
- The geometric horizon above ignores atmospheric refraction, about 34′ of altitude at the horizon, which nudges the ascendant by a fraction of a degree.
- With an unknown birth time, the Moon's place is uncertain by roughly 13° across that civil day, and the ascendant changes sign in about two hours. Local noon only holds the date. House cusps want a known clock time.
- Whole-sign, Porphyry, and Placidus put the same longitude in different houses. The longitudes are the astronomy. The house number is the system you chose.
- Past about 66° of latitude, leave Placidus unset and use whole-sign or Porphyry. Well before that cutoff, from roughly 60° upward, Placidus cusps already crowd together. That crowding is the projection.
- Wrap every longitude into `[0, 360)` before you take a sign. Compare two longitudes by the shortest arc: a raw gap of 359° is a separation of 1°.

## License

MIT. Copyright 2026 kibovrwa. See [LICENSE](LICENSE).

A longer walkthrough of this approach, including the browser page, is [Compute a natal chart in the browser with astronomy-engine](https://dev.to/dylan_yu_7ffff00b5355942d/compute-a-natal-chart-in-the-browser-with-astronomy-engine-4b67).
