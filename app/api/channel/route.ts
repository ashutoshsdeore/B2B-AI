export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

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
 * ✅ POST — Create a new channel
 */
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { name, workspaceId } = await req.json();

    if (!name || !workspaceId) {
      return NextResponse.json(
        { success: false, error: "Channel name and workspaceId are required" },
        { status: 400 }
      );
    }

    // ✅ Auto-generate a unique slug
    const baseSlug = name.toLowerCase().replace(/\s+/g, "-");
    const uniqueSuffix = Math.random().toString(36).substring(2, 8);
    const slug = `${baseSlug}-${uniqueSuffix}`;

    // ✅ Create new channel (removed createdById)
    const channel = await prisma.channel.create({
      data: {
        name,
        slug,
        workspaceId,
      },
    });

    // ✅ Add creator as channel member
    await prisma.channelMember.create({
      data: {
        channelId: channel.id,
        userId: user.id,
      },
    });

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    console.error("❌ Error creating channel:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✅ GET — Fetch all channels for a workspace
 */
export async function GET(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId query param is required" },
        { status: 400 }
      );
    }

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId,
        members: { some: { userId: user.id } },
      },
      include: {
        members: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, channels });
  } catch (error) {
    console.error("❌ Error fetching channels:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
