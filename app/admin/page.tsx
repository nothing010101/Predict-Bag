"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET?.toLowerCase();
const PAGE_SIZE = 50;

export default function AdminPage() {
  const [wallet, setWallet] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [tab, setTab] = useState<"payouts" | "pools" | "agents">("payouts");

  // Payouts
  const [payouts, setPayouts] = useState<Record<string, unknown>[]>([]);

  // Pools
  const [pools, setPools] = useState<Record<string, unknown>[]>([]);

  // Agents
  const [agents, setAgents] = useState<Record<string, unknown>[]>([]);
  const [agentSearch, setAgentSearch] = useState("");
  const [agentPage, setAgentPage] = useState(0);
  const [agentTotal, setAgentTotal] = useState(0);
  const [agentLoading, setAgentLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  function login() {
    if (wallet.toLowerCase() === ADMIN_WALLET) {
      setAuthenticated(true);
    } else {
      alert("Not authorized");
    }
  }

  async function loadPayouts() {
    const { data } = await supabase
      .from("payout_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(100);
    setPayouts(data ?? []);
  }

  async function loadPools() {
    const { data } = await supabase
      .from("pools")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setPools(data ?? []);
  }

  const loadAgents = useCallback(async (search: string, page: number) => {
    setAgentLoading(true);
    let query = supabase
      .from("agents")
      .select("*", { count: "exact" })
      .order("prediction_points", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search.length > 3) {
      query = query.ilike("wallet", `%${search}%`);
    }

    const { data, count } = await query;
    setAgents(data ?? []);
    setAgentTotal(count ?? 0);
    setAgentLoading(false);
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadPayouts(), loadPools(), loadAgents(agentSearch, agentPage)]);
    setLoading(false);
  }

  async function markPayoutSent(id: string, txHash: string) {
    if (!txHash) return;
    await supabase
      .from("payout_requests")
      .update({ status: "sent", tx_hash: txHash, processed_at: new Date().toISOString() })
      .eq("id", id);
    loadPayouts();
  }

  async function markPayoutRejected(id: string) {
    const payout = payouts.find((p) => p.id === id);
    if (payout) {
      const { data: agent } = await supabase
        .from("agents")
        .select("prediction_points")
        .eq("wallet", payout.wallet as string)
        .single();
      if (agent) {
        await supabase
          .from("agents")
          .update({
            prediction_points:
              (agent.prediction_points as number) + (payout.prediction_points_spent as number),
          })
          .eq("wallet", payout.wallet as string);
      }
    }
    await supabase
      .from("payout_requests")
      .update({
        status: "rejected",
        rejection_reason: "Rejected by admin",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadPayouts();
  }

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated]);

  useEffect(() => {
    if (authenticated) loadAgents(agentSearch, agentPage);
  }, [agentSearch, agentPage, authenticated, loadAgents]);

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
            onKeyDown={(e) => e.key === "Enter" && login()}
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
              {t === "payouts" && payouts.filter((p) => p.status === "pending").length > 0 && (
                <span className="ml-1.5 bg-accent text-bg px-1.5 py-0.5 text-[10px] font-black rounded-sm">
                  {payouts.filter((p) => p.status === "pending").length}
                </span>
              )}
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
                ({payouts.filter((p) => p.status === "pending").length} pending · {payouts.length} total)
              </span>
            </h2>
            <div className="space-y-3">
              {payouts.length === 0 && (
                <div className="border border-border p-8 text-center text-dim font-mono text-sm">
                  NO PAYOUT REQUESTS
                </div>
              )}
              {payouts.map((payout) => (
                <PayoutRow
                  key={payout.id as string}
                  payout={payout}
                  onSent={markPayoutSent}
                  onRejected={markPayoutRejected}
                />
              ))}
            </div>
          </div>
        )}

        {/* POOLS TAB */}
        {tab === "pools" && (
          <div>
            <h2 className="font-bold mb-4">POOLS <span className="text-xs font-mono text-dim">({pools.length} shown)</span></h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-border text-dim">
                    <th className="text-left py-3 pr-4">TOKEN</th>
                    <th className="text-left py-3 pr-4">DIR</th>
                    <th className="text-left py-3 pr-4">TIMEFRAME</th>
                    <th className="text-left py-3 pr-4">STATUS</th>
                    <th className="text-left py-3 pr-4">POT</th>
                    <th className="text-left py-3 pr-4">OUTCOME</th>
                    <th className="text-left py-3">CLOSES</th>
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => (
                    <tr key={pool.id as string} className="border-b border-border/50 hover:bg-surface">
                      <td className="py-3 pr-4">
                        <span className="text-text font-bold">{pool.token_symbol as string}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className={pool.direction === "up" ? "text-green-400" : "text-red-400"}>
                          {pool.direction === "up" ? "↑" : "↓"}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-dim">{(pool.timeframe as string).toUpperCase()}</td>
                      <td className="py-3 pr-4">
                        <span className={
                          pool.status === "open" ? "text-accent" :
                          pool.status === "resolved" ? "text-dim" : "text-yellow-400"
                        }>
                          {(pool.status as string).toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-text">{(pool.total_pot as number).toLocaleString()}</td>
                      <td className="py-3 pr-4">
                        {pool.outcome
                          ? <span className={pool.outcome === "yes" ? "text-green-400" : "text-red-400"}>{(pool.outcome as string).toUpperCase()}</span>
                          : <span className="text-dim">—</span>
                        }
                      </td>
                      <td className="py-3 text-dim">
                        {new Date(pool.closes_at as string).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AGENTS TAB */}
        {tab === "agents" && (
          <div>
            <div className="flex items-center justify-between mb-4 gap-4">
              <h2 className="font-bold">
                AGENTS
                <span className="ml-2 text-xs font-mono text-dim">
                  ({agentTotal.toLocaleString()} total)
                </span>
              </h2>
              <input
                type="text"
                placeholder="Search by wallet address..."
                value={agentSearch}
                onChange={(e) => { setAgentSearch(e.target.value); setAgentPage(0); }}
                className="bg-surface border border-border px-4 py-2 font-mono text-xs text-text w-72 focus:outline-none focus:border-accent placeholder:text-dim"
              />
            </div>

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
                  {agentLoading ? (
                    <tr><td colSpan={6} className="py-8 text-center text-dim">LOADING...</td></tr>
                  ) : agents.length === 0 ? (
                    <tr><td colSpan={6} className="py-8 text-center text-dim">NO AGENTS FOUND</td></tr>
                  ) : agents.map((agent) => {
                    const winRate = (agent.total_bets as number) > 0
                      ? (((agent.total_wins as number) / (agent.total_bets as number)) * 100).toFixed(0)
                      : "0";
                    return (
                      <tr key={agent.id as string} className="border-b border-border/50 hover:bg-surface">
                        <td className="py-3 pr-4 text-text font-mono">
                          {(agent.wallet as string).slice(0, 8)}...{(agent.wallet as string).slice(-6)}
                        </td>
                        <td className="py-3 pr-4 text-accent">{(agent.mining_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-text">{(agent.prediction_points as number).toLocaleString()}</td>
                        <td className="py-3 pr-4 text-dim">{agent.total_bets as number}</td>
                        <td className="py-3 pr-4">
                          <span className="text-text">{agent.total_wins as number}</span>
                          <span className="text-dim ml-1">({winRate}%)</span>
                        </td>
                        <td className="py-3 text-dim">
                          {agent.last_active ? new Date(agent.last_active as string).toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {agentTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="text-xs font-mono text-dim">
                  Showing {agentPage * PAGE_SIZE + 1}–{Math.min((agentPage + 1) * PAGE_SIZE, agentTotal)} of {agentTotal.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setAgentPage((p) => Math.max(0, p - 1))}
                    disabled={agentPage === 0}
                    className="px-4 py-2 text-xs font-mono border border-border text-dim hover:border-accent hover:text-accent disabled:opacity-30 transition-colors"
                  >
                    ← PREV
                  </button>
                  <span className="px-4 py-2 text-xs font-mono text-dim border border-border">
                    {agentPage + 1} / {Math.ceil(agentTotal / PAGE_SIZE)}
                  </span>
                  <button
                    onClick={() => setAgentPage((p) => p + 1)}
                    disabled={(agentPage + 1) * PAGE_SIZE >= agentTotal}
                    className="px-4 py-2 text-xs font-mono border border-border text-dim hover:border-accent hover:text-accent disabled:opacity-30 transition-colors"
                  >
                    NEXT →
                  </button>
                </div>
              </div>
            )}
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
  onRejected: (id: string) => void;
}) {
  const [txHash, setTxHash] = useState("");
  const isPending = payout.status === "pending";
  const txHashStr = payout.tx_hash as string | null;

  return (
    <div className={`border p-4 ${isPending ? "border-accent/30 bg-accent/[0.02]" : "border-border"}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="font-mono text-sm text-text">{(payout.wallet as string).slice(0, 8)}...{(payout.wallet as string).slice(-6)}</div>
          <div className="font-mono text-xs text-dim">
            {(payout.prediction_points_spent as number).toLocaleString()} pts →{" "}
            <span className="text-green-400 font-black">${((payout.prediction_points_spent as number) / 1000).toFixed(2)} USDC</span>
          </div>
          <div className="font-mono text-xs text-dim">
            Wallet: {payout.wallet_age_days as number} days · {payout.wallet_tx_count as number} txs
          </div>
          <div className="font-mono text-xs text-dim">
            {payout.requested_at ? new Date(payout.requested_at as string).toLocaleString() : "—"}
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
                onClick={() => onRejected(payout.id as string)}
                className="px-4 py-2 border border-red-400 text-red-400 text-xs font-bold hover:bg-red-400/10"
              >
                REJECT
              </button>
            </>
          ) : (
            <span className={`text-xs font-mono ${payout.status === "sent" ? "text-accent" : "text-red-400"}`}>
              {(payout.status as string).toUpperCase()}
              {txHashStr && (
                <a
                  href={`https://basescan.org/tx/${txHashStr}`}
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
