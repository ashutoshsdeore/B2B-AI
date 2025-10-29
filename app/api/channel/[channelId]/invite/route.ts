import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

/**
 * 🔐 Helper — Get and verify user from token
 */
async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    const decoded = jwt.verify(token, secret) as { id: string };
    return prisma.user.findUnique({ where: { id: decoded.id } });
  } catch (error) {
    console.error("❌ Token validation failed:", error);
    return null;
  }
}

/**
 * ✅ POST — Accept channel invite
 */
export async function POST(req: Request) {
  try {
    console.log("🔥 [ACCEPT INVITE] route called");

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token)
      return NextResponse.json({ success: false, error: "Missing invite token" }, { status: 400 });

    const secret = process.env.JWT_SECRET;
    if (!secret)
      return NextResponse.json({ success: false, error: "Missing JWT_SECRET" }, { status: 500 });

    // 🔹 Verify invite token
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid or expired invite token" }, { status: 400 });
    }

    // 🔹 Find the invite
    const invite = await prisma.channelInvite.findFirst({
      where: { channelId: decoded.channelId, inviteeEmail: decoded.email },
      include: { channel: true },
    });

    if (!invite)
      return NextResponse.json({ success: false, error: "Invite not found" }, { status: 404 });

    // 🔹 Get logged-in user
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    if (!tokenCookie?.value)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const userData = jwt.verify(tokenCookie.value, secret) as { id: string; email: string };

    if (userData.email !== invite.inviteeEmail)
      return NextResponse.json({ success: false, error: "Invite does not belong to this user" }, { status: 403 });

    // 🔹 Add user to the channel
    const existingMember = await prisma.channelMember.findFirst({
      where: { userId: userData.id, channelId: invite.channelId },
    });

    if (!existingMember) {
      await prisma.channelMember.create({
        data: { userId: userData.id, channelId: invite.channelId },
      });
    }

    // ✅ Ensure user is part of workspace
    const channel = await prisma.channel.findUnique({
      where: { id: invite.channelId },
      select: { id: true, name: true, workspaceId: true },
    });

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId: userData.id, workspaceId: channel!.workspaceId },
    });

    if (!workspaceMember) {
      await prisma.workspaceMember.create({
        data: {
          userId: userData.id,
          workspaceId: channel!.workspaceId,
          role: "member",
        },
      });
    }

    // 🔹 Mark invite as accepted
    await prisma.channelInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });

    console.log("🎉 Invite accepted successfully!");
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

/**
 * ✅ GET — Get all invites for a specific channel
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    if (!channelId)
      return NextResponse.json({ success: false, error: "Missing channelId" }, { status: 400 });

    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const isMember = await prisma.channelMember.findFirst({
      where: { channelId, userId: user.id },
    });

    if (!isMember)
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });

    const invites = await prisma.channelInvite.findMany({
      where: { channelId },
      include: {
        inviter: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("❌ Error fetching invites:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
