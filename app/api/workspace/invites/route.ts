export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

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

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // ✅ Find invites that match this user’s email and are pending
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        email: user.email,
        status: "PENDING",
      },
      select: {
        id: true,
        email: true,
        status: true,
        createdAt: true,
        workspace: { select: { id: true, name: true } },
        inviter: { select: { firstName: true, lastName: true, email: true } },
        token: true, // ✅ Include token for accept/reject
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, invites });
  } catch (error) {
    console.error("❌ Error fetching user invites:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}
