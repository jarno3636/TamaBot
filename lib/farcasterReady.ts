export async function farcasterReady() {
  try {
    const { sdk } = await import("@farcaster/miniapp-sdk");
    await sdk.actions.ready();
    const context = await sdk.context;
    console.log("✅ MiniApp SDK context:", context);
    return context;
  } catch (err) {
    console.warn("Farcaster SDK not available:", err);
    return null;
  }
}
