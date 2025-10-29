// app/api/workspace/invite/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }

    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    let decoded: { id: string; email: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string; email: string };
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ✅ Fetch pending invites for this user
    const invites = await prisma.workspaceInvite.findMany({
      where: { email: decoded.email, status: "pending" },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            color: true,
            channels: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        inviter: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // ✅ Return workspaces as “preview” data
    const pendingWorkspaces = invites.map((invite) => ({
      inviteId: invite.id,
      workspaceId: invite.workspace.id,
      workspaceName: invite.workspace.name,
      color: invite.workspace.color,
      inviter: invite.inviter,
      channels: invite.workspace.channels,
      status: invite.status,
    }));

    return NextResponse.json({
      success: true,
      pendingWorkspaces,
    });
  } catch (error) {
    console.error("❌ Error fetching invites:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
