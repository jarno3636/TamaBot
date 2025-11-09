// lib/domains.ts
import { ethers } from "ethers";

/**
 * You can hardcode these public RPCs or read from env.
 * If you have your own RPCs, set:
 *  - NEXT_PUBLIC_BASE_RPC_URL
 *  - NEXT_PUBLIC_MAINNET_RPC_URL
 */
const BASE_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
const MAINNET_RPC =
  process.env.NEXT_PUBLIC_MAINNET_RPC_URL || "https://eth.llamarpc.com";

// Base Name Service reverse resolver (getPrimaryDomain(address) -> string)
const BASE_REVERSE_RESOLVER = "0x86f6d95E688A5953074C0aBCb0d9d930837E528E";
const BASE_REVERSE_ABI = [
  "function getPrimaryDomain(address) view returns (string)"
];

const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
const mainnetProvider = new ethers.JsonRpcProvider(MAINNET_RPC);

async function getBasePrimaryDomain(addr: string): Promise<string | null> {
  try {
    const c = new ethers.Contract(
      BASE_REVERSE_RESOLVER,
      BASE_REVERSE_ABI,
      baseProvider
    );
    const name: string = await c.getPrimaryDomain(addr);
    // Some resolvers return "" if none is set
    if (name && name.trim().length > 0) return name.endsWith(".base") ? name : `${name}.base`;
  } catch {}
  return null;
}

async function getEnsName(addr: string): Promise<string | null> {
  try {
    const ens = await mainnetProvider.lookupAddress(addr);
    if (ens && ens.trim().length > 0) return ens;
  } catch {}
  return null;
}

/** Try Base name first, then ENS.  Returns null if nothing is set. */
export async function resolveDisplayName(addr: string): Promise<string | null> {
  if (!addr) return null;
  const baseName = await getBasePrimaryDomain(addr);
  if (baseName) return baseName;
  const ens = await getEnsName(addr);
  if (ens) return ens;
  return null;
}
