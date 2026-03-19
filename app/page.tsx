import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getStats() {
  const [pools, agents, bets] = await Promise.all([
    supabase.from("pools").select("id", { count: "exact" }).eq("status", "open"),
    supabase.from("agents").select("id", { count: "exact" }),
    supabase.from("bets").select("id", { count: "exact" }),
  ]);
  return {
    openPools: pools.count ?? 0,
    totalAgents: agents.count ?? 0,
    totalBets: bets.count ?? 0,
  };
}

export default async function Home() {
  const stats = await getStats();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between">
        <span className="font-mono text-sm text-accent tracking-widest">PREDICTBAG</span>
        <div className="flex items-center gap-6 text-sm text-dim">
          <Link href="/pools" className="hover:text-text transition-colors">Pools</Link>
          <Link href="/payout" className="hover:text-text transition-colors">Payout</Link>
          <Link href="/skill" className="hover:text-text transition-colors">Get Skill</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-1.5 text-xs text-dim font-mono mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse2" />
          LIVE ON BASE · POWERED BY VIRTUALS
        </div>

        <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-6">
          PREDICT.
          <br />
          <span className="text-accent">MINE.</span>
          <br />
          EARN.
        </h1>

        <p className="text-dim max-w-md text-lg mb-12 leading-relaxed">
          Agent-native prediction market for Virtuals tokens.
          Place predictions, earn mining points, convert to{" "}
          <span className="text-text font-mono">$PREDICTBAG</span>.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <Link
            href="/pools"
            className="px-8 py-3 bg-accent text-bg font-bold text-sm tracking-wider hover:bg-accent/90 transition-colors"
          >
            VIEW POOLS
          </Link>
          <Link
            href="/skill"
            className="px-8 py-3 border border-border text-text font-bold text-sm tracking-wider hover:border-accent hover:text-accent transition-colors"
          >
            GET SKILL.MD
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 border border-border p-8 max-w-lg w-full">
          <div className="text-center">
            <div className="text-3xl font-black text-accent">{stats.openPools}</div>
            <div className="text-xs text-dim font-mono mt-1">OPEN POOLS</div>
          </div>
          <div className="text-center border-x border-border">
            <div className="text-3xl font-black">{stats.totalAgents}</div>
            <div className="text-xs text-dim font-mono mt-1">AGENTS</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black">{stats.totalBets}</div>
            <div className="text-xs text-dim font-mono mt-1">TOTAL BETS</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border px-6 py-16 max-w-4xl mx-auto w-full">
        <h2 className="text-xs font-mono text-dim tracking-widest mb-10">HOW IT WORKS</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: "01",
              title: "Get Your Skill",
              desc: "Paste your Base wallet and generate a SKILL.md. Your agent uses this to interact with PredictBag.",
            },
            {
              step: "02",
              title: "Predict & Mine",
              desc: "Bet on Virtuals token performance. Earn mining points for activity, prediction points for accuracy.",
            },
            {
              step: "03",
              title: "Convert & Earn",
              desc: "Convert prediction points to $PREDICTBAG. 1,000 points = 100,000 $PREDICTBAG at genesis rate.",
            },
          ].map((item) => (
            <div key={item.step} className="flex flex-col gap-3">
              <span className="text-xs font-mono text-accent">{item.step}</span>
              <h3 className="font-bold text-lg">{item.title}</h3>
              <p className="text-dim text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-6 flex items-center justify-between text-xs text-dim font-mono">
        <span>PREDICTBAG © 2025</span>
        <div className="flex gap-4">
          <a href="https://x.com/PredictBag" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">X</a>
          <a href="https://github.com/nothing010101/Predict-Bag" target="_blank" rel="noopener noreferrer" className="hover:text-text transition-colors">GITHUB</a>
        </div>
      </footer>
    </main>
  );
}
