import { NextResponse } from "next/server";
import { exchangeCodeForToken, getAuthorization } from "@/lib/basecamp";
import { setSessionCookie } from "@/lib/auth";

function getOrigin(request) {
  const url = new URL(request.url);
  return url.origin;
}

export async function GET(request) {
  const origin = getOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", origin));
  }

  try {
    console.log("[callback] code received:", code);

    const tokenData = await exchangeCodeForToken(code);
    console.log("[callback] tokenData:", JSON.stringify(tokenData, null, 2));

    const authData = await getAuthorization(tokenData.access_token);
    console.log("[callback] authData:", JSON.stringify(authData, null, 2));

    // Find the first Basecamp 3 account
    const bc3Account = authData.accounts?.find(
      (a) => a.product === "bc3" || a.product === "bcx"
    );
    console.log("[callback] bc3Account:", JSON.stringify(bc3Account, null, 2));

    const session = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in || 1209600) * 1000,
      accountId: bc3Account?.id,
      identity: authData.identity,
    };
    console.log("[callback] session to store:", JSON.stringify(session, null, 2));

    setSessionCookie(session);
    console.log("[callback] cookie set, redirecting to /dashboard");

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (error) {
    console.error("[callback] FULL ERROR:", error);
    console.error("[callback] response status:", error?.response?.status);
    console.error("[callback] response data:", JSON.stringify(error?.response?.data, null, 2));
    console.error("[callback] message:", error.message);
    return NextResponse.redirect(new URL("/?error=auth_failed", origin));
  }
}
