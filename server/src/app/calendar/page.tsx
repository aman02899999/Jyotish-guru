import { AuspiciousCalendar } from "@/components/auspicious-calendar";

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-wide text-saffron sm:text-3xl">
          Auspicious Day Calendar
        </h1>
        <p className="mt-1 text-sm text-clay">
          A month-at-a-glance view of favorable and cautious days, based on classical Panchanga tithi rules.
        </p>
      </div>
      <AuspiciousCalendar />
    </div>
  );
}
