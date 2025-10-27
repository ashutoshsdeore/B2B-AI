// ==============================
// 📁 /app/api/channels/invites/accept/route.ts
// ==============================
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * ✅ POST — Accept a channel invite via token
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token)
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );

    // ✅ Verify token integrity
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    let payload: { email: string; channelId: string };
    try {
      payload = jwt.verify(token, secret) as { email: string; channelId: string };
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    // ✅ Get current user from cookie token (must match invite email)
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("token")?.value;
    if (!currentToken)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );

    let current: { id: string; email: string };
    try {
      current = jwt.verify(currentToken, secret) as { id: string; email: string };
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid auth token" },
        { status: 401 }
      );
    }

    // ✅ Ensure invite exists and is pending
    const invite = await prisma.channelInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Invite not found or already processed" },
        { status: 400 }
      );
    }

    // ✅ Ensure the invite email matches the current user’s email
    if (invite.inviteeEmail !== current.email) {
      return NextResponse.json(
        { success: false, error: "Invite not meant for this user" },
        { status: 403 }
      );
    }

    // ✅ Ensure user is not already a channel member
    const existingMember = await prisma.channelMember.findFirst({
      where: { userId: current.id, channelId: invite.channelId },
    });

    if (!existingMember) {
      await prisma.channelMember.create({
        data: {
          userId: current.id,
          channelId: invite.channelId,
        },
      });
    }

    // ✅ Mark invite as accepted
    await prisma.channelInvite.update({
      where: { token },
      data: { status: "accepted" },
    });

    return NextResponse.json({
      success: true,
      message: "Invite accepted successfully",
    });
  } catch (error) {
    console.error("❌ Accept channel invite error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
