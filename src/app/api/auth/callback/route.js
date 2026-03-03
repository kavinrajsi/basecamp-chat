import { NextResponse } from "next/server";
import { exchangeCodeForToken, getAuthorization } from "@/lib/basecamp";
import { setSessionCookie } from "@/lib/auth";

function getOrigin() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:80";
}

export async function GET(request) {
  const origin = getOrigin();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", origin));
  }

  try {
    const tokenData = await exchangeCodeForToken(code);
    const authData = await getAuthorization(tokenData.access_token);

    // Find the first Basecamp 3 account
    const bc3Account = authData.accounts?.find(
      (a) => a.product === "bc3" || a.product === "bcx"
    );

    const session = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 1209600) * 1000,
      accountId: bc3Account?.id,
      identity: authData.identity,
    };

    await setSessionCookie(session);
    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (error) {
    console.error("[callback] auth failed:", error?.response?.status, error.message);
    return NextResponse.redirect(new URL("/?error=auth_failed", origin));
  }
}
