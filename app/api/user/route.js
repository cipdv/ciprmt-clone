import { NextResponse } from "next/server";
import { getSession } from "@/app/_actions";
import { getDatabase } from "@/app/lib/database/dbconnection";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const db = await getDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(session.userId) });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Remove sensitive information
    delete user.password;

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
