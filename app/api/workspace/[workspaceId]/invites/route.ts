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
 * ✅ GET — Fetch all invites for a specific workspace
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await context.params;
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Ensure the user is part of this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Fetch invites for that workspace
    const invites = await prisma.workspaceInvite.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
        inviter: { select: { firstName: true, lastName: true } },
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
  }
}

/**
 * ✅ POST — Send a new invite to a user via email
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const { workspaceId } = await context.params;
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

    // ✅ Check that the inviter is a workspace member
    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 }
      );
    }

    // ✅ Check if the invited user exists
    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Prevent duplicate membership
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: invitedUser.id },
    });
    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "User is already a member" },
        { status: 400 }
      );
    }

    // ✅ Prevent duplicate pending invites
    const existingInvite = await prisma.workspaceInvite.findFirst({
      where: { workspaceId, email, status: "pending" },
    });
    if (existingInvite) {
      return NextResponse.json(
        { success: false, error: "User already has a pending invite" },
        { status: 400 }
      );
    }

    // ✅ Create an invite token (valid 7 days)
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET!;
    const inviteToken = jwt.sign({ email, workspaceId }, secret, {
      expiresIn: "7d",
    });

    // ✅ Save invite in database
    const invite = await prisma.workspaceInvite.create({
      data: {
        email,
        token: inviteToken,
        workspaceId,
        inviterId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Invitation created successfully",
      invite,
    });
  } catch (error) {
    console.error("❌ Error creating invite:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
