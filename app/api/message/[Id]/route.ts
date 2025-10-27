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
const { Id: channelId } = params;
const user = await getUserFromToken();
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const isMember = await prisma.channelMember.findFirst({
  where: { userId: user.id, channelId },
});
if (!isMember)
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });

const messages = await prisma.message.findMany({
  where: { channelId },
  include: { user: true },
  orderBy: { createdAt: "asc" },
});

return NextResponse.json({ success: true, messages });

} catch (error) {
console.error("Fetch messages error:", error);
return NextResponse.json(
{ error: "Internal Server Error" },
{ status: 500 }
);
}
}

// ✅ POST new message and broadcast via Pusher
export async function POST(
req: Request,
{ params }: { params: { Id: string } }
) {
try {
const { Id: channelId } = params;
const user = await getUserFromToken();
if (!user)
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });


const { content } = await req.json();
if (!content?.trim())
  return NextResponse.json(
    { error: "Message cannot be empty" },
    { status: 400 }
  );

// Ensure user is a member
const isMember = await prisma.channelMember.findFirst({
  where: { userId: user.id, channelId },
});
if (!isMember)
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });

// ✅ Create message correctly
const message = await prisma.message.create({
  data: {
    content,
    channelId,
    userId: user.id,
  },
  include: { user: true },
});

// ✅ Broadcast via Pusher
const payload = {
  id: message.id,
  content: message.content,
  createdAt: message.createdAt.toISOString(),
  user: {
    id: message.user.id,
    firstName: message.user.firstName,
    lastName: message.user.lastName,
  },
};

await pusherServer.trigger(`channel-${channelId}`, "message-sent", payload);
console.log("✅ Pusher broadcast ->", `channel-${channelId}`, payload);

return NextResponse.json({ success: true, message: payload });


} catch (error) {
console.error("Send message error:", error);
return NextResponse.json(
{ error: "Internal Server Error" },
{ status: 500 }
);
}
}
