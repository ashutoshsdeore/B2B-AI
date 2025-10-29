import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    console.log("🔥 [ACCEPT INVITE] route called");

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ success: false, error: "Missing invite token" }, { status: 400 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: "Missing JWT_SECRET" }, { status: 500 });
    }

    // Verify invite token
    const decoded = jwt.verify(token, secret) as { email: string; channelId: string };

    const invite = await prisma.channelInvite.findFirst({
      where: { channelId: decoded.channelId, inviteeEmail: decoded.email },
      include: { channel: true },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invite not found" }, { status: 404 });
    }

    // Logged-in user
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token")?.value;
    if (!tokenCookie) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userData = jwt.verify(tokenCookie, secret) as { id: string; email: string };

    if (userData.email !== invite.inviteeEmail) {
      return NextResponse.json({ success: false, error: "Invite does not belong to this user" }, { status: 403 });
    }

    // ✅ Ensure the user is part of the workspace
    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: userData.id,
          workspaceId: invite.channel.workspaceId,
        },
      },
      update: {},
      create: {
        userId: userData.id,
        workspaceId: invite.channel.workspaceId,
        role: "member",
      },
    });

    // ✅ Add user to the channel (if not already)
    await prisma.channelMember.upsert({
      where: {
        userId_channelId: {
          userId: userData.id,
          channelId: invite.channelId,
        },
      },
      update: {},
      create: {
        userId: userData.id,
        channelId: invite.channelId,
      },
    });

    // ✅ Mark invite as accepted
    await prisma.channelInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });

    const channel = await prisma.channel.findUnique({
      where: { id: invite.channelId },
      select: { id: true, name: true, workspaceId: true },
    });

    return NextResponse.json({
      success: true,
      message: `You have joined channel "${channel?.name}"`,
      channel,
    });

  } catch (err: any) {
    console.error("💥 Internal Server Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
