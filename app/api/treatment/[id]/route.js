//database
import dbConnection from "./lib/database/dbconnection";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

export async function GET(req, context) {
  const { id } = context;
  console.log(id);

  const dbClient = await dbConnection;
  const db = await dbClient.db(process.env.DB_NAME);
  const treatment = await db.collection("treatments").findOne({ _id: id });
  return NextResponse.json(treatment);
}
