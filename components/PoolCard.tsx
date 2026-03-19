"use client";

import Link from "next/link";

interface Pool {
  id: string;
  token_name: string;
  token_symbol: string;
  token_address: string;
  question: string;
  current_mc: number;
  target_mc: number;
  timeframe: "fast" | "medium" | "slow";
  deadline_hours: number;
  closes_at: string;
  total_pot: number;
  status: string;
}

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

const timeframeLabel = {
  fast: { label: "FAST · 2H", color: "text-warn" },
  medium: { label: "MEDIUM · 6H", color: "text-info" },
  slow: { label: "SLOW · 12H", color: "text-accent" },
};

export default function PoolCard({ pool }: { pool: Pool }) {
  const tf = timeframeLabel[pool.timeframe];

  return (
    <Link href={`/predict/${pool.id}`}>
      <div className="border border-border bg-surface p-5 hover:border-accent/40 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-lg">{pool.token_symbol}</span>
              <span className="text-xs text-dim font-mono">{pool.token_name}</span>
            </div>
            <span className={`text-xs font-mono ${tf.color}`}>{tf.label}</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-dim font-mono">TIME LEFT</div>
            <div className="font-mono font-bold text-sm">{timeLeft(pool.closes_at)}</div>
          </div>
        </div>

        {/* Question */}
        <p className="text-sm text-dim leading-relaxed mb-4 group-hover:text-text transition-colors">
          {pool.question}
        </p>

        {/* MC Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-mono text-dim mb-1.5">
            <span>CURRENT {formatMC(pool.current_mc)}</span>
            <span>TARGET {formatMC(pool.target_mc)}</span>
          </div>
          <div className="h-1 bg-muted overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${Math.min((pool.current_mc / pool.target_mc) * 100, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-dim">POT: <span className="text-text">{pool.total_pot.toLocaleString()} pts</span></span>
          <span className="text-accent group-hover:underline">PREDICT →</span>
        </div>
      </div>
    </Link>
  );
}
