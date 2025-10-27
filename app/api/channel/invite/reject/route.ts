import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing token" },
        { status: 400 }
      );
    }


    const invite = await prisma.channelInvite.findUnique({ where: { token } });
    if (!invite || invite.status !== "pending") {
      return NextResponse.json(
        { success: false, error: "Invite not found or already processed" },
        { status: 404 }
      );
    }

    await prisma.channelInvite.update({
      where: { token },
      data: { status: "rejected" },
    });

    return NextResponse.json({
      success: true,
      message: "Invite rejected successfully.",
    });
  } catch (error) {
    console.error("❌ Error rejecting invite:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
