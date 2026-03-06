import { NextResponse } from "next/server";

import { auth0 } from "@/lib/auth0";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const session = await auth0.getSession();

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: noStoreHeaders,
      },
    );
  }

  try {
    const { token, expiresAt } = await auth0.getAccessToken();

    return NextResponse.json(
      {
        token,
        expires_at: expiresAt,
      },
      {
        headers: noStoreHeaders,
      },
    );
  } catch (error) {
    console.error("[auth/access-token] Failed to get access token", error);

    return NextResponse.json(
      { error: "Failed to retrieve access token" },
      {
        status: 500,
        headers: noStoreHeaders,
      },
    );
  }
}
