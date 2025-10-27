export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * ✅ Helper: Get and verify user from JWT cookie
 */
async function getUserFromToken() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    const decoded = jwt.verify(token, secret) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    return user;
  } catch (error) {
    console.error("❌ Token validation failed:", error);
    return null;
  }
}

/**
 * ✅ GET — Fetch all invites for a specific channel
 */
export async function GET(
  req: Request,
  context: { params: { channelId: string } } // ✅ FIXED
) {
  try {
    const { channelId } = context.params; // ✅ FIXED
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: true },
    });

    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 }
      );
    }

    // ✅ Check both workspace and channel membership
    const isWorkspaceMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId: channel.workspaceId, userId: user.id },
    });

    const isChannelMember = await prisma.channelMember.findFirst({
      where: { channelId, userId: user.id },
    });

    if (!isWorkspaceMember && !isChannelMember) {
      return NextResponse.json(
        {
          success: false,
          error: "Access denied: not a member of this workspace or channel",
        },
        { status: 403 }
      );
    }

    const invites = await prisma.channelInvite.findMany({
      where: { channelId },
      select: {
        id: true,
        inviteeEmail: true,
        status: true,
        createdAt: true,
        inviter: { select: { firstName: true, lastName: true } },
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
 * ✅ POST — Send a new channel invite to a user
 */
export async function POST(
  req: Request,
  context: { params: { channelId: string } } // ✅ FIXED
) {
  try {
    const { channelId } = context.params; // ✅ FIXED
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // ✅ Verify channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: true },
    });
    if (!channel) {
      return NextResponse.json(
        { success: false, error: "Channel not found" },
        { status: 404 }
      );
    }

    // ✅ Ensure inviter belongs to the same workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: channel.workspaceId, userId: user.id },
    });
    if (!member) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Check invited user exists
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Prevent duplicate membership
    const existingMember = await prisma.channelMember.findFirst({
      where: { userId: invitedUser.id, channelId },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this channel" },
        { status: 400 }
      );
    }

    // ✅ Prevent duplicate pending invites
    const existingInvite = await prisma.channelInvite.findFirst({
      where: { inviteeEmail: email, channelId, status: "pending" },
    });
    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: "User already has a pending invite" },
        { status: 400 }
      );
    }

    // ✅ Create invite token (valid for 7 days)
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!;
    const inviteToken = jwt.sign({ email, channelId }, secret, {
      expiresIn: "7d",
    });

    // ✅ Save invite to DB
    const invite = await prisma.channelInvite.create({
      data: {
        channelId,
        inviterId: user.id,
        inviteeEmail: email,
        token: inviteToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Channel invitation created successfully",
      invite,
    });
  } catch (error) {
    console.error("❌ Error creating channel invite:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
