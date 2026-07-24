import { MuhuratFinder } from "@/components/muhurat-finder";

export default function MuhuratPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-celestial-gold sm:text-3xl">
          Muhurat Finder
        </h1>
        <p className="mt-1 text-sm text-space-lavender">
          Find auspicious dates for your important life events, based on classical Panchanga tithi rules.
        </p>
      </div>
      <MuhuratFinder />
    </div>
  );
}
