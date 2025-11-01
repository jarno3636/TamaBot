// scripts/oracleSign.ts
import 'dotenv/config';
import { createWalletClient, http, formatBytes32String } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, encodeAbiParameters, keccak256, http as httpPub } from 'viem';
import { TAMABOT_CORE } from '@/lib/abi'; // your Core (or the Verifier ABI below)

const VERIFIER_ADDR = process.env.VERIFIER_ADDRESS as `0x${string}`;
const RPC = process.env.CHAIN_RPC_BASE || 'https://mainnet.base.org';
const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY! as `0x${string}`;

const account = privateKeyToAccount(ORACLE_PK);
const wallet = createWalletClient({ account, chain: base, transport: http(RPC) });
const pub = createPublicClient({ chain: base, transport: httpPub(RPC) });

/** Replace these with the exact fields & order your Solidity expects */
type Score = {
  fid: bigint;
  day: bigint;
  dss: bigint;        // uint64 fits into bigint fine
  deadline: bigint;
  nonce: bigint;
};

async function getDomain() {
  // Read eip712Domain() from the verifier
  const [fields, name, version, chainId, verifyingContract] = await pub.readContract({
    address: VERIFIER_ADDR,
    abi: [
      { inputs: [], name: 'eip712Domain', outputs: [
        { type: 'bytes1', name: 'fields' },
        { type: 'string', name: 'name' },
        { type: 'string', name: 'version' },
        { type: 'uint256', name: 'chainId' },
        { type: 'address', name: 'verifyingContract' },
        { type: 'bytes32', name: 'salt' },
        { type: 'uint256[]', name: 'extensions' },
      ], stateMutability: 'view', type: 'function' }
    ] as const,
    functionName: 'eip712Domain',
  }) as any[];

  return {
    name: String(name || 'TamaBot Oracle'),
    version: String(version || '1'),
    chainId: BigInt(chainId),
    verifyingContract: verifyingContract as `0x${string}`,
  };
}

export async function signScore(input: Score) {
  const domain = await getDomain();

  /** Must match Solidity struct + order + types */
  const types = {
    Score: [
      { name: 'fid',      type: 'uint256' },
      { name: 'day',      type: 'uint256' },
      { name: 'dss',      type: 'uint64'  },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce',    type: 'uint256' },
    ],
  } as const;

  const message = {
    fid: input.fid,
    day: input.day,
    dss: input.dss,
    deadline: input.deadline,
    nonce: input.nonce,
  };

  // 1) EIP-712 signature
  const signature = await wallet.signTypedData({
    domain, types, primaryType: 'Score', message,
  });

  // 2) ABI-encode payload bytes in the SAME ORDER the contract decodes
  const payload = encodeAbiParameters(
    [
      { name: 'fid',      type: 'uint256' },
      { name: 'day',      type: 'uint256' },
      { name: 'dss',      type: 'uint64'  },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce',    type: 'uint256' },
    ],
    [message.fid, message.day, message.dss, message.deadline, message.nonce]
  );

  return { payload, signature };
}

// Example usage
if (require.main === module) {
  (async () => {
    const now = Math.floor(Date.now() / 1000);
    const day = Math.floor(now / 86400);

    const out = await signScore({
      fid:  BigInt(1234),
      day:  BigInt(day),
      dss:  BigInt(9876),        // your computed score
      deadline: BigInt(now + 900), // 15 min ttl
      nonce: BigInt(day),        // simple: one per day
    });

    console.log('payload (0x…):', out.payload);
    console.log('signature (0x…):', out.signature);
  })();
}
