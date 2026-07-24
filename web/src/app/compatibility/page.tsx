import { CompatibilityChecker } from "@/components/compatibility-checker";

export default function CompatibilityPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-saffron sm:text-3xl">
          Kundli Milan
        </h1>
        <p className="mt-1 text-sm text-clay">
          Instant Ashtakoot Guna Milan - the classical 36-point Vedic marriage compatibility system.
        </p>
      </div>
      <CompatibilityChecker />
    </div>
  );
}
