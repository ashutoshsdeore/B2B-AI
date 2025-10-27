import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// ✅ Helper — verify token from cookies
async function getUserFromToken(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      ?.find((c) => c.trim().startsWith("token="))
      ?.split("=")[1];

    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    return user;
  } catch (error) {
    console.error("JWT validation error:", error);
    return null;
  }
}

// ✅ GET — Fetch all workspaces for current user (owned or member)
export async function GET(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, workspaces });
  } catch (err) {
    console.error("Error fetching workspaces:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// ✅ POST — Create new workspace and add creator as a member
export async function POST(req: Request) {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ error: "Workspace name is required" }, { status: 400 });
    }

    const organization = await prisma.organization.findFirst({
      where: { ownerId: user.id },
    });

    const workspace = await prisma.workspace.create({
      data: {
        name: name.trim(),
        color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`,
        ownerId: user.id,
        organizationId: organization?.id || null,
      },
    });

    // 🧩 Add the creator as a member (OWNER role)
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role: "OWNER",
      },
    });

    return NextResponse.json({ success: true, workspace });
  } catch (err) {
    console.error("Error creating workspace:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
