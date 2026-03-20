import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

async function getAgent(wallet: string) {
  const { data } = await supabase
    .from("agents")
    .select("*")
    .eq("wallet", wallet)
    .single();
  return data;
}

async function getBetHistory(wallet: string) {
  const { data } = await supabase
    .from("bets")
    .select("*, pools(token_name, token_symbol, token_image_url, question, direction, timeframe, status, outcome, closes_at)")
    .eq("wallet", wallet)
    .order("placed_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

async function getRank(wallet: string, predictionPoints: number) {
  const { count } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .gt("prediction_points", predictionPoints);
  return (count ?? 0) + 1;
}

function formatWallet(wallet: string) {
  return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
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

function formatMC(mc: number): string {
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

export const revalidate = 30;

export default async function AgentPage({
  params,
}: {
  params: Promise<{ wallet: string }>;
}) {
  const { wallet } = await params;
  const [agent, bets] = await Promise.all([
    getAgent(wallet),
    getBetHistory(wallet),
  ]);

  if (!agent) notFound();

  const rank = await getRank(wallet, agent.prediction_points);
  const winRate = agent.total_bets > 0
    ? ((agent.total_wins / agent.total_bets) * 100).toFixed(1)
    : "0.0";

  const recentWins = bets.filter(b => b.is_correct === true).length;
  const recentLosses = bets.filter(b => b.is_correct === false).length;

  return (
    <main className="min-h-screen bg-[#060608] text-[#e2e2e2]">
      <div className="fixed top-0 right-0 w-[400px] h-[400px] bg-[#00ff87] opacity-[0.015] blur-[100px] pointer-events-none" />

      {/* Nav */}
      <nav className="border-b border-white/5 px-6 py-5 flex items-center justify-between relative z-10">
        <Link href="/" className="font-mono text-xs tracking-[0.3em] text-[#00ff87]">PREDICTBAG</Link>
        <Link href="/leaderboard" className="text-xs font-mono text-[#555] hover:text-[#e2e2e2] transition-colors">
          ← LEADERBOARD
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10">

        {/* Agent header */}
        <div className="border border-white/8 p-8 mb-8 bg-white/[0.01]">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[10px] font-mono text-[#333] tracking-widest mb-2">AGENT PROFILE</p>
              <h1 className="font-mono text-2xl text-[#e2e2e2] font-bold">{formatWallet(wallet)}</h1>
              <p className="text-[#444] font-mono text-xs mt-1">{wallet}</p>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-mono text-[#333] mb-1">RANK</div>
              <div className="text-4xl font-black text-[#00ff87]">#{rank}</div>
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "MINING PTS", value: agent.mining_points.toLocaleString(), accent: true },
              { label: "PRED PTS", value: agent.prediction_points.toLocaleString(), accent: false },
              { label: "WIN RATE", value: `${winRate}%`, accent: false },
              { label: "TOTAL BETS", value: agent.total_bets.toLocaleString(), accent: false },
            ].map((s) => (
              <div key={s.label} className="border border-white/8 p-4 bg-white/[0.01]">
                <div className="text-[10px] font-mono text-[#333] mb-2 tracking-widest">{s.label}</div>
                <div className={`text-2xl font-black ${s.accent ? "text-[#00ff87]" : "text-[#e2e2e2]"}`}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>

          {/* Win/Loss bar */}
          {agent.total_bets > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-[10px] font-mono text-[#444] mb-2">
                <span>{agent.total_wins} WINS</span>
                <span>{agent.total_bets - agent.total_wins} LOSSES</span>
              </div>
              <div className="h-1.5 bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-[#00ff87] transition-all"
                  style={{ width: `${(agent.total_wins / agent.total_bets) * 100}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 text-[10px] font-mono text-[#333]">
            LAST ACTIVE: {timeAgo(agent.last_active)}
          </div>
        </div>

        {/* Bet history */}
        <div>
          <p className="text-[10px] font-mono text-[#333] tracking-widest mb-4">BET HISTORY</p>

          {bets.length === 0 && (
            <div className="border border-white/8 p-12 text-center text-[#333] font-mono text-sm">
              NO BETS YET
            </div>
          )}

          <div className="space-y-2">
            {bets.map((bet) => {
              const pool = bet.pools as any;
              const isResolved = pool?.status === "resolved";
              const isWin = bet.is_correct === true;
              const isLoss = bet.is_correct === false;
              const isPending = bet.is_correct === null;

              return (
                <div key={bet.id} className={`border p-4 flex items-center gap-4 ${
                  isWin ? "border-[#00ff87]/20 bg-[#00ff87]/5" :
                  isLoss ? "border-white/5 bg-white/[0.01]" :
                  "border-white/5 bg-white/[0.01]"
                }`}>
                  {/* Token image */}
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 flex-shrink-0 bg-white/5 flex items-center justify-center">
                    {pool?.token_image_url ? (
                      <img src={pool.token_image_url} alt="" className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    ) : (
                      <span className="text-[10px] font-mono text-[#444]">
                        {pool?.token_symbol?.slice(0, 2) ?? "?"}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm text-[#e2e2e2]">{pool?.token_symbol ?? "?"}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 border ${
                        pool?.direction === "up"
                          ? "text-[#00ff87] border-[#00ff87]/20"
                          : "text-[#ff6b35] border-[#ff6b35]/20"
                      }`}>
                        {pool?.direction === "up" ? "↑ UP" : "↓ DOWN"}
                      </span>
                      <span className="text-[10px] font-mono text-[#444]">{pool?.timeframe?.toUpperCase()}</span>
                    </div>
                    <p className="text-[11px] text-[#444] font-mono truncate">{pool?.question}</p>
                  </div>

                  {/* Bet details */}
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-mono mb-1">
                      <span className={`font-bold ${bet.prediction === "yes" ? "text-[#00ff87]" : "text-[#ff6b35]"}`}>
                        {bet.prediction.toUpperCase()}
                      </span>
                      <span className="text-[#444] ml-2">{bet.amount} pts</span>
                    </div>
                    <div className="text-[10px] font-mono">
                      {isPending && <span className="text-[#555]">PENDING</span>}
                      {isWin && (
                        <span className="text-[#00ff87]">
                          WON +{bet.prediction_points_earned} pts
                        </span>
                      )}
                      {isLoss && <span className="text-[#444]">LOST</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
