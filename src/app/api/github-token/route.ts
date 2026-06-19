import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const client = await clerkClient();
  const { data } = await client.users.getUserOauthAccessToken(userId, "github");

  const token = data[0]?.token;
  if (!token) {
    return NextResponse.json(
      { error: "GitHub not connected. Please link your GitHub account in Clerk." },
      { status: 400 }
    );
  }

  return NextResponse.json({ token });
}
