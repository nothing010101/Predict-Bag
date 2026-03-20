import Link from "next/link";
import { supabase } from "@/lib/supabase";
import BloombergLayout from "@/components/BloombergLayout";
import TokenImage from "@/components/TokenImage";

function formatMC(mc: number): string {
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "ENDED";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}H ${m}M`;
  return `${m}M`;
}

async function getPools(timeframe?: string, status?: string, direction?: string) {
  let query = supabase.from("pools").select("*").order("created_at", { ascending: false });

  if (status === "open") query = query.eq("status", "open");
  else if (status === "ended") query = query.in("status", ["resolved", "locked"]);
  else query = query.in("status", ["open", "locked", "resolved"]);

  if (timeframe && ["fast", "medium", "slow"].includes(timeframe)) query = query.eq("timeframe", timeframe);
  if (direction && ["up", "down"].includes(direction)) query = query.eq("direction", direction);

  const { data } = await query.limit(100);
  return data ?? [];
}

function buildUrl(current: Record<string, string>, overrides: Record<string, string>) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  Object.entries(merged).forEach(([k, v]) => {
    if (v && v !== "all" && !(k === "status" && v === "open")) params.set(k, v);
  });
  const s = params.toString();
  return `/pools${s ? `?${s}` : ""}`;
}

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string; status?: string; direction?: string }>;
}) {
  const sp = await searchParams;
  const timeframe = sp.timeframe;
  const status = sp.status ?? "open";
  const direction = sp.direction;

  const pools = await getPools(timeframe, status, direction);
  const current = { timeframe: timeframe ?? "all", status, direction: direction ?? "all" };

  const statusFilters = [
    { key: "open", label: "OPEN" },
    { key: "ended", label: "ENDED" },
    { key: "all", label: "ALL" },
  ];
  const dirFilters = [
    { key: "all", label: "ALL" },
    { key: "up", label: "↑ UP" },
    { key: "down", label: "↓ DOWN" },
  ];
  const tfFilters = [
    { key: "all", label: "ALL" },
    { key: "fast", label: "2H FAST" },
    { key: "medium", label: "6H MEDIUM" },
    { key: "slow", label: "12H SLOW" },
  ];

  return (
    <BloombergLayout>
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="border border-[#f5a623]/15 mb-4">
          <div className="border-b border-[#f5a623]/15 px-5 py-3 bg-[#f5a623]/5 flex items-center justify-between">
            <p className="text-[#f5a623] text-[10px] font-black tracking-widest">// PREDICTION POOLS</p>
            <p className="text-[#e8d5a3]/30 text-[10px]">{pools.length} RESULTS</p>
          </div>

          {/* Filters */}
          <div className="p-4 space-y-3">
            {[
              { label: "STATUS", filters: statusFilters, active: status, key: "status" },
              { label: "DIRECTION", filters: dirFilters, active: direction ?? "all", key: "direction" },
              { label: "TIMEFRAME", filters: tfFilters, active: timeframe ?? "all", key: "timeframe" },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 flex-wrap">
                <span className="text-[#e8d5a3]/20 text-[10px] tracking-widest w-20 flex-shrink-0">{row.label}</span>
                <div className="flex gap-0">
                  {row.filters.map(f => (
                    <Link key={f.key}
                      href={buildUrl(current, { [row.key]: f.key })}
                      className={`px-3 py-1.5 text-[10px] font-bold tracking-wider border-r border-[#f5a623]/10 last:border-r-0 transition-colors ${
                        row.active === f.key
                          ? "bg-[#f5a623] text-[#0a0a0a]"
                          : "text-[#e8d5a3]/30 hover:text-[#e8d5a3]/70 hover:bg-[#f5a623]/10"
                      }`}>
                      {f.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pool table */}
        {pools.length === 0 ? (
          <div className="border border-[#f5a623]/15 p-16 text-center">
            <p className="text-[#e8d5a3]/20 text-sm font-mono">NO POOLS FOUND</p>
            <p className="text-[#e8d5a3]/10 text-xs mt-2">Adjust filters above</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-12 px-4 py-2 border border-[#f5a623]/10 border-b-0 bg-[#f5a623]/5 text-[10px] font-black tracking-widest text-[#e8d5a3]/30">
              <span className="col-span-3">TOKEN</span>
              <span className="col-span-3">QUESTION</span>
              <span className="col-span-2 text-right">CURRENT MC</span>
              <span className="col-span-2 text-right">TARGET</span>
              <span className="col-span-1 text-right">POT</span>
              <span className="col-span-1 text-right">TIME</span>
            </div>

            <div className="border border-[#f5a623]/10 divide-y divide-[#f5a623]/5">
              {pools.map(pool => {
                const isUp = (pool.direction ?? "up") === "up";
                const isOpen = pool.status === "open";
                const tl = timeLeft(pool.closes_at);

                return (
                  <Link href={`/predict/${pool.id}`} key={pool.id}>
                    <div className="grid grid-cols-12 px-4 py-3 hover:bg-[#f5a623]/5 transition-colors items-center gap-2">

                      {/* Token */}
                      <div className="col-span-12 md:col-span-3 flex items-center gap-2">
                        <TokenImage
                          src={pool.token_image_url}
                          symbol={pool.token_symbol}
                          size={28}
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#e8d5a3] font-black text-sm">{pool.token_symbol}</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 ${isUp ? "text-[#4caf50] bg-[#4caf50]/10" : "text-[#f44336] bg-[#f44336]/10"}`}>
                              {isUp ? "↑UP" : "↓DN"}
                            </span>
                            <span className={`text-[10px] font-mono ${
                              pool.timeframe === "fast" ? "text-[#f5a623]" :
                              pool.timeframe === "medium" ? "text-[#42a5f5]" : "text-[#ab47bc]"
                            }`}>
                              {pool.timeframe === "fast" ? "2H" : pool.timeframe === "medium" ? "6H" : "12H"}
                            </span>
                          </div>
                          <div className="text-[#e8d5a3]/20 text-[10px]">{pool.token_name}</div>
                        </div>
                      </div>

                      {/* Question */}
                      <div className="col-span-12 md:col-span-3 text-[11px] text-[#e8d5a3]/40 leading-relaxed md:pr-4">
                        {pool.question}
                      </div>

                      {/* Current MC */}
                      <div className="col-span-6 md:col-span-2 text-right">
                        <span className="text-[#e8d5a3]/60 text-sm font-mono">{formatMC(pool.current_mc)}</span>
                      </div>

                      {/* Target */}
                      <div className="col-span-6 md:col-span-2 text-right">
                        <span className={`text-sm font-mono font-bold ${isUp ? "text-[#4caf50]" : "text-[#f44336]"}`}>
                          {formatMC(pool.target_mc)}
                        </span>
                      </div>

                      {/* Pot */}
                      <div className="col-span-6 md:col-span-1 text-right">
                        <span className="text-[#f5a623] text-[11px] font-mono">
                          {pool.total_pot > 0 ? pool.total_pot.toLocaleString() : "—"}
                        </span>
                      </div>

                      {/* Time */}
                      <div className="col-span-6 md:col-span-1 text-right">
                        <span className={`text-[11px] font-mono font-bold ${
                          !isOpen ? "text-[#e8d5a3]/20" :
                          tl.includes("M") && !tl.includes("H") ? "text-[#f44336]" : "text-[#e8d5a3]/60"
                        }`}>
                          {!isOpen ? (pool.outcome ? pool.outcome.toUpperCase() : "ENDED") : tl}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </BloombergLayout>
  );
}
