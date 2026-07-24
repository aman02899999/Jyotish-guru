import { calculateBirthChart, RASHI_NAMES, RASHI_ENGLISH_NAMES } from "@/lib/birth-chart-calculator";
import { Card } from "@/components/ui/card";
import { ShareButton } from "@/components/share-button";

// Standard North Indian chart construction: outer square + both diagonals +
// the diamond connecting edge midpoints, producing 4 "kite" houses (1,4,7,10)
// and 8 triangular houses. House 1 is always the fixed top-center kite; the
// zodiac sign occupying it (and each subsequent house, clockwise) is what
// changes chart to chart based on the ascendant.
const HOUSE_POLYGONS: Record<number, [number, number][]> = {
  1: [[0.5, 0], [0.75, 0.25], [0.5, 0.5], [0.25, 0.25]],
  2: [[0, 0], [0.5, 0], [0.25, 0.25]],
  3: [[0, 0], [0.25, 0.25], [0, 0.5]],
  4: [[0, 0.5], [0.25, 0.25], [0.5, 0.5], [0.25, 0.75]],
  5: [[0, 0.5], [0.25, 0.75], [0, 1]],
  6: [[0, 1], [0.25, 0.75], [0.5, 1]],
  7: [[0.5, 1], [0.25, 0.75], [0.5, 0.5], [0.75, 0.75]],
  8: [[0.5, 1], [0.75, 0.75], [1, 1]],
  9: [[1, 1], [0.75, 0.75], [1, 0.5]],
  10: [[1, 0.5], [0.75, 0.75], [0.5, 0.5], [0.75, 0.25]],
  11: [[1, 0.5], [0.75, 0.25], [1, 0]],
  12: [[1, 0], [0.75, 0.25], [0.5, 0]],
};

// Where to anchor each house's sign number + planet glyphs - pulled toward
// the outer edge of each region, away from the crowded center point.
const HOUSE_LABEL_ANCHOR: Record<number, [number, number]> = {
  1: [0.5, 0.14], 2: [0.25, 0.11], 3: [0.11, 0.25], 4: [0.15, 0.5],
  5: [0.11, 0.75], 6: [0.25, 0.89], 7: [0.5, 0.86], 8: [0.75, 0.89],
  9: [0.89, 0.75], 10: [0.85, 0.5], 11: [0.89, 0.25], 12: [0.75, 0.11],
};

export function BirthChart({ dob, tob }: { dob: string; tob: string }) {
  const chart = calculateBirthChart(dob, tob);
  const size = 320;

  const placementsByHouse = new Map<number, typeof chart.placements>();
  for (const placement of chart.placements) {
    const list = placementsByHouse.get(placement.houseNumber) ?? [];
    list.push(placement);
    placementsByHouse.set(placement.houseNumber, list);
  }

  return (
    <Card className="p-5">
      <p className="font-display mb-1 text-sm font-bold text-saffron">Your Birth Chart (Rashi Kundli)</p>
      <p className="mb-4 text-xs text-clay">
        Ascendant (Lagna): <span className="text-ink">{RASHI_NAMES[chart.ascendantSignIndex]}</span> (
        {RASHI_ENGLISH_NAMES[chart.ascendantSignIndex]})
      </p>

      <div className="flex justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Vedic birth chart">
          <rect x={0} y={0} width={size} height={size} rx={12} className="fill-cream" />
          {Object.entries(HOUSE_POLYGONS).map(([houseNumber, points]) => (
            <polygon
              key={houseNumber}
              points={points.map(([x, y]) => `${x * size},${y * size}`).join(" ")}
              className="fill-transparent stroke-saffron/40"
              strokeWidth={1}
            />
          ))}

          {chart.houses.map((house) => {
            const [ax, ay] = HOUSE_LABEL_ANCHOR[house.houseNumber];
            const planets = placementsByHouse.get(house.houseNumber) ?? [];
            return (
              <g key={house.houseNumber}>
                <text
                  x={ax * size}
                  y={ay * size - (planets.length > 0 ? 10 : 0)}
                  textAnchor="middle"
                  className="fill-clay/70 text-[9px]"
                >
                  {house.signIndex + 1}
                </text>
                {planets.length > 0 && (
                  <text x={ax * size} y={ay * size + 4} textAnchor="middle" className="fill-saffron text-[11px] font-semibold">
                    <title>{planets.map((p) => p.name).join(", ")}</title>
                    {planets.map((p) => p.symbol).join(" ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <p className="mt-3 text-center text-[10px] text-clay/60">
        Numbers show each house&apos;s Rashi (1=Mesha/Aries .. 12=Meena/Pisces). Symbols show your grahas.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-3">
        {chart.placements.map((p) => (
          <div key={p.key} className="rounded-lg bg-cream px-2 py-1.5 text-center">
            <p className="text-[10px] font-bold text-saffron">
              {p.symbol} {p.name}
            </p>
            <p className="text-[9px] text-clay">
              {RASHI_ENGLISH_NAMES[p.signIndex]} {p.degreeInSign.toFixed(1)}°
            </p>
          </div>
        ))}
      </div>

      <ShareButton
        filename="birth-chart.png"
        label="Share My Birth Chart"
        className="no-print mt-4 w-full"
        options={{
          emoji: "🪐",
          title: "My Birth Chart",
          subtitle: `Ascendant: ${RASHI_NAMES[chart.ascendantSignIndex]} (${RASHI_ENGLISH_NAMES[chart.ascendantSignIndex]})`,
          lines: chart.placements
            .slice(0, 5)
            .map((p) => ({ label: p.name, value: `${RASHI_ENGLISH_NAMES[p.signIndex]} ${p.degreeInSign.toFixed(1)}°` })),
          footer: "Get your full birth chart at Adi Jyotish Gurus",
        }}
      />
    </Card>
  );
}
