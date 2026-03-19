"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function formatMC(mc: number): string {
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

export default function PredictPage() {
  const params = useParams();
  const poolId = params.id as string;

  const [pool, setPool] = useState<Record<string, unknown> | null>(null);
  const [wallet, setWallet] = useState("");
  const [prediction, setPrediction] = useState<"yes" | "no" | "">("");
  const [amount, setAmount] = useState(100);
  const [agentStats, setAgentStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    supabase
      .from("pools")
      .select("*")
      .eq("id", poolId)
      .single()
      .then(({ data }) => setPool(data));
  }, [poolId]);

  async function checkWallet(w: string) {
    if (!w || w.length < 10) return;
    const { data } = await supabase
      .from("agents")
      .select("mining_points, prediction_points, total_bets, total_wins")
      .eq("wallet", w)
      .single();
    setAgentStats(data);
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
    setResult({
      success: res.ok,
      message: data.message ?? (res.ok ? "Bet placed!" : "Error placing bet"),
    });

    if (res.ok) {
      checkWallet(wallet);
      // Refresh pool
      const { data: p } = await supabase.from("pools").select("*").eq("id", poolId).single();
      setPool(p);
    }

    setLoading(false);
  }

  if (!pool) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="font-mono text-dim animate-pulse2">LOADING...</div>
      </main>
    );
  }

  const currentMc = pool.current_mc as number;
  const targetMc = pool.target_mc as number;
  const progress = Math.min((currentMc / targetMc) * 100, 100);

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</Link>
        <Link href="/pools" className="text-sm text-dim hover:text-text transition-colors">← POOLS</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Pool Info */}
        <div className="border border-border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-black text-2xl">{pool.token_symbol as string}</span>
                <span className="text-dim font-mono text-sm">{pool.token_name as string}</span>
              </div>
              <span className={`text-xs font-mono ${
                pool.timeframe === "fast" ? "text-warn" :
                pool.timeframe === "medium" ? "text-info" : "text-accent"
              }`}>
                {pool.timeframe === "fast" ? "⚡ FAST" : pool.timeframe === "medium" ? "⚖️ MEDIUM" : "🐢 SLOW"} · {pool.deadline_hours as number}H
              </span>
            </div>
            <div className="text-right">
              <div className="text-xs text-dim font-mono">TIME LEFT</div>
              <div className="font-mono font-bold">{timeLeft(pool.closes_at as string)}</div>
            </div>
          </div>

          <p className="text-lg font-medium mb-5">{pool.question as string}</p>

          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono text-dim mb-2">
              <span>CURRENT MC: {formatMC(currentMc)}</span>
              <span>TARGET: {formatMC(targetMc)}</span>
            </div>
            <div className="h-1.5 bg-muted overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex justify-between text-xs font-mono text-dim">
            <span>TOTAL POT: <span className="text-text">{(pool.total_pot as number).toLocaleString()} pts</span></span>
            <span>STATUS: <span className="text-accent">{(pool.status as string).toUpperCase()}</span></span>
          </div>
        </div>

        {/* Bet Form */}
        <div className="border border-border p-6">
          <h2 className="font-bold text-lg mb-6">PLACE PREDICTION</h2>

          {/* Wallet input */}
          <div className="mb-5">
            <label className="text-xs font-mono text-dim block mb-2">YOUR WALLET (BASE)</label>
            <input
              type="text"
              placeholder="0x..."
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value);
                checkWallet(e.target.value);
              }}
              className="w-full bg-surface border border-border px-4 py-3 font-mono text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* Agent stats */}
          {agentStats && (
            <div className="bg-surface border border-border p-4 mb-5 grid grid-cols-2 gap-3 text-xs font-mono">
              <div>
                <span className="text-dim">MINING PTS</span>
                <div className="text-accent font-bold mt-0.5">{(agentStats.mining_points as number).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-dim">PREDICTION PTS</span>
                <div className="text-text font-bold mt-0.5">{(agentStats.prediction_points as number).toLocaleString()}</div>
              </div>
              <div>
                <span className="text-dim">WIN RATE</span>
                <div className="text-text font-bold mt-0.5">
                  {(agentStats.total_bets as number) > 0
                    ? `${(((agentStats.total_wins as number) / (agentStats.total_bets as number)) * 100).toFixed(1)}%`
                    : "—"}
                </div>
              </div>
              <div>
                <span className="text-dim">TOTAL BETS</span>
                <div className="text-text font-bold mt-0.5">{agentStats.total_bets as number}</div>
              </div>
            </div>
          )}

          {/* Prediction choice */}
          <div className="mb-5">
            <label className="text-xs font-mono text-dim block mb-2">YOUR PREDICTION</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPrediction("yes")}
                className={`py-3 border font-bold text-sm transition-colors ${
                  prediction === "yes"
                    ? "border-accent text-accent bg-accent/10"
                    : "border-border text-dim hover:border-muted"
                }`}
              >
                YES — WILL REACH
              </button>
              <button
                onClick={() => setPrediction("no")}
                className={`py-3 border font-bold text-sm transition-colors ${
                  prediction === "no"
                    ? "border-warn text-warn bg-warn/10"
                    : "border-border text-dim hover:border-muted"
                }`}
              >
                NO — WON&apos;T REACH
              </button>
            </div>
          </div>

          {/* Amount */}
          <div className="mb-6">
            <label className="text-xs font-mono text-dim block mb-2">
              AMOUNT (MINING POINTS) — MAX 1,000
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="number"
                min={1}
                max={1000}
                value={amount}
                onChange={(e) => setAmount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 bg-surface border border-border px-4 py-3 font-mono text-sm text-text focus:outline-none focus:border-accent transition-colors"
              />
              <div className="flex gap-2">
                {[100, 250, 500, 1000].map((v) => (
                  <button
                    key={v}
                    onClick={() => setAmount(v)}
                    className="px-3 py-3 border border-border text-xs font-mono text-dim hover:border-accent hover:text-accent transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={placeBet}
            disabled={loading || !wallet || !prediction || pool.status !== "open"}
            className="w-full py-4 bg-accent text-bg font-black text-sm tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
          >
            {loading ? "PLACING BET..." : "PLACE PREDICTION"}
          </button>

          {result && (
            <div className={`mt-4 p-4 border text-sm font-mono ${
              result.success ? "border-accent text-accent bg-accent/5" : "border-warn text-warn bg-warn/5"
            }`}>
              {result.message}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
