// lib/frame-notifications.ts
// Minimal types to avoid depending on @farcaster/frame-sdk

export type FrameNotificationDetails = {
  url: string;     // webhook endpoint provided by Warpcast
  token: string;   // push token for the user
};

export type SendNotificationRequest = {
  notificationId: string;  // unique id per notification
  title: string;
  body: string;
  targetUrl?: string;
  tokens: string[];        // one or more push tokens
};
