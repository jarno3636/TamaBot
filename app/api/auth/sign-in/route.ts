// app/api/auth/sign-in/route.ts
import { fetchUser } from "@/lib/neynar";
import { serverEnv } from "@/lib/env";
import * as jose from "jose";
import { NextRequest, NextResponse } from "next/server";
import { verifyMessage } from "viem";

export const POST = async (req: NextRequest) => {
  try {
    const { fid, signature, message, referrerFid } = await req.json();

    // 1) Lookup user on Neynar
    const user = await fetchUser(String(fid));
    if (!user?.custody_address) {
      return NextResponse.json({ error: "User has no custody address" }, { status: 400 });
    }

    // 2) Verify signature matches custody address
    const isValidSignature = await verifyMessage({
      address: user.custody_address as `0x${string}`,
      message,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 3) Create JWT
    const secret = new TextEncoder().encode(serverEnv.JWT_SECRET);
    const token = await new jose.SignJWT({
      fid,
      walletAddress: user.custody_address,
      referrerFid: referrerFid ?? null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret);

    const res = NextResponse.json({ success: true, user });

    // 4) Set cookie (must be HTTPS for SameSite=None)
    res.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return res;
  } catch (err: any) {
    console.error("sign-in error:", err);
    return NextResponse.json({ error: "Sign in failed" }, { status: 500 });
  }
};
