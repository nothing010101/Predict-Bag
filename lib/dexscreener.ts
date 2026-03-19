const BASE_URL = "https://api.dexscreener.com";

export interface TokenData {
  address: string;
  name: string;
  symbol: string;
  priceUsd: number;
  marketCap: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
  pairAddress: string | null;
  hasLiquidity: boolean; // true = sudah graduate ke Uniswap
}

export async function getTokenData(tokenAddress: string): Promise<TokenData | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/tokens/v1/base/${tokenAddress}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const pair = data?.pairs?.[0];
    if (!pair) return null;

    return {
      address: tokenAddress,
      name: pair.baseToken?.name ?? "",
      symbol: pair.baseToken?.symbol ?? "",
      priceUsd: parseFloat(pair.priceUsd ?? "0"),
      marketCap: pair.marketCap ?? 0,
      liquidity: pair.liquidity?.usd ?? 0,
      volume24h: pair.volume?.h24 ?? 0,
      priceChange24h: pair.priceChange?.h24 ?? 0,
      pairAddress: pair.pairAddress ?? null,
      hasLiquidity: (pair.liquidity?.usd ?? 0) > 0,
    };
  } catch {
    return null;
  }
}

export async function getLatestBaseTokens(): Promise<TokenData[]> {
  try {
    const res = await fetch(`${BASE_URL}/token-profiles/latest/v1`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data ?? [])
      .filter((t: { chainId: string }) => t.chainId === "base")
      .slice(0, 50);
  } catch {
    return [];
  }
}
