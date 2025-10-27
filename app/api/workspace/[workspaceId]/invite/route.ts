// app/api/workspace/[workspaceId]/invite/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // ✅ Await params first (Next.js 15 dynamic API fix)
    const { workspaceId } = await context.params;

    const { email } = await req.json();
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // ✅ Get JWT token from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }

    // ✅ Decode JWT
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret in env");

    let decoded: { id: string; email: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string; email: string };
    } catch (err) {
      console.error("JWT verification failed:", err);
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ✅ Find inviter (current user)
    const inviter = await prisma.user.findUnique({
      where: { id: decoded.id },
    });
    if (!inviter) {
      return NextResponse.json(
        { success: false, error: "Inviter not found" },
        { status: 404 }
      );
    }

    // ✅ Check if invited user exists
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return NextResponse.json(
        { success: false, error: "User with this email does not exist" },
        { status: 404 }
      );
    }

    // ✅ Check if already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { userId: invitedUser.id, workspaceId },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "User is already a member of this workspace" },
        { status: 400 }
      );
    }

    // ✅ Check for existing pending invite
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: { email, workspaceId, status: "pending" },
    });
    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: "User already has a pending invite" },
        { status: 400 }
      );
    }

    // ✅ Create unique invite token (7 days validity)
    const inviteToken = jwt.sign(
      { email, workspaceId },
      secret,
      { expiresIn: "7d" }
    );

    // ✅ Save invitation in DB
    const invite = await prisma.workspaceInvite.create({
      data: {
        email,
        token: inviteToken,
        workspaceId,
        inviterId: inviter.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invite,
    });
  } catch (error) {
    console.error("❌ Error sending invite:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
