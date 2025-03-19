// import { NextResponse } from "next/server";
// import { getSession } from "@/app/_actions";
// import { getDatabase } from "@/app/lib/database/mongoDbConnection";
// import { ObjectId } from "mongodb";

// export async function GET({ params }) {
//   const session = await getSession();
//   const locationId = params.id;

//   if (!session) {
//     return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
//   }

//   try {
//     const db = await getDatabase();
//     const location = await db
//       .collection("rmtLocations")
//       .findOne({ _id: new ObjectId(locationId) });

//     if (!location) {
//       return NextResponse.json({ error: "User not found" }, { status: 404 });
//     }

//     console.log(location);

//     return NextResponse.json(location);
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//     return NextResponse.json(
//       { error: "Internal server error" },
//       { status: 500 }
//     );
//   }
// }
