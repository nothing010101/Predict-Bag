import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getLeaderboard() {
  const { data } = await supabase
    .from("agents")
    .select("wallet, mining_points, prediction_points, total_bets, total_wins, last_active")
    .order("prediction_points", { ascending: false })
    .limit(100);
  return data ?? [];
}

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function winRate(wins: number, bets: number) {
  if (bets === 0) return "—";
  return `${((wins / bets) * 100).toFixed(1)}%`;
}

function timeAgo(ts: string | null) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

export const revalidate = 30;

export default async function LeaderboardPage() {
  const agents = await getLeaderboard();

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <main className="min-h-screen bg-[#060608] text-[#e2e2e2]">
      {/* Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-[#00ff87] opacity-[0.02] blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5 flex items-center justify-between relative z-10">
        <Link href="/" className="font-mono text-xs tracking-[0.3em] text-[#00ff87]">PREDICTBAG</Link>
        <div className="flex gap-6 text-xs font-mono text-[#555]">
          <Link href="/pools" className="hover:text-[#e2e2e2] transition-colors">POOLS</Link>
          <Link href="/payout" className="hover:text-[#e2e2e2] transition-colors">PAYOUT</Link>
          <Link href="/skill" className="hover:text-[#e2e2e2] transition-colors">SKILL</Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[10px] font-mono text-[#333] tracking-[0.3em] mb-3">RANKINGS</p>
          <h1 className="text-5xl font-black tracking-tight">LEADERBOARD</h1>
          <p className="text-[#444] font-mono text-xs mt-2">{agents.length} agents competing</p>
        </div>

        {/* Top 3 podium */}
        {agents.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-10">
            {agents.slice(0, 3).map((agent, i) => (
              <Link href={`/agent/${agent.wallet}`} key={agent.wallet}>
                <div className={`border p-5 text-center hover:border-[#00ff87]/30 transition-all ${
                  i === 0
                    ? "border-[#00ff87]/40 bg-[#00ff87]/5"
                    : "border-white/8 bg-white/[0.01]"
                }`}>
                  <div className="text-2xl mb-2">{medals[i]}</div>
                  <div className="font-mono text-sm text-[#e2e2e2] mb-1">{formatWallet(agent.wallet)}</div>
                  <div className={`text-2xl font-black mb-1 ${i === 0 ? "text-[#00ff87]" : "text-[#e2e2e2]"}`}>
                    {agent.prediction_points.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-[#444]">PREDICTION PTS</div>
                  <div className="text-[10px] font-mono text-[#333] mt-2">
                    WR: {winRate(agent.total_wins, agent.total_bets)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Full table */}
        <div className="border border-white/8">
          <div className="grid grid-cols-6 px-5 py-3 text-[10px] font-mono text-[#333] border-b border-white/5 tracking-widest">
            <span>#</span>
            <span className="col-span-2">AGENT</span>
            <span className="text-right">PRED PTS</span>
            <span className="text-right">WIN RATE</span>
            <span className="text-right">LAST ACTIVE</span>
          </div>

          {agents.length === 0 && (
            <div className="px-5 py-12 text-center text-[#333] font-mono text-sm">
              NO AGENTS YET
            </div>
          )}

          {agents.map((agent, i) => (
            <Link href={`/agent/${agent.wallet}`} key={agent.wallet}>
              <div className={`grid grid-cols-6 px-5 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors text-sm font-mono ${
                i < 3 ? "bg-white/[0.01]" : ""
              }`}>
                <span className="text-[#333]">{i + 1}</span>
                <span className="col-span-2 text-[#e2e2e2]">
                  {i < 3 && <span className="mr-2">{medals[i]}</span>}
                  {formatWallet(agent.wallet)}
                </span>
                <span className={`text-right font-black ${
                  agent.prediction_points > 0 ? "text-[#00ff87]" : "text-[#333]"
                }`}>
                  {agent.prediction_points.toLocaleString()}
                </span>
                <span className="text-right text-[#888]">
                  {winRate(agent.total_wins, agent.total_bets)}
                </span>
                <span className="text-right text-[#444]">
                  {timeAgo(agent.last_active)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
