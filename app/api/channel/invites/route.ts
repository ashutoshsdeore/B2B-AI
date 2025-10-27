export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * ✅ Helper to get user from JWT cookie
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
 * ✅ GET — Fetch all channel invites for the logged-in user
 */
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Fetch pending invites sent to this user’s email
    const invites = await prisma.channelInvite.findMany({
      where: {
        inviteeEmail: user.email,
        status: "pending",
      },
      select: {
        id: true,
        inviteeEmail: true,
        status: true,
        createdAt: true,
        token: true,
        channel: {
          select: {
            id: true,
            name: true,
            workspace: { select: { id: true, name: true } },
          },
        },
        inviter: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("❌ Error fetching channel invites:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch channel invites" },
      { status: 500 }
    );
  }
}
