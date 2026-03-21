"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const navLinks = [
  { href: "/pools", label: "POOLS" },
  { href: "/leaderboard", label: "LEADERBOARD" },
  { href: "/payout", label: "PAYOUT" },
  { href: "/skill", label: "SKILL.MD" },
  { href: "/about", label: "ABOUT" },
];

function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().slice(5, 25) + " UTC");
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="text-[#f5a623]/40 text-[11px] font-mono tabular-nums hidden sm:block">{time}</span>;
}

function Ticker() {
  const [pools, setPools] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("pools")
      .select("token_symbol, direction, timeframe")
      .eq("status", "open")
      .limit(20)
      .then(({ data }) => setPools(data ?? []));
  }, []);

  if (pools.length === 0) return null;

  const items = [...pools, ...pools];

  return (
    <div className="bg-[#0d0d0d] border-b border-[#f5a623]/15 overflow-hidden">
      <div className="flex items-center">
        <div className="bg-[#f5a623] text-[#0a0a0a] px-3 py-1.5 text-[10px] font-black tracking-widest whitespace-nowrap flex-shrink-0">
          LIVE
        </div>
        <div className="overflow-hidden flex-1">
          <div className="flex gap-8 px-4 py-1.5 animate-ticker whitespace-nowrap text-[11px] font-mono">
            {items.map((p, i) => (
              <span key={i} className={`flex-shrink-0 ${p.direction === "up" ? "text-[#4caf50]" : "text-[#f44336]"}`}>
                {p.token_symbol} {p.direction === "up" ? "↑" : "↓"} {p.timeframe?.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PredictBagLogo({ size = 28 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
      alt="PredictBag"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
    />
  );
}

export default function BloombergLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e8d5a3]" style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');
        @keyframes ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .animate-ticker { animation: ticker 30s linear infinite; }
        .animate-ticker:hover { animation-play-state: paused; }
      `}</style>

      {/* Top bar */}
      <div className="bg-[#f5a623] text-[#0a0a0a] px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PredictBagLogo size={20} />
          <span className="font-black text-[11px] tracking-widest">PREDICTBAG</span>
          <span className="text-[#0a0a0a]/50 text-[10px] hidden sm:block">BASE CHAIN · AGENT PREDICTION MARKET</span>
        </div>
        <LiveClock />
      </div>

      {/* Ticker */}
      <Ticker />

      {/* Nav */}
      <nav className="border-b border-[#f5a623]/15 bg-[#0d0d0d]">
        <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto">
          {navLinks.map(n => (
            <Link key={n.href} href={n.href}
              className={`px-5 py-3 text-[11px] font-bold tracking-widest whitespace-nowrap border-b-2 transition-colors ${
                path === n.href || path?.startsWith(n.href + "/")
                  ? "border-[#f5a623] text-[#f5a623]"
                  : "border-transparent text-[#e8d5a3]/30 hover:text-[#e8d5a3]/70 hover:border-[#f5a623]/30"
              }`}>
              {n.label}
            </Link>
          ))}
        </div>
      </nav>

      {children}
    </div>
  );
}
