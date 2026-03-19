"use client";

import { useState } from "react";
import Link from "next/link";

export default function PayoutPage() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [agentData, setAgentData] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [checked, setChecked] = useState(false);

  async function checkWallet() {
    if (!wallet) return;
    setLoading(true);
    setChecked(false);
    setResult(null);

    const res = await fetch(`/api/stats?wallet=${wallet}`);
    const data = await res.json();
    setAgentData(data);
    setChecked(true);
    setLoading(false);
  }

  async function requestPayout() {
    if (!wallet || !agentData) return;
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    const data = await res.json();
    setResult({
      success: res.ok,
      message: data.message ?? (res.ok ? "Request submitted!" : "Error"),
    });
    setLoading(false);
  }

  const predictionPoints = (agentData?.prediction_points as number) ?? 0;
  const predictbagAmount = predictionPoints * 100;
  const canPayout = predictionPoints >= 1000;

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</Link>
        <Link href="/pools" className="text-sm text-dim hover:text-text transition-colors">POOLS</Link>
      </nav>

      <div className="max-w-lg mx-auto px-6 py-16">
        <h1 className="text-3xl font-black mb-2">PAYOUT</h1>
        <p className="text-dim text-sm font-mono mb-10">
          Convert prediction points to $PREDICTBAG · Genesis rate: 1,000 pts = 100,000 tokens
        </p>

        {/* Wallet check */}
        <div className="border border-border p-6 mb-6">
          <label className="text-xs font-mono text-dim block mb-2">YOUR BASE WALLET</label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="0x..."
              value={wallet}
              onChange={(e) => {
                setWallet(e.target.value);
                setChecked(false);
                setAgentData(null);
              }}
              className="flex-1 bg-surface border border-border px-4 py-3 font-mono text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
            />
            <button
              onClick={checkWallet}
              disabled={loading || !wallet}
              className="px-5 py-3 border border-accent text-accent text-sm font-mono hover:bg-accent/10 transition-colors disabled:opacity-30"
            >
              CHECK
            </button>
          </div>
        </div>

        {/* Stats */}
        {checked && agentData && (
          <div className="border border-border p-6 mb-6 animate-slide-up">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="border border-border p-4">
                <div className="text-xs font-mono text-dim mb-1">PREDICTION POINTS</div>
                <div className={`text-2xl font-black ${canPayout ? "text-accent" : "text-dim"}`}>
                  {predictionPoints.toLocaleString()}
                </div>
              </div>
              <div className="border border-border p-4">
                <div className="text-xs font-mono text-dim mb-1">YOU WILL RECEIVE</div>
                <div className={`text-2xl font-black ${canPayout ? "text-text" : "text-dim"}`}>
                  {canPayout ? predictbagAmount.toLocaleString() : "—"}
                </div>
                {canPayout && <div className="text-xs text-dim font-mono mt-1">$PREDICTBAG</div>}
              </div>
            </div>

            {/* Eligibility */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-dim">Minimum points (1,000)</span>
                <span className={canPayout ? "text-accent" : "text-warn"}>
                  {canPayout ? "✓ ELIGIBLE" : `✗ NEED ${(1000 - predictionPoints)} MORE`}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-dim">Wallet age (≥30 days)</span>
                <span className={(agentData.wallet_age_days as number) >= 30 ? "text-accent" : "text-warn"}>
                  {(agentData.wallet_age_days as number) >= 30
                    ? `✓ ${agentData.wallet_age_days} DAYS`
                    : `✗ ${agentData.wallet_age_days} DAYS`}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-dim">On-chain activity (≥10 tx)</span>
                <span className={(agentData.wallet_tx_count as number) >= 10 ? "text-accent" : "text-warn"}>
                  {(agentData.wallet_tx_count as number) >= 10
                    ? `✓ ${agentData.wallet_tx_count} TXS`
                    : `✗ ${agentData.wallet_tx_count} TXS`}
                </span>
              </div>
            </div>

            <button
              onClick={requestPayout}
              disabled={
                loading ||
                !canPayout ||
                (agentData.wallet_age_days as number) < 30 ||
                (agentData.wallet_tx_count as number) < 10
              }
              className="w-full py-4 bg-accent text-bg font-black text-sm tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
            >
              {loading ? "PROCESSING..." : "REQUEST PAYOUT"}
            </button>
          </div>
        )}

        {result && (
          <div className={`p-4 border text-sm font-mono animate-fade-in ${
            result.success ? "border-accent text-accent bg-accent/5" : "border-warn text-warn bg-warn/5"
          }`}>
            {result.success
              ? "✓ Payout request submitted. You will receive $PREDICTBAG within 12 hours."
              : `✗ ${result.message}`}
          </div>
        )}

        <div className="mt-8 text-xs text-dim font-mono space-y-1">
          <p>• Payouts processed manually every 12 hours</p>
          <p>• Genesis rate: 1,000 prediction points = 100,000 $PREDICTBAG</p>
          <p>• Rate will decrease over time — early adopters earn more</p>
          <p>• Mining points cannot be converted, only prediction points</p>
        </div>
      </div>
    </main>
  );
}
