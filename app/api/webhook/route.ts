// app/api/webhook/route.ts
import { sendFrameNotification } from "@/lib/notification-client";
import {
  deleteUserNotificationDetails,
  setUserNotificationDetails,
} from "@/lib/notifications";
import { createPublicClient, http } from "viem";
import { optimism } from "viem/chains";

// Farcaster Key Registry (Optimism)
const KEY_REGISTRY_ADDRESS = "0x00000000Fc1237824fb747aBDE0FF18990E59b7e" as const;

const KEY_REGISTRY_ABI = [
  {
    inputs: [
      { name: "fid", type: "uint256" },
      { name: "key", type: "bytes" },
    ],
    name: "keyDataOf",
    outputs: [
      {
        components: [
          { name: "state", type: "uint8" },
          { name: "keyType", type: "uint32" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function verifyFidOwnership(fid: number, appKey: `0x${string}`) {
  const client = createPublicClient({ chain: optimism, transport: http() });
  try {
    const result = await client.readContract({
      address: KEY_REGISTRY_ADDRESS,
      abi: KEY_REGISTRY_ABI,
      functionName: "keyDataOf",
      args: [BigInt(fid), appKey],
    });
    // state: 1 (ADDED), keyType: 1 (APP KEY)
    return (result as any)?.state === 1 && (result as any)?.keyType === 1;
  } catch (error) {
    console.error("Key Registry verification failed:", error);
    return false;
  }
}

function decode(encoded: string) {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
}

export async function POST(request: Request) {
  try {
    const requestJson = await request.json();

    const { header: encodedHeader, payload: encodedPayload } = requestJson;
    const headerData = decode(encodedHeader);
    const event = decode(encodedPayload);

    const { fid, key } = headerData as { fid: number; key: `0x${string}` };

    const valid = await verifyFidOwnership(fid, key);
    if (!valid) {
      return Response.json({ success: false, error: "Invalid FID ownership" }, { status: 401 });
    }

    switch (event.event) {
      case "frame_added":
        if (event.notificationDetails) {
          await setUserNotificationDetails(fid, event.notificationDetails);
          await sendFrameNotification({
            fid,
            title: "Welcome to TamaBot",
            body: "Thanks for adding TamaBot! 🐣",
          });
        } else {
          await deleteUserNotificationDetails(fid);
        }
        break;

      case "frame_removed":
        await deleteUserNotificationDetails(fid);
        break;

      case "notifications_enabled":
        if (event.notificationDetails) {
          await setUserNotificationDetails(fid, event.notificationDetails);
          await sendFrameNotification({
            fid,
            title: "TamaBot notifications on",
            body: "We’ll keep you posted with important updates.",
          });
        }
        break;

      case "notifications_disabled":
        await deleteUserNotificationDetails(fid);
        break;

      default:
        // noop
        break;
    }

    return Response.json({ success: true });
  } catch (e) {
    console.error("webhook error:", e);
    return Response.json({ success: false }, { status: 500 });
  }
}
