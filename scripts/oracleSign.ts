// scripts/oracleSign.ts
import "dotenv/config";
import { createWalletClient, createPublicClient, http, encodeAbiParameters, keccak256, stringToHex, padHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

/** ---- config from env ----
 * REQUIRED:
 *   ORACLE_PRIVATE_KEY        0x... (no 0x is also fine)
 *   VERIFYING_CONTRACT        0x... (address of your AttestationVerifier)
 * OPTIONAL:
 *   DOMAIN_NAME (default "TamaBotVerifier")
 *   DOMAIN_VERSION (default "1")
 *   CHAIN_RPC_BASE (falls back to Base mainnet)
 */
const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  "https://mainnet.base.org";

const VERIFYING_CONTRACT = (process.env.VERIFYING_CONTRACT || "").trim() as `0x${string}`;
if (!VERIFYING_CONTRACT) throw new Error("Missing env VERIFYING_CONTRACT");

const ORACLE_PK = (process.env.ORACLE_PRIVATE_KEY || "").replace(/^0x/, "");
if (!ORACLE_PK) throw new Error("Missing env ORACLE_PRIVATE_KEY");

const DOMAIN_NAME = process.env.DOMAIN_NAME || "TamaBotVerifier";
const DOMAIN_VERSION = process.env.DOMAIN_VERSION || "1";

const toBytes32 = (s: string) => padHex(stringToHex(s), { size: 32 });

async function main() {
  const account = privateKeyToAccount(`0x${ORACLE_PK}`);
  const wallet = createWalletClient({ account, chain: base, transport: http(RPC) });
  const pub    = createPublicClient({ chain: base, transport: http(RPC) });

  // Example input (you can wire CLI args)
  // pnpm oracle:sign <fid> [day] [dss] [deadlineSec]
  const [, , fidArg, dayArg, dssArg, deadlineArg] = process.argv;
  if (!fidArg || !/^\d+$/.test(fidArg)) {
    console.error("Usage: pnpm oracle:sign <fid> [dayUnixDays] [dss] [deadlineSec]");
    process.exit(1);
  }

  const now = Math.floor(Date.now() / 1000);
  const day = dayArg ? Number(dayArg) : Math.floor(now / 86400);
  const deadline = deadlineArg ? Number(deadlineArg) : now + 15 * 60;

  // Your DSS calculation (replace with real score)
  const dss = dssArg ? BigInt(dssArg) : BigInt((Number(fidArg) * 1337) % 10000);

  const fid = BigInt(fidArg);
  const nonce = BigInt(day); // example: per-day nonce

  // Encode the exact params your verifier checks
  const payload = encodeAbiParameters(
    [
      { name: "fid", type: "uint256" },
      { name: "day", type: "uint256" },
      { name: "dss", type: "uint64"  },
      { name: "deadline", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
    [fid, BigInt(day), dss, BigInt(deadline), nonce]
  );

  // EIP-712 domain — if your verifier reads domain.name/version as bytes32, keep bytes32
  const domainSeparator = keccak256(
    encodeAbiParameters(
      [
        { name: "name", type: "bytes32" },
        { name: "version", type: "bytes32" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      [toBytes32(DOMAIN_NAME), toBytes32(DOMAIN_VERSION), BigInt(base.id), VERIFYING_CONTRACT]
    )
  );

  // Final digest — match your verifier’s verifyAndScore hashing (often keccak256(0x1901 || domain || keccak(payload)))
  const payloadHash = keccak256(payload);
  const digest = keccak256(`0x1901${domainSeparator.slice(2)}${payloadHash.slice(2)}`);

  const signature = await wallet.signMessage({ message: { raw: digest as `0x${string}` } });

  console.log(JSON.stringify({
    fid: fid.toString(),
    day,
    dss: dss.toString(),
    deadline,
    nonce: nonce.toString(),
    payload,
    signature,
    domain: {
      name: DOMAIN_NAME,
      version: DOMAIN_VERSION,
      chainId: base.id,
      verifyingContract: VERIFYING_CONTRACT,
    },
    signer: account.address,
    rpc: RPC,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
