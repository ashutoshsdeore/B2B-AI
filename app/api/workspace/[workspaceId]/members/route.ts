export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * ✅ Helper: Extract and verify JWT from cookies
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
 * ✅ GET — Fetch all workspace members
 */
export async function GET(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // ✅ Await dynamic params (Next.js 15+ behavior)
    const { workspaceId } = await context.params;

    // ✅ Get logged-in user
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify membership
    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: user.id },
    });
    if (!membership) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    // ✅ Get all workspace members with user info
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.user.id,
        name: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim(),
        email: m.user.email,
        role: m.role,
      })),
    });
  } catch (error) {
    console.error("❌ Error fetching workspace members:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
