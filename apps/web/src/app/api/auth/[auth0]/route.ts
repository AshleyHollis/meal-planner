import { NextRequest } from "next/server";
import { auth0 } from "@/lib/auth0";

// Auth0 v4 handles auth routes via middleware (src/middleware.ts).
// This route handler delegates to the same Auth0Client for requests
// that reach /api/auth/* directly.
async function handler(request: NextRequest) {
  return auth0.middleware(request);
}

export const GET = handler;
export const POST = handler;
