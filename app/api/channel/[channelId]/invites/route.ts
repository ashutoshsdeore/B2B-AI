export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { pusherServer } from "../../../../lib/pusher";

const prisma = new PrismaClient();

/**
 * ✅ Helper — Extract current user from cookie token
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
 * ✅ GET — Fetch all invites for a channel
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await context.params;
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: true },
    });
    if (!channel)
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });

    const isWorkspaceMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: channel.workspaceId, userId: user.id },
    });
    const isChannelMember = await prisma.channelMember.findFirst({
      where: { channelId, userId: user.id },
    });

    if (!isWorkspaceMember && !isChannelMember)
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });

    const invites = await prisma.channelInvite.findMany({
      where: { channelId },
      select: {
        id: true,
        inviteeEmail: true,
        status: true,
        createdAt: true,
        inviter: { select: { firstName: true, lastName: true, email: true, id: true } },
        channel: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("❌ Error fetching channel invites:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✅ POST — Create a channel invite
 * Adds invited user to workspace + (optionally) as pending channel member
 * Broadcasts to invited user via Pusher
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  try {
    const { channelId } = await context.params;
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const email = body.email ?? body.inviteeEmail;
    if (!email || !email.includes("@"))
      return NextResponse.json({ success: false, error: "Valid email required" }, { status: 400 });

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: true },
    });
    if (!channel)
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });

    // ✅ Ensure inviter has workspace access
    const inviterMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: channel.workspaceId, userId: user.id },
    });
    if (!inviterMember)
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser)
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

    // ✅ Prevent duplicates
    const existingMember = await prisma.channelMember.findFirst({
      where: { userId: invitedUser.id, channelId },
    });
    if (existingMember)
      return NextResponse.json({ success: false, error: "Already a member" }, { status: 400 });

    const existingInvite = await prisma.channelInvite.findFirst({
      where: { inviteeEmail: email, channelId, status: "pending" },
    });
    if (existingInvite)
      return NextResponse.json({ success: false, error: "Already invited" }, { status: 400 });

    // ✅ Create token
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!;
    const inviteToken = jwt.sign({ email, channelId }, secret, { expiresIn: "7d" });

    // ✅ Save invite
    const invite = await prisma.channelInvite.create({
      data: {
        channelId,
        inviterId: user.id,
        inviteeEmail: email,
        token: inviteToken,
      },
    });

    // ✅ Ensure invited user is in workspace
    await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: invitedUser.id,
          workspaceId: channel.workspaceId,
        },
      },
      update: {},
      create: {
        userId: invitedUser.id,
        workspaceId: channel.workspaceId,
        role: "guest",
      },
    });

    // ✅ Add pending channel membership
    await prisma.channelMember.create({
      data: {
        userId: invitedUser.id,
        channelId,
        isPendingInvite: true, // requires schema update
      },
    });

    // 🔔 Notify invited user via Pusher
    await pusherServer.trigger(`private-user-${invitedUser.id}`, "workspace:invite", {
      workspace: {
        id: channel.workspace.id,
        name: channel.workspace.name,
        color: channel.workspace.color ?? "#1f6feb",
      },
      channel: {
        id: channel.id,
        name: channel.name,
        slug: channel.slug,
      },
      invite: {
        id: invite.id,
        email: invite.inviteeEmail,
        token: invite.token,
        status: invite.status,
      },
      message: `You were invited to ${channel.name} in ${channel.workspace.name}`,
    });

    // 🔔 Notify workspace (optional — for inviter feedback)
    await pusherServer.trigger(`workspace-${channel.workspaceId}`, "invite:sent", {
      invitedEmail: email,
      channelId,
      inviterId: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Invite created successfully",
      invite,
    });
  } catch (error) {
    console.error("❌ Error creating invite:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
