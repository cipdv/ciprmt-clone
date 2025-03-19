// lib/auditLog.js

import { sql } from "@vercel/postgres";

export async function logAuditEvent({
  typeOfInfo,
  actionPerformed,
  accessedBy,
  whoseInfo,
  additionalDetails = {},
}) {
  // Create a combined object for additional details
  const allAdditionalDetails = {
    ...additionalDetails,
  };

  try {
    // Insert the audit log entry into PostgreSQL
    const { rows } = await sql`
      INSERT INTO electronic_audit_logs (
        type_of_info,
        action_performed,
        date_and_time,
        accessed_by,
        whose_info,
        additional_details
      ) VALUES (
        ${typeOfInfo},
        ${actionPerformed},
        NOW(),
        ${accessedBy || null},
        ${whoseInfo || null},
        ${JSON.stringify(allAdditionalDetails)}
      )
      RETURNING id
    `;

    console.log(`Audit log entry created with id: ${rows[0].id}`);
    return rows[0].id;
  } catch (error) {
    console.error("Error creating audit log entry:", error);
    throw error;
  }
}
