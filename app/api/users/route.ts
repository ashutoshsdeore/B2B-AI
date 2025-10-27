import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const prisma = new PrismaClient();

export async function GET() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let dbUser = await prisma.user.findUnique({ where: { email: user.email } });

  if (!dbUser) {
    dbUser = await prisma.user.create({
      data: {
        email: user.email,
        firstName: user.given_name || "",
        lastName: user.family_name || "",
      },
    });
  }

  return NextResponse.json(dbUser);
}
