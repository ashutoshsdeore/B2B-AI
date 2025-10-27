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

    // verify token signature (also used when created)
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    let payload: { email: string; workspaceId: string };
    try {
      payload = jwt.verify(token, secret) as { email: string; workspaceId: string };
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid or expired token" }, { status: 400 });
    }

    // get current user from cookie JWT to ensure they are the invitee
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("token")?.value;
    if (!currentToken) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    let current: { id: string; email: string };
    try {
      current = jwt.verify(currentToken, secret) as { id: string; email: string };
    } catch (err) {
      return NextResponse.json({ success: false, error: "Invalid auth token" }, { status: 401 });
    }

    // ensure invite exists and is pending
    const invite = await prisma.workspaceInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json({ success: false, error: "Invite not found or not pending" }, { status: 400 });
    }

    // ensure the invite email matches the current user's email
    if (invite.email !== current.email) {
      return NextResponse.json({ success: false, error: "Invite not meant for this user" }, { status: 403 });
    }

    // ensure user is not already a member
    const existing = await prisma.workspaceMember.findFirst({
      where: { userId: current.id, workspaceId: invite.workspaceId },
    });
    if (!existing) {
      await prisma.workspaceMember.create({
        data: { userId: current.id, workspaceId: invite.workspaceId, role: "member" },
      });
    }

    // update invite status
    await prisma.workspaceInvite.update({ where: { token }, data: { status: "accepted" } });

    return NextResponse.json({ success: true, inviteId: invite.id });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
