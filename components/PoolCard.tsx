"use client";

import Link from "next/link";
import Image from "next/image";

interface Pool {
  id: string;
  token_name: string;
  token_symbol: string;
  token_address: string;
  token_image_url?: string;
  question: string;
  current_mc: number;
  target_mc: number;
  direction: "up" | "down";
  timeframe: "fast" | "medium" | "slow";
  deadline_hours: number;
  closes_at: string;
  total_pot: number;
  status: string;
}

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

const timeframeLabel = {
  fast: { label: "FAST · 2H", color: "text-warn" },
  medium: { label: "MEDIUM · 6H", color: "text-info" },
  slow: { label: "SLOW · 12H", color: "text-accent" },
};

export default function PoolCard({ pool }: { pool: Pool }) {
  const tf = timeframeLabel[pool.timeframe];
  const isUp = (pool.direction ?? "up") === "up";
  const progress = isUp
    ? Math.min((pool.current_mc / pool.target_mc) * 100, 100)
    : Math.min(((pool.current_mc - pool.target_mc) / (pool.current_mc - pool.target_mc + 1)) * 100, 100);

  return (
    <Link href={`/predict/${pool.id}`}>
      <div className="border border-border bg-surface p-5 hover:border-accent/40 transition-all cursor-pointer group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Token Logo */}
            {pool.token_image_url ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border border-border flex-shrink-0">
                <img
                  src={pool.token_image_url}
                  alt={pool.token_symbol}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-dim">
                  {pool.token_symbol.slice(0, 2)}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-bold text-lg">{pool.token_symbol}</span>
                {/* Direction badge */}
                <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                  isUp
                    ? "bg-accent/10 text-accent border border-accent/30"
                    : "bg-warn/10 text-warn border border-warn/30"
                }`}>
                  {isUp ? "↑ UP" : "↓ DOWN"}
                </span>
              </div>
              <span className={`text-xs font-mono ${tf.color}`}>{tf.label}</span>
            </div>
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

        {/* MC Info */}
        <div className="mb-4">
          <div className="flex justify-between text-xs font-mono text-dim mb-1.5">
            <span>CURRENT {formatMC(pool.current_mc)}</span>
            <span>{isUp ? "TARGET" : "DROP TO"} {formatMC(pool.target_mc)}</span>
          </div>
          <div className="h-1 bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${isUp ? "bg-accent" : "bg-warn"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-dim">
            POT: <span className="text-text">{pool.total_pot.toLocaleString()} pts</span>
          </span>
          <span className="text-accent group-hover:underline">PREDICT →</span>
        </div>
      </div>
    </Link>
  );
}
