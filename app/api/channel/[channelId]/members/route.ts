import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

export async function GET(
  req: Request,
  context: { params: Promise<{ channelId: string }> }
) {
  const { channelId } = await context.params; // ✅ FIXED
  const user = await getUserFromToken();

  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const members = await prisma.channelMember.findMany({
      where: { channelId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });

    return NextResponse.json({
      success: true,
      members: members.map((m) => ({
        id: m.user.id,
        name: `${m.user.firstName} ${m.user.lastName}`,
        email: m.user.email,
      })),
    });
  } catch (error) {
    console.error("Fetch channel members error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
