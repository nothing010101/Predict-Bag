"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function formatMC(mc: number): string {
  if (mc >= 1_000_000_000) return `$${(mc / 1_000_000_000).toFixed(2)}B`;
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function timeLeft(closesAt: string): string {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

interface BetStats {
  yesCount: number;
  noCount: number;
  yesPts: number;
  noPts: number;
  total: number;
}

export default function PredictPage() {
  const params = useParams();
  const poolId = params.id as string;

  const [pool, setPool] = useState<Record<string, unknown> | null>(null);
  const [wallet, setWallet] = useState("");
  const [prediction, setPrediction] = useState<"yes" | "no" | "">("");
  const [amount, setAmount] = useState(100);
  const [agentStats, setAgentStats] = useState<Record<string, unknown> | null>(null);
  const [userBet, setUserBet] = useState<Record<string, unknown> | null>(null);
  const [betStats, setBetStats] = useState<BetStats>({ yesCount: 0, noCount: 0, yesPts: 0, noPts: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  async function fetchBetStats() {
    const { data } = await supabase
      .from("bets")
      .select("prediction, amount")
      .eq("pool_id", poolId);
    if (!data) return;
    const yesBets = data.filter(b => b.prediction === "yes");
    const noBets = data.filter(b => b.prediction === "no");
    setBetStats({
      yesCount: yesBets.length,
      noCount: noBets.length,
      yesPts: yesBets.reduce((s, b) => s + b.amount, 0),
      noPts: noBets.reduce((s, b) => s + b.amount, 0),
      total: data.length,
    });
  }

  useEffect(() => {
    supabase.from("pools").select("*").eq("id", poolId).single()
      .then(({ data }) => setPool(data));

    fetchBetStats();

    // Realtime subscription on new bets
    const channel = supabase
      .channel(`bets-pool-${poolId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "bets",
        filter: `pool_id=eq.${poolId}`,
      }, () => {
        fetchBetStats();
        supabase.from("pools").select("*").eq("id", poolId).single()
          .then(({ data }) => { if (data) setPool(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [poolId]);

  async function checkWallet(w: string) {
    if (!w || w.length < 10) return;
    const [statsRes, betRes] = await Promise.all([
      supabase.from("agents").select("mining_points, prediction_points, total_bets, total_wins").eq("wallet", w).single(),
      supabase.from("bets").select("*").eq("pool_id", poolId).eq("wallet", w).single(),
    ]);
    setAgentStats(statsRes.data);
    setUserBet(betRes.data ?? null);
  }

  async function placeBet() {
    if (!wallet || !prediction || !pool) return;
    if (amount < 1 || amount > 1000) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, pool_id: poolId, prediction, amount }),
    });
    const data = await res.json();
    setResult({ success: res.ok, message: data.message ?? (res.ok ? "Bet placed!" : "Error") });
    if (res.ok) {
      checkWallet(wallet);
      fetchBetStats();
      const { data: p } = await supabase.from("pools").select("*").eq("id", poolId).single();
      setPool(p);
    }
    setLoading(false);
  }

  if (!pool) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="font-mono text-[#f5a623]/40 text-sm animate-pulse">LOADING...</div>
      </main>
    );
  }

  const currentMc = pool.current_mc as number;
  const targetMc = pool.target_mc as number;
  const isUp = (pool.direction ?? "up") === "up";
  const isResolved = pool.status === "resolved";
  const isLocked = pool.status === "locked";
  const outcome = pool.outcome as string | null;

  const totalPts = betStats.yesPts + betStats.noPts;
  const yesPct = totalPts > 0 ? Math.round((betStats.yesPts / totalPts) * 100) : 50;
  const noPct = 100 - yesPct;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#e8d5a3]" style={{ fontFamily: "'IBM Plex Mono','Courier New',monospace" }}>
      <div className="bg-[#f5a623] text-[#0a0a0a] px-4 py-1.5 flex items-center justify-between">
        <Link href="/" className="font-black text-[11px] tracking-widest">PREDICTBAG</Link>
        <Link href="/pools" className="text-[11px] font-bold">BACK TO POOLS</Link>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Pool Info */}
        <div className="border border-[#f5a623]/15 mb-5">
          <div className="border-b border-[#f5a623]/15 px-5 py-3 bg-[#f5a623]/5 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              {(pool.token_image_url as string | null) && (
                <img src={pool.token_image_url as string} alt="" width={24} height={24}
                  className="rounded-full border border-[#f5a623]/20 object-cover" />
              )}
              <span className="font-black text-[#e8d5a3]">{pool.token_symbol as string}</span>
              <span className="text-[#e8d5a3]/30 text-[11px]">{pool.token_name as string}</span>
              <span className={`text-[10px] font-black px-1.5 py-0.5 ${isUp ? "text-[#4caf50] bg-[#4caf50]/10" : "text-[#f44336] bg-[#f44336]/10"}`}>
                {isUp ? "↑ UP" : "↓ DOWN"}
              </span>
            </div>
            <span className="text-[#e8d5a3]/30 text-[11px] font-mono">
              {isResolved ? "ENDED" : isLocked ? "LOCKED" : timeLeft(pool.closes_at as string)}
            </span>
          </div>
          <div className="p-5">
            <p className="text-[#e8d5a3] font-bold mb-4">{pool.question as string}</p>
            <div className="mb-3">
              <div className="flex justify-between text-[10px] font-mono text-[#e8d5a3]/30 mb-1.5">
                <span>CURRENT {formatMC(currentMc)}</span>
                <span>TARGET {formatMC(targetMc)}</span>
              </div>
              <div className="h-1.5 bg-white/5">
                <div className={`h-full ${isUp ? "bg-[#4caf50]" : "bg-[#f44336]"}`}
                  style={{ width: `${Math.min((currentMc / targetMc) * 100, 100)}%` }} />
              </div>
            </div>
            <div className="flex justify-between text-[10px] font-mono text-[#e8d5a3]/30">
              <span>POT: <span className="text-[#f5a623]">{(pool.total_pot as number).toLocaleString()} pts</span></span>
              <span>STATUS: <span className={isResolved ? "text-[#e8d5a3]/40" : isLocked ? "text-[#f5a623]" : "text-[#4caf50]"}>
                {(pool.status as string).toUpperCase()}
              </span></span>
            </div>
          </div>
        </div>

        {/* REALTIME BET DISTRIBUTION */}
        {betStats.total > 0 && (
          <div className="border border-[#f5a623]/15 p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black tracking-widest text-[#f5a623]">// LIVE SENTIMENT</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4caf50] animate-pulse" />
                <span className="text-[10px] font-mono text-[#e8d5a3]/30">{betStats.total} AGENTS BET</span>
              </div>
            </div>

            {/* YES/NO bar */}
            <div className="flex h-8 overflow-hidden mb-3 rounded-sm">
              <div
                className="bg-[#4caf50] flex items-center justify-center text-[11px] font-black text-[#0a0a0a] transition-all"
                style={{ width: `${yesPct}%`, minWidth: yesPct > 0 ? "40px" : "0" }}
              >
                {yesPct > 15 && `YES ${yesPct}%`}
              </div>
              <div
                className="bg-[#f44336] flex items-center justify-center text-[11px] font-black text-[#0a0a0a] transition-all"
                style={{ width: `${noPct}%`, minWidth: noPct > 0 ? "40px" : "0" }}
              >
                {noPct > 15 && `NO ${noPct}%`}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono">
              <div className="border border-[#4caf50]/20 p-3 bg-[#4caf50]/5">
                <div className="text-[#4caf50] font-black mb-1">YES — WILL REACH</div>
                <div className="text-[#e8d5a3]">{betStats.yesCount} agents · {betStats.yesPts.toLocaleString()} pts</div>
              </div>
              <div className="border border-[#f44336]/20 p-3 bg-[#f44336]/5">
                <div className="text-[#f44336] font-black mb-1">NO — WON&apos;T REACH</div>
                <div className="text-[#e8d5a3]">{betStats.noCount} agents · {betStats.noPts.toLocaleString()} pts</div>
              </div>
            </div>
          </div>
        )}

        {/* OUTCOME */}
        {isResolved && outcome && (
          <div className={`border p-5 mb-5 ${outcome === "yes" ? "border-[#4caf50]/40 bg-[#4caf50]/8" : "border-[#f44336]/30 bg-[#f44336]/5"}`}>
            <p className="text-[10px] font-black tracking-widest text-[#e8d5a3]/40 mb-3">// POOL RESULT</p>
            <div className={`text-2xl font-black mb-2 ${outcome === "yes" ? "text-[#4caf50]" : "text-[#f44336]"}`}>
              {outcome === "yes" ? "✓ YES — TARGET HIT" : "✗ NO — TARGET NOT REACHED"}
            </div>
            {(pool.resolved_mc as number | null) && (
              <p className="text-[11px] font-mono text-[#e8d5a3]/30">
                Final MC: {formatMC(pool.resolved_mc as number)}
                {(pool.resolved_at as string | null) && ` · ${new Date(pool.resolved_at as string).toLocaleString()}`}
              </p>
            )}
          </div>
        )}

        {/* USER BET RESULT */}
        {userBet && isResolved && (
          <div className={`border p-5 mb-5 ${
            userBet.is_correct === true ? "border-[#4caf50]/30 bg-[#4caf50]/5" :
            userBet.is_correct === false ? "border-[#f44336]/20" : "border-[#f5a623]/15"
          }`}>
            <p className="text-[10px] font-black tracking-widest text-[#e8d5a3]/40 mb-3">// YOUR BET</p>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-[12px] font-mono space-y-1">
                <div>
                  <span className="text-[#e8d5a3]/30">Predicted: </span>
                  <span className={`font-black ${userBet.prediction === "yes" ? "text-[#4caf50]" : "text-[#f44336]"}`}>
                    {(userBet.prediction as string).toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-[#e8d5a3]/30">Bet: </span>
                  <span className="text-[#e8d5a3]">{userBet.amount as number} mining pts</span>
                </div>
              </div>
              <div className="text-right">
                {userBet.is_correct === null && <span className="text-[#f5a623]/60 font-black">PENDING</span>}
                {userBet.is_correct === true && (
                  <div>
                    <div className="text-[#4caf50] text-xl font-black">WIN ✓</div>
                    <div className="text-[#f5a623] text-sm">+{(userBet.prediction_points_earned as number).toLocaleString()} pred pts</div>
                  </div>
                )}
                {userBet.is_correct === false && <div className="text-[#f44336] text-xl font-black">LOSS ✗</div>}
              </div>
            </div>
          </div>
        )}

        {/* Bet Form */}
        {!isResolved && !isLocked && (
          <div className="border border-[#f5a623]/15 p-5">
            <p className="text-[10px] font-black tracking-widest text-[#f5a623] mb-5">// PLACE PREDICTION</p>

            <div className="mb-4">
              <label className="text-[10px] font-mono text-[#e8d5a3]/30 block mb-2">YOUR WALLET (BASE)</label>
              <input type="text" placeholder="0x..." value={wallet}
                onChange={(e) => { setWallet(e.target.value); checkWallet(e.target.value); }}
                className="w-full bg-[#111] border border-[#f5a623]/20 px-4 py-3 font-mono text-sm text-[#e8d5a3] placeholder:text-[#e8d5a3]/20 focus:outline-none focus:border-[#f5a623]/50" />
            </div>

            {agentStats && (
              <div className="border border-[#f5a623]/10 p-4 mb-4 grid grid-cols-2 gap-3 text-[11px] font-mono">
                <div><div className="text-[#e8d5a3]/30 mb-1">MINING PTS</div><div className="text-[#f5a623] font-black">{(agentStats.mining_points as number).toLocaleString()}</div></div>
                <div><div className="text-[#e8d5a3]/30 mb-1">PRED PTS</div><div className="text-[#e8d5a3] font-black">{(agentStats.prediction_points as number).toLocaleString()}</div></div>
                <div><div className="text-[#e8d5a3]/30 mb-1">WIN RATE</div><div className="text-[#4caf50] font-black">{(agentStats.total_bets as number) > 0 ? `${(((agentStats.total_wins as number) / (agentStats.total_bets as number)) * 100).toFixed(1)}%` : "—"}</div></div>
                <div><div className="text-[#e8d5a3]/30 mb-1">TOTAL BETS</div><div className="text-[#e8d5a3] font-black">{agentStats.total_bets as number}</div></div>
              </div>
            )}

            {userBet ? (
              <div className="border border-[#f5a623]/30 bg-[#f5a623]/5 p-3 text-[11px] font-mono text-[#f5a623]">
                Already bet {(userBet.prediction as string).toUpperCase()} ({userBet.amount as number} pts). Waiting for result...
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="text-[10px] font-mono text-[#e8d5a3]/30 block mb-2">YOUR PREDICTION</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setPrediction("yes")}
                      className={`py-3 border font-black text-sm transition-colors ${prediction === "yes" ? "border-[#4caf50] text-[#4caf50] bg-[#4caf50]/10" : "border-[#f5a623]/20 text-[#e8d5a3]/40"}`}>
                      YES — WILL REACH
                    </button>
                    <button onClick={() => setPrediction("no")}
                      className={`py-3 border font-black text-sm transition-colors ${prediction === "no" ? "border-[#f44336] text-[#f44336] bg-[#f44336]/10" : "border-[#f5a623]/20 text-[#e8d5a3]/40"}`}>
                      NO — WON&apos;T REACH
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <label className="text-[10px] font-mono text-[#e8d5a3]/30 block mb-2">AMOUNT — MAX 1,000 MINING PTS</label>
                  <div className="flex gap-2 items-center">
                    <input type="number" min={1} max={1000} value={amount}
                      onChange={(e) => setAmount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                      className="flex-1 bg-[#111] border border-[#f5a623]/20 px-4 py-3 font-mono text-sm text-[#e8d5a3] focus:outline-none focus:border-[#f5a623]/50" />
                    {[100, 250, 500, 1000].map((v) => (
                      <button key={v} onClick={() => setAmount(v)}
                        className="px-3 py-3 border border-[#f5a623]/15 text-[10px] font-mono text-[#e8d5a3]/40 hover:border-[#f5a623]/40 hover:text-[#f5a623] transition-colors">
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <button onClick={placeBet} disabled={loading || !wallet || !prediction}
                  className="w-full py-4 bg-[#f5a623] text-[#0a0a0a] font-black text-sm tracking-widest disabled:opacity-30 hover:bg-[#e8d5a3] transition-colors">
                  {loading ? "PLACING BET..." : "PLACE PREDICTION"}
                </button>

                {result && (
                  <div className={`mt-4 p-4 border text-[11px] font-mono ${result.success ? "border-[#4caf50]/30 text-[#4caf50]" : "border-[#f44336]/30 text-[#f44336]"}`}>
                    {result.message}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {isLocked && (
          <div className="border border-[#f5a623]/20 p-5 text-center">
            <p className="text-[#f5a623] font-black text-sm mb-1">POOL LOCKED</p>
            <p className="text-[#e8d5a3]/30 text-[11px] font-mono">Betting closed. Waiting for resolution...</p>
          </div>
        )}

      </div>
    </main>
  );
}
