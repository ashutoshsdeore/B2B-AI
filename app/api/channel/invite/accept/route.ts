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

    // 🔹 Verify invite token
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json({ success: false, error: "Invalid or expired invite token" }, { status: 400 });
    }

    // 🔹 Find the invite
    const invite = await prisma.channelInvite.findFirst({
      where: {
        channelId: decoded.channelId,
        inviteeEmail: decoded.email,
      },
      include: { channel: true },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: "Invite not found" }, { status: 404 });
    }

    // 🔹 Get logged-in user
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token");
    if (!tokenCookie?.value) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userData = jwt.verify(tokenCookie.value, secret) as { id: string; email: string };

    if (userData.email !== invite.inviteeEmail) {
      return NextResponse.json({ success: false, error: "Invite does not belong to this user" }, { status: 403 });
    }

    // 🔹 Add user to the channel (avoid duplicates)
    const existingMember = await prisma.channelMember.findFirst({
      where: { userId: userData.id, channelId: invite.channelId },
    });

    if (!existingMember) {
      await prisma.channelMember.create({
        data: {
          userId: userData.id,
          channelId: invite.channelId,
        },
      });
    }

    // 🔹 Update invite status
    await prisma.channelInvite.update({
      where: { id: invite.id },
      data: { status: "accepted" },
    });

    // 🔹 Fetch channel info (to update sidebar)
    const channel = await prisma.channel.findUnique({
      where: { id: invite.channelId },
      select: {
        id: true,
        name: true,
        workspaceId: true,
      },
    });

    console.log("🎉 Invite accepted successfully!");
    return NextResponse.json({
      success: true,
      message: `You have joined channel "${channel?.name}"`,
      channel,
    });

  } catch (err: any) {
    console.error("💥 Internal Server Error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
