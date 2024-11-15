// lib/auditLog.js

import { getDatabase } from "@/app/lib/database/mongoDbConnection";
import { ObjectId } from "mongodb";

export async function logAuditEvent({
  typeOfInfo,
  actionPerformed,
  accessedBy,
  whoseInfo,
  additionalDetails = {},
}) {
  const db = await getDatabase();
  const auditLogsCollection = db.collection("electronicauditlogs");

  const logEntry = {
    typeOfInfo,
    actionPerformed,
    dateAndTime: new Date(),
    accessedBy,
    whoseInfo,
    ...additionalDetails,
  };

  try {
    const result = await auditLogsCollection.insertOne(logEntry);
    console.log(`Audit log entry created with id: ${result.insertedId}`);
    return result.insertedId;
  } catch (error) {
    console.error("Error creating audit log entry:", error);
    throw error;
  }
}
