import { NextResponse, type NextRequest } from "next/server";

// Auth is disabled — all routes are public
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
