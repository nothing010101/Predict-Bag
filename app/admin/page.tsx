"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();

export default function AdminPage() {
  const [wallet, setWallet] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<"payouts" | "pools" | "agents">("payouts");
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);
  const [pools, setPools] = useState<Record<string, unknown>[]>([]);
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  function login() {
    if (wallet.toLowerCase() === ADMIN_WALLET) {
      setAuthenticated(true);
      loadData();
    } else {
      alert("Not authorized");
    }
  }

  async function loadData() {
    setLoading(true);

    const [p, po, a] = await Promise.all([
      supabase
        .from("payout_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(50),
      supabase
        .from("pools")
        .select("*, bets(count)")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("agents")
        .select("*")
        .order("prediction_points", { ascending: false })
        .limit(50),
    ]);

    setPayouts(p.data ?? []);
    setPools(po.data ?? []);
    setAgents(a.data ?? []);
    setLoading(false);
  }

  async function markPayoutSent(id: string, txHash: string) {
    if (!txHash) return;
    await supabase
      .from("payout_requests")
      .update({ status: "sent", tx_hash: txHash, processed_at: new Date().toISOString() })
      .eq("id", id);
    loadData();
  }

  async function markPayoutRejected(id: string, reason: string) {
    // Refund points to agent first
    const payout = payouts.find((p) => (p as Record<string, unknown>).id === id) as Record<string, unknown> | undefined;
    if (payout) {
      const { data: agent } = await supabase
        .from("agents")
        .select("prediction_points")
        .eq("wallet", payout.wallet)
        .single();
      if (agent) {
        await supabase
          .from("agents")
          .update({
            prediction_points:
              (agent.prediction_points as number) + (payout.prediction_points_spent as number),
          })
          .eq("wallet", payout.wallet);
      }
    }
    await supabase
      .from("payout_requests")
      .update({ status: "rejected", rejection_reason: reason, processed_at: new Date().toISOString() })
      .eq("id", id);
    loadData();
  }

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="border border-border p-8 w-full max-w-sm">
          <h1 className="font-black text-xl mb-6 font-mono text-accent">ADMIN ACCESS</h1>
          <input
            type="text"
            placeholder="Paste admin wallet..."
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full bg-surface border border-border px-4 py-3 font-mono text-sm mb-4 text-text focus:outline-none focus:border-accent"
          />
          <button
            onClick={login}
            className="w-full py-3 bg-accent text-bg font-black text-sm"
          >
            ENTER
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</Link>
        <span className="font-mono text-xs text-dim">ADMIN PANEL</span>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-border pb-4">
          {(["payouts", "pools", "agents"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 text-xs font-mono transition-colors ${
                tab === t
                  ? "text-accent border border-accent"
                  : "text-dim border border-transparent hover:text-text"
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
          <button
            onClick={loadData}
            className="ml-auto px-4 py-2 text-xs font-mono text-dim border border-border hover:border-accent hover:text-accent transition-colors"
          >
            {loading ? "..." : "↻ REFRESH"}
          </button>
        </div>

        {/* PAYOUTS TAB */}
        {tab === "payouts" && (
          <div>
            <h2 className="font-bold mb-4">
              PAYOUT REQUESTS
              <span className="ml-2 text-xs font-mono text-dim">
                ({payouts.filter((p) => (p as Record<string, unknown>).status === "pending").length} pending)
              </span>
            </h2>
            <div className="space-y-3">
              {payouts.map((p) => {
                const payout = p as Record<string, unknown>;
                return (
                  <PayoutRow
                    key={payout.id as string}
                    payout={payout}
                    onSent={markPayoutSent}
                    onRejected={markPayoutRejected}
                  />
                );
              })}
              {payouts.length === 0 && (
                <div className="border border-border p-8 text-center text-dim font-mono text-sm">
                  NO PAYOUT REQUESTS
                </div>
              )}
            </div>
          </div>
        )}

        {/* POOLS TAB */}
        {tab === "pools" && (
          <div>
            <h2 className="font-bold mb-4">POOLS</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="text-left py-3 pr-4">TOKEN</th>
                    <th className="text-left py-3 pr-4">TIMEFRAME</th>
                    <th className="text-left py-3 pr-4">STATUS</th>
                    <th className="text-left py-3 pr-4">POT</th>
                    <th className="text-left py-3 pr-4">OUTCOME</th>
                    <th className="text-left py-3">CLOSES</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => {
                    const p = pool as Record<string, unknown>;
                    return (
                      <tr key={p.id as string} className="border-b border-border/50 hover:bg-surface">
                        <td className="py-3 pr-4">
                          <span className="text-text font-bold">{p.token_symbol as string}</span>
                          <span className="text-dim ml-1">{p.token_name as string}</span>
                        </td>
                        <td className="py-3 pr-4 text-dim">{(p.timeframe as string).toUpperCase()}</td>
                        <td className="py-3 pr-4">
                          <span className={
                            p.status === "open" ? "text-accent" :
                            p.status === "resolved" ? "text-dim" : "text-warn"
                          }>
                            {(p.status as string).toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-text">{(p.total_pot as number).toLocaleString()}</td>
                        <td className="py-3 pr-4">
                          {p.outcome ? (
                            <span className={p.outcome === "yes" ? "text-accent" : "text-warn"}>
                              {(p.outcome as string).toUpperCase()}
                            </span>
                          ) : <span className="text-dim">—</span>}
                        </td>
                        <td className="py-3 text-dim">
                          {new Date(p.closes_at as string).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AGENTS TAB */}
        {tab === "agents" && (
          <div>
            <h2 className="font-bold mb-4">AGENTS ({agents.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="text-left py-3 pr-4">WALLET</th>
                    <th className="text-left py-3 pr-4">MINING PTS</th>
                    <th className="text-left py-3 pr-4">PRED PTS</th>
                    <th className="text-left py-3 pr-4">BETS</th>
                    <th className="text-left py-3 pr-4">WINS</th>
                    <th className="text-left py-3">LAST ACTIVE</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const a = agent as Record<string, unknown>;
                    const winRate = (a.total_bets as number) > 0
                      ? (((a.total_wins as number) / (a.total_bets as number)) * 100).toFixed(0)
                      : "0";
                    return (
                      <tr key={a.id as string} className="border-b border-border/50 hover:bg-surface">
                        <td className="py-3 pr-4 text-text">
                          {(a.wallet as string).slice(0, 6)}...{(a.wallet as string).slice(-4)}
                        </td>
                        <td className="py-3 pr-4 text-accent">{(a.mining_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-text">{(a.prediction_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-dim">{a.total_bets as number}</td>
                        <td className="py-3 pr-4">
                          <span className="text-text">{a.total_wins as number}</span>
                          <span className="text-dim ml-1">({winRate}%)</span>
                        </td>
                        <td className="py-3 text-dim">
                          {a.last_active
                            ? new Date(a.last_active as string).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function PayoutRow({
  payout,
  onSent,
  onRejected,
}: {
  payout: Record<string, unknown>;
  onSent: (id: string, txHash: string) => void;
  onRejected: (id: string, reason: string) => void;
}) {
  const [txHash, setTxHash] = useState("");
  const isPending = payout.status === "pending";

  return (
    <div className={`border p-4 ${isPending ? "border-accent/30 bg-accent/3" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-sm text-text">{payout.wallet as string}</div>
          <div className="font-mono text-xs text-dim">
            {(payout.prediction_points_spent as number).toLocaleString()} pts →{" "}
            <span className="text-text">{Number(payout.predictbag_amount).toLocaleString()} $PREDICTBAG</span>
          </div>
          <div className="font-mono text-xs text-dim">
            Wallet: {payout.wallet_age_days as number} days · {payout.wallet_tx_count as number} txs
          </div>
          <div className="font-mono text-xs text-dim">
            {new Date(payout.requested_at as string).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isPending ? (
            <>
              <input
                type="text"
                placeholder="tx hash..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                className="bg-surface border border-border px-3 py-2 font-mono text-xs text-text w-48 focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => onSent(payout.id as string, txHash)}
                disabled={!txHash}
                className="px-4 py-2 bg-accent text-bg text-xs font-bold disabled:opacity-30"
              >
                SENT
              </button>
              <button
                onClick={() => onRejected(payout.id as string, "Rejected by admin")}
                className="px-4 py-2 border border-warn text-warn text-xs font-bold hover:bg-warn/10"
              >
                REJECT
              </button>
            </>
          ) : (
            <span className={`text-xs font-mono ${
              payout.status === "sent" ? "text-accent" : "text-warn"
            }`}>
              {(payout.status as string).toUpperCase()}
              {payout.tx_hash && (
                <a
                  href={`https://basescan.org/tx/${payout.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 underline"
                >
                  VIEW TX
                </a>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
