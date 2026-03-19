import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PoolCard from "@/components/PoolCard";

async function getPools(timeframe?: string) {
  let query = supabase
    .from("pools")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (timeframe && ["fast", "medium", "slow"].includes(timeframe)) {
    query = query.eq("timeframe", timeframe);
  }

  const { data } = await query;
  return data ?? [];
}

export default async function PoolsPage({
  searchParams,
}: {
  searchParams: { timeframe?: string };
}) {
  const pools = await getPools(searchParams.timeframe);
  const active = searchParams.timeframe ?? "all";

  const filters = [
    { key: "all", label: "ALL" },
    { key: "fast", label: "⚡ FAST 2H" },
    { key: "medium", label: "⚖️ MEDIUM 6H" },
    { key: "slow", label: "🐢 SLOW 12H" },
  ];

  return (
    <main className="min-h-screen">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</Link>
        <div className="flex items-center gap-6 text-sm text-dim">
          <Link href="/payout" className="hover:text-text transition-colors">Payout</Link>
          <Link href="/skill" className="hover:text-text transition-colors">Get Skill</Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black">OPEN POOLS</h1>
            <p className="text-dim text-sm mt-1 font-mono">{pools.length} pools available</p>
          </div>
        </div>

        {/* Timeframe filter */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/pools" : `/pools?timeframe=${f.key}`}
              className={`px-4 py-2 text-xs font-mono whitespace-nowrap border transition-colors ${
                active === f.key
                  ? "border-accent text-accent bg-accent/5"
                  : "border-border text-dim hover:border-muted hover:text-text"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        {/* Pools grid */}
        {pools.length === 0 ? (
          <div className="border border-border p-12 text-center">
            <p className="text-dim font-mono text-sm">NO OPEN POOLS</p>
            <p className="text-dim text-xs mt-2">New pools are generated automatically every 30 minutes</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {pools.map((pool) => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
