import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

/**
 * Accept a workspace invite (by the invited user)
 * PATCH /api/workspace/[workspaceId]/invite/accept
 */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    // ✅ Await params (Next.js 15+)
    const { workspaceId } = await context.params;

    // ✅ Use correct cookie name
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("Missing JWT_SECRET");

    // ✅ Verify JWT
    let decoded: { id: string; email: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string; email: string };
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // ✅ Parse body
    const { inviteId } = await req.json();
    if (!inviteId) {
      return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
    }

    // ✅ Find invite
    const invite = await prisma.workspaceInvite.findUnique({ where: { id: inviteId } });
    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // ✅ Validate invite details
    if (invite.status !== "pending") {
      return NextResponse.json({ error: "Invite already processed" }, { status: 400 });
    }

    if (invite.email !== decoded.email) {
      return NextResponse.json(
        { error: "You are not authorized to accept this invite" },
        { status: 403 }
      );
    }

    if (invite.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: "Invite does not belong to this workspace" },
        { status: 400 }
      );
    }

    // ✅ Prevent duplicate membership
    const alreadyMember = await prisma.workspaceMember.findFirst({
      where: { userId: decoded.id, workspaceId },
    });

    if (alreadyMember) {
      return NextResponse.json(
        { error: "Already a member of this workspace" },
        { status: 400 }
      );
    }

    // ✅ Add user to workspace
    await prisma.workspaceMember.create({
      data: {
        userId: decoded.id,
        workspaceId,
        role: "member",
      },
    });

    // ✅ Update invite status
    await prisma.workspaceInvite.update({
      where: { id: inviteId },
      data: { status: "accepted" },
    });

    return NextResponse.json({ success: true, message: "Invite accepted successfully!" });
  } catch (error) {
    console.error("❌ PATCH /api/workspace/[id]/invite/accept error:", error);
    return NextResponse.json({ error: "Failed to accept invite" }, { status: 500 });
  }
}
