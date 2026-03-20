import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PoolCard from "@/components/PoolCard";

async function getPools(timeframe?: string, status?: string, direction?: string) {
  let query = supabase
    .from("pools")
    .select("*")
    .order("created_at", { ascending: false });

  // Status filter
  if (status === "open") {
    query = query.eq("status", "open");
  } else if (status === "ended") {
    query = query.in("status", ["resolved", "locked"]);
  } else {
    // ALL — show open + resolved
    query = query.in("status", ["open", "locked", "resolved"]);
  }

  if (timeframe && ["fast", "medium", "slow"].includes(timeframe)) {
    query = query.eq("timeframe", timeframe);
  }

  if (direction && ["up", "down"].includes(direction)) {
    query = query.eq("direction", direction);
  }

  const { data } = await query.limit(100);
  return data ?? [];
}

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ timeframe?: string; status?: string; direction?: string }>;
}) {
  const { timeframe, status, direction } = await searchParams;
  const pools = await getPools(timeframe, status, direction);

  const activeStatus = status ?? "open";
  const activeTimeframe = timeframe ?? "all";
  const activeDirection = direction ?? "all";

  const statusFilters = [
    { key: "open", label: "OPEN" },
    { key: "ended", label: "ENDED" },
    { key: "all", label: "ALL" },
  ];

  const timeframeFilters = [
    { key: "all", label: "ALL" },
    { key: "fast", label: "⚡ 2H" },
    { key: "medium", label: "⚖️ 6H" },
    { key: "slow", label: "🐢 12H" },
  ];

  const directionFilters = [
    { key: "all", label: "ALL" },
    { key: "up", label: "↑ UP" },
    { key: "down", label: "↓ DOWN" },
  ];

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = {
      ...(timeframe ? { timeframe } : {}),
      ...(status ? { status } : {}),
      ...(direction ? { direction } : {}),
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== "all" && v !== "open") params.set(k, v);
    });
    // status=open is default, don't include in URL
    const str = params.toString();
    return `/pools${str ? `?${str}` : ""}`;
  }

  const openCount = pools.filter(p => p.status === "open").length;
  const endedCount = pools.filter(p => p.status === "resolved" || p.status === "locked").length;

  return (
    <main className="min-h-screen bg-[#060608] text-[#e2e2e2]">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00ff87] opacity-[0.015] blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5 flex items-center justify-between relative z-10">
        <Link href="/" className="font-mono text-xs tracking-[0.3em] text-[#00ff87]">PREDICTBAG</Link>
        <div className="flex items-center gap-6 text-xs font-mono text-[#555]">
          <Link href="/leaderboard" className="hover:text-[#e2e2e2] transition-colors">LEADERBOARD</Link>
          <Link href="/payout" className="hover:text-[#e2e2e2] transition-colors">PAYOUT</Link>
          <Link href="/skill" className="hover:text-[#e2e2e2] transition-colors">SKILL</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-10 relative z-10">
        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-mono text-[#333] tracking-[0.3em] mb-3">PREDICTION POOLS</p>
          <div className="flex items-end justify-between">
            <h1 className="text-4xl font-black tracking-tight">POOLS</h1>
            <div className="flex items-center gap-4 text-[10px] font-mono text-[#444]">
              <span><span className="text-[#00ff87]">{openCount}</span> OPEN</span>
              <span><span className="text-[#555]">{endedCount}</span> ENDED</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-8">

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#333] w-20 tracking-widest">STATUS</span>
            <div className="flex gap-2">
              {statusFilters.map((f) => (
                <Link
                  key={f.key}
                  href={buildUrl({ status: f.key })}
                  className={`px-3 py-1.5 text-[11px] font-mono border transition-colors ${
                    activeStatus === f.key
                      ? "border-[#00ff87]/40 text-[#00ff87] bg-[#00ff87]/5"
                      : "border-white/8 text-[#555] hover:text-[#e2e2e2] hover:border-white/15"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Direction */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#333] w-20 tracking-widest">DIRECTION</span>
            <div className="flex gap-2">
              {directionFilters.map((f) => (
                <Link
                  key={f.key}
                  href={buildUrl({ direction: f.key })}
                  className={`px-3 py-1.5 text-[11px] font-mono border transition-colors ${
                    activeDirection === f.key
                      ? f.key === "up"
                        ? "border-[#00ff87]/40 text-[#00ff87] bg-[#00ff87]/5"
                        : f.key === "down"
                        ? "border-[#ff6b35]/40 text-[#ff6b35] bg-[#ff6b35]/5"
                        : "border-[#00ff87]/40 text-[#00ff87] bg-[#00ff87]/5"
                      : "border-white/8 text-[#555] hover:text-[#e2e2e2] hover:border-white/15"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Timeframe */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#333] w-20 tracking-widest">TIMEFRAME</span>
            <div className="flex gap-2">
              {timeframeFilters.map((f) => (
                <Link
                  key={f.key}
                  href={buildUrl({ timeframe: f.key })}
                  className={`px-3 py-1.5 text-[11px] font-mono border transition-colors ${
                    activeTimeframe === f.key
                      ? "border-[#00ff87]/40 text-[#00ff87] bg-[#00ff87]/5"
                      : "border-white/8 text-[#555] hover:text-[#e2e2e2] hover:border-white/15"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Pool count */}
        <p className="text-[10px] font-mono text-[#333] mb-6">
          {pools.length} POOLS FOUND
        </p>

        {/* Pools grid */}
        {pools.length === 0 ? (
          <div className="border border-white/8 p-16 text-center">
            <p className="text-[#333] font-mono text-sm">NO POOLS FOUND</p>
            <p className="text-[#222] font-mono text-xs mt-2">
              Try changing the filters above
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
