import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie");
  const token = cookie?.split("token=")[1]?.split(";")[0];

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const organization = await prisma.organization.findFirst({
      where: { ownerId: decoded.id },
      select: { code: true, name: true },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (err) {
    console.error("Error fetching organization:", err);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
