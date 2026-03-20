import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";
import BloombergLayout from "@/components/BloombergLayout";
import TokenImage from "@/components/TokenImage";

function fmt(wallet: string) { return `${wallet.slice(0, 8)}...${wallet.slice(-6)}`; }
function ago(ts: string | null) {
  if (!ts) return "—";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000), h = Math.floor(m / 60), d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`; if (h > 0) return `${h}h ago`; if (m > 0) return `${m}m ago`; return "just now";
}

export const revalidate = 30;

export default async function AgentPage({ params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;

  const [{ data: agent }, { data: bets }] = await Promise.all([
    supabase.from("agents").select("*").eq("wallet", wallet).single(),
    supabase.from("bets")
      .select("*, pools(token_name, token_symbol, token_image_url, question, direction, timeframe, status, outcome, closes_at, current_mc, target_mc)")
      .eq("wallet", wallet)
      .order("placed_at", { ascending: false })
      .limit(50),
  ]);

  if (!agent) notFound();

  const { count: aboveCount } = await supabase
    .from("agents").select("id", { count: "exact", head: true })
    .gt("prediction_points", agent.prediction_points);

  const rank = (aboveCount ?? 0) + 1;
  const winRate = agent.total_bets > 0 ? ((agent.total_wins / agent.total_bets) * 100).toFixed(1) : "0.0";
  const betList = bets ?? [];

  return (
    <BloombergLayout>
      <main className="max-w-7xl mx-auto px-4 py-6">

        {/* Agent header */}
        <div className="border border-[#f5a623]/15 mb-4">
          <div className="border-b border-[#f5a623]/15 px-5 py-3 bg-[#f5a623]/5 flex items-center justify-between flex-wrap gap-2">
            <p className="text-[#f5a623] text-[10px] font-black tracking-widest">// AGENT PROFILE</p>
            <div className="flex items-center gap-2">
              <span className="text-[#e8d5a3]/20 text-[10px]">RANK</span>
              <span className="text-[#f5a623] text-lg font-black">#{rank}</span>
            </div>
          </div>

          <div className="p-5">
            <p className="text-[#e8d5a3]/60 font-mono text-sm mb-1">{fmt(wallet)}</p>
            <p className="text-[#e8d5a3]/20 font-mono text-[10px] break-all mb-5">{wallet}</p>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-[#f5a623]/10 divide-y sm:divide-y-0 sm:divide-x divide-[#f5a623]/10">
              {[
                { label: "MINING PTS", value: agent.mining_points.toLocaleString(), accent: true },
                { label: "PRED PTS", value: agent.prediction_points.toLocaleString(), accent: false },
                { label: "WIN RATE", value: `${winRate}%`, accent: false },
                { label: "TOTAL BETS", value: agent.total_bets.toLocaleString(), accent: false },
              ].map(s => (
                <div key={s.label} className="p-4">
                  <p className="text-[#e8d5a3]/20 text-[10px] tracking-widest mb-2">{s.label}</p>
                  <p className={`text-2xl font-black ${s.accent ? "text-[#f5a623]" : "text-[#e8d5a3]"}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Win bar */}
            {agent.total_bets > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-mono text-[#e8d5a3]/20 mb-1.5">
                  <span className="text-[#4caf50]">{agent.total_wins} WINS</span>
                  <span className="text-[#f44336]">{agent.total_bets - agent.total_wins} LOSSES</span>
                </div>
                <div className="h-1 bg-[#f44336]/20">
                  <div className="h-full bg-[#4caf50] transition-all"
                    style={{ width: `${(agent.total_wins / agent.total_bets) * 100}%` }} />
                </div>
              </div>
            )}

            <p className="text-[#e8d5a3]/15 text-[10px] mt-3">LAST ACTIVE: {ago(agent.last_active)}</p>
          </div>
        </div>

        {/* Bet history */}
        <div className="border border-[#f5a623]/15">
          <div className="border-b border-[#f5a623]/15 px-5 py-3 bg-[#f5a623]/5 flex items-center justify-between">
            <p className="text-[#f5a623] text-[10px] font-black tracking-widest">// BET HISTORY</p>
            <p className="text-[#e8d5a3]/20 text-[10px]">{betList.length} RECORDS</p>
          </div>

          {betList.length === 0 && (
            <div className="p-12 text-center text-[#e8d5a3]/20 text-sm font-mono">NO BETS YET</div>
          )}

          {betList.length > 0 && (
            <div className="hidden md:grid grid-cols-12 px-4 py-2 border-b border-[#f5a623]/10 text-[10px] font-black tracking-widest text-[#e8d5a3]/20">
              <span className="col-span-2">TOKEN</span>
              <span className="col-span-1">DIR</span>
              <span className="col-span-1">TF</span>
              <span className="col-span-3">QUESTION</span>
              <span className="col-span-1 text-right">BET</span>
              <span className="col-span-1 text-right">PRED</span>
              <span className="col-span-1 text-right">EARNED</span>
              <span className="col-span-2 text-right">RESULT</span>
            </div>
          )}

          <div className="divide-y divide-[#f5a623]/5">
            {betList.map(bet => {
              const pool = bet.pools as any;
              const isWin = bet.is_correct === true;
              const isUp = pool?.direction === "up";

              return (
                <div key={bet.id} className={`grid grid-cols-12 px-4 py-3 items-center gap-1 text-[11px] font-mono ${isWin ? "bg-[#4caf50]/5" : ""}`}>
                  {/* Token */}
                  <div className="col-span-12 md:col-span-2 flex items-center gap-2">
                    <TokenImage
                      src={pool?.token_image_url}
                      symbol={pool?.token_symbol}
                      size={24}
                    />
                    <span className="text-[#e8d5a3]/70 font-bold">{pool?.token_symbol}</span>
                  </div>

                  {/* Direction */}
                  <div className="col-span-2 md:col-span-1">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 ${isUp ? "text-[#4caf50] bg-[#4caf50]/10" : "text-[#f44336] bg-[#f44336]/10"}`}>
                      {isUp ? "↑UP" : "↓DN"}
                    </span>
                  </div>

                  {/* Timeframe */}
                  <div className="col-span-2 md:col-span-1">
                    <span className="text-[#e8d5a3]/30 text-[10px]">
                      {pool?.timeframe === "fast" ? "2H" : pool?.timeframe === "medium" ? "6H" : "12H"}
                    </span>
                  </div>

                  {/* Question */}
                  <div className="col-span-12 md:col-span-3 text-[#e8d5a3]/30 text-[10px] leading-relaxed">
                    {pool?.question}
                  </div>

                  {/* Bet amount */}
                  <div className="col-span-4 md:col-span-1 text-right text-[#e8d5a3]/50">
                    {bet.amount}
                  </div>

                  {/* Prediction */}
                  <div className="col-span-4 md:col-span-1 text-right">
                    <span className={`font-black ${bet.prediction === "yes" ? "text-[#4caf50]" : "text-[#f44336]"}`}>
                      {bet.prediction.toUpperCase()}
                    </span>
                  </div>

                  {/* Earned */}
                  <div className="col-span-4 md:col-span-1 text-right">
                    {isWin ? (
                      <span className="text-[#f5a623] font-black">+{bet.prediction_points_earned}</span>
                    ) : (
                      <span className="text-[#e8d5a3]/15">—</span>
                    )}
                  </div>

                  {/* Result */}
                  <div className="col-span-12 md:col-span-2 text-right">
                    {bet.is_correct === null ? (
                      <span className="text-[#e8d5a3]/20">PENDING</span>
                    ) : isWin ? (
                      <span className="text-[#4caf50] font-black">WIN ✓</span>
                    ) : (
                      <span className="text-[#f44336]">LOSS ✗</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <Link href="/leaderboard"
            className="text-[#e8d5a3]/20 text-[10px] font-mono hover:text-[#f5a623] transition-colors">
            ← BACK TO LEADERBOARD
          </Link>
        </div>
      </main>
    </BloombergLayout>
  );
}
