import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) return NextResponse.json({ success: false, error: "Missing token" }, { status: 400 });

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    // verify cookie auth
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("token")?.value;
    if (!currentToken) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let current: { id: string; email: string };
    try {
      current = jwt.verify(currentToken, secret) as { id: string; email: string };
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid auth token" }, { status: 401 });
    }

    const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ success: false, error: "Invite not found or not pending" }, { status: 400 });
    }

    // ensure invite belongs to current user
    if (invite.email !== current.email) {
      return NextResponse.json({ success: false, error: "Invite not meant for this user" }, { status: 403 });
    }

    await prisma.workspaceInvite.update({ where: { token }, data: { status: "rejected" } });

    return NextResponse.json({ success: true, inviteId: invite.id });
  } catch (error) {
    console.error("Reject invite error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
