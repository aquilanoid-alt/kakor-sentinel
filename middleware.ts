import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isLoopbackAlias(hostname: string) {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const hostname = url.hostname;

  if (!isLoopbackAlias(hostname)) {
    return NextResponse.next();
  }

  if (hostname === "127.0.0.1") {
    url.hostname = "localhost";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons|manifest.webmanifest).*)"]
};
