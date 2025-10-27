export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * ✅ Helper: extract and verify JWT token from cookie
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
 * ✅ GET — Fetch all workspaces for the logged-in user
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

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      include: {
        channels: true,
        members: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, workspaces });
  } catch (err) {
    console.error("❌ Error fetching workspaces:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * ✅ POST — Create a new workspace
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // ✅ Find or create organization
    let organization = await prisma.organization.findFirst({
      where: { ownerId: user.id },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: `${user.firstName || "User"}'s Organization`,
          code: `org_${Math.random().toString(36).substring(2, 8)}`,
          ownerId: user.id,
        },
      });
    }

    // ✅ Create workspace
    const workspace = await prisma.workspace.create({
      data: {
        name,
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        ownerId: user.id,
        organizationId: organization.id,
      },
    });

    // ✅ Add creator as owner member
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "owner",
      },
    });

    return NextResponse.json({ success: true, workspace });
  } catch (err) {
    console.error("❌ Error creating workspace:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
