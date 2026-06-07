import { NextResponse } from "next/server";
import { withApiLogging } from "@/lib/api-logger";
import { getAuthorizationUrl } from "@/lib/basecamp";

export const GET = withApiLogging("auth/login:GET", loginGet);
async function loginGet() {
  const url = getAuthorizationUrl();
  return NextResponse.redirect(url);
}
