export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";

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
 * ✅ POST — Send a channel invite
 */
export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { channelId } = params;
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { inviteeEmail } = await req.json();

    if (!inviteeEmail || !inviteeEmail.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid invitee email is required" },
        { status: 400 }
      );
    }

    // ✅ Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: true },
    });

    if (!channel) {
      return NextResponse.json({ success: false, error: "Channel not found" }, { status: 404 });
    }

    // ✅ Ensure inviter is a member of the channel
    const isMember = await prisma.channelMember.findFirst({
      where: { channelId, userId: user.id },
    });

    if (!isMember) {
      return NextResponse.json(
        { success: false, error: "You are not a member of this channel" },
        { status: 403 }
      );
    }

    // ✅ Prevent duplicate pending invites
    const existingInvite = await prisma.channelInvite.findFirst({
      where: {
        channelId,
        inviteeEmail,
        status: "pending",
      },
    });

    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: "An invite already exists for this email" },
        { status: 400 }
      );
    }

    // ✅ Create invite token (valid for 7 days)
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!;
    const token = jwt.sign(
      { email: inviteeEmail, channelId },
      secret,
      { expiresIn: "7d" }
    );

    // ✅ Save invite to DB
    const invite = await prisma.channelInvite.create({
      data: {
        channelId,
        inviterId: user.id,
        inviteeEmail,
        token,
      },
    });

    return NextResponse.json({ success: true, invite });
  } catch (error) {
    console.error("❌ Error sending channel invite:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✅ GET — Get all invites for a specific channel
 */
export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { channelId } = params;
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify user has access to channel
    const isMember = await prisma.channelMember.findFirst({
      where: { channelId, userId: user.id },
    });

    if (!isMember) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // ✅ Fetch invites for that channel
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
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
