// app/api/message/[Id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";
import { pusherServer } from "../../../lib/pusher";

// ✅ GET all messages for a channel
export async function GET(
  req: Request,
  { params }: { params: { Id: string } }
) {
  try {
    const channelId = params.Id;
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Ensure user is member
    const isMember = await prisma.channelMember.findFirst({
      where: { userId: user.id, channelId },
    });
    if (!isMember)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch messages
    const messages = await prisma.message.findMany({
      where: { channelId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("❌ Fetch messages error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { Id: string } }
) {
  try {
    const channelId = params.Id;
    const user = await getUserFromToken();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { content } = await req.json();
    if (!content?.trim())
      return NextResponse.json(
        { error: "Message cannot be empty" },
        { status: 400 }
      );

    // Ensure user is member or accepted invite
    const isMember = await prisma.channelMember.findFirst({
      where: { userId: user.id, channelId },
    });

    if (!isMember) {
      const invite = await prisma.channelInvite.findFirst({
        where: { channelId, inviteeEmail: user.email, status: "accepted" },
      });

      if (!invite)
        return NextResponse.json(
          { error: "Forbidden - Not a channel member" },
          { status: 403 }
        );

      await prisma.channelMember.create({
        data: { userId: user.id, channelId },
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: { content, channelId, userId: user.id },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Broadcast
    const payload = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      user: message.user,
    };

    await pusherServer.trigger(`channel-${channelId}`, "message-sent", payload);

    return NextResponse.json({ success: true, message: payload });
  } catch (error) {
    console.error("❌ Send message error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
