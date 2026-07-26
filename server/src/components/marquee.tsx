interface MarqueeItem {
  symbol: string;
  label: string;
}

/** Pure CSS infinite scroll (translateX keyframe on a doubled item list) - no JS animation loop needed. */
export function Marquee({ items }: { items: MarqueeItem[] }) {
  return (
    <div className="relative overflow-hidden py-2" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
      <div className="flex w-max animate-marquee gap-10">
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2.5 text-clay">
            <span className="text-xl text-saffron">{item.symbol}</span>
            <span className="whitespace-nowrap text-sm font-semibold tracking-wide">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
