// app/api/workspace/invites/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // ✅ Get JWT from cookies
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Missing token" },
        { status: 401 }
      );
    }

    // ✅ Decode token
    const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) throw new Error("Missing JWT secret");

    let decoded: { id: string; email: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string; email: string };
    } catch (err) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // ✅ Fetch all invites sent TO this user (pending only)
    const invites = await prisma.workspaceInvite.findMany({
      where: {
        email: decoded.email,
        status: "pending",
      },
      include: {
        workspace: { select: { id: true, name: true } },
        inviter: { select: { firstName: true, lastName: true, email: true } },
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
