import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";
import { getUserFromToken } from "../../lib/auth";
import { pusherServer } from "../../lib/pusher";

export async function POST(req: Request) {
  try {
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { channelId, content } = await req.json();
    if (!channelId || !content)
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    // Check membership
    const isMember = await prisma.channelMember.findFirst({
      where: { userId: user.id, channelId },
    });
    if (!isMember)
      return NextResponse.json(
        { error: "You are not a member of this channel" },
        { status: 403 }
      );

    // Create message
    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId: user.id,
      },
      include: { user: true },
    });

    // Clean broadcast
    const payload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      user: {
        firstName: message.user.firstName,
        lastName: message.user.lastName,
      },
    };

    console.log("🔊 Broadcasting to:", `channel-${channelId}`);
    await pusherServer.trigger(`channel-${channelId}`, "message-sent", payload);

    return NextResponse.json({ success: true, message: payload });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
