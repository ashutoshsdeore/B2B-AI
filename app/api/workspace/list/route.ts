import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// ✅ Helper function to extract and verify token from cookies
async function getUserFromCookies(req: Request) {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return null;

  const token = cookieHeader
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.split("=")[1];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
    };
    return decoded;
  } catch (error) {
    console.error("JWT verification failed:", error);
    return null;
  }
}

// ✅ Fetch all workspaces for logged-in user
export async function GET(req: Request) {
  try {
    const decoded = await getUserFromCookies(req);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: decoded.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, workspaces });
  } catch (err: any) {
    console.error("Error fetching workspaces:", err);
    if (err.name === "JsonWebTokenError") {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Create a new workspace for logged-in user
export async function POST(req: Request) {
  try {
    const decoded = await getUserFromCookies(req);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Workspace name is required" },
        { status: 400 }
      );
    }

    // Optional: Random color for workspace icon
    const color = `hsl(${Math.random() * 360}, 70%, 50%)`;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        color,
        ownerId: decoded.id,
      },
    });

    return NextResponse.json({ success: true, workspace });
  } catch (err: any) {
    console.error("Error creating workspace:", err);
    if (err.name === "JsonWebTokenError") {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
