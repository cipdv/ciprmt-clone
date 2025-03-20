import { sql } from "@vercel/postgres";
import { getClientIp } from "./getClientIp";

/**
 * Logs an audit event to the electronic_audit_logs table
 * @param {Object} params - The parameters for the audit log
 * @param {string} params.typeOfInfo - The type of information accessed (e.g., "user treatments")
 * @param {string} params.actionPerformed - The action performed (e.g., "viewed", "created", "updated", "deleted")
 * @param {string} params.accessedById - UUID of the user who accessed the information
 * @param {string} params.whoseInfoId - UUID of the user whose information was accessed
 * @param {string} [params.reasonForAccess] - The reason for accessing the information
 * @param {Object} [params.additionalDetails={}] - Additional details to store in JSON format
 * @returns {Promise<number|null>} - The ID of the created audit log entry, or null if an error occurred
 */
export async function logAuditEvent({
  typeOfInfo,
  actionPerformed,
  accessedById,
  whoseInfoId,
  reasonForAccess = "Not specified",
  additionalDetails = {},
}) {
  try {
    // Get client IP address using the utility function
    const ipAddress = getClientIp();

    // Rest of the function remains the same
    const enhancedDetails = {
      ...additionalDetails,
      timestamp: new Date().toISOString(),
    };

    const { rows } = await sql`
      INSERT INTO electronic_audit_logs (
        type_of_info,
        action_performed,
        date_and_time,
        accessed_by,
        whose_info,
        ip_address,
        reason_for_access,
        additional_details
      ) VALUES (
        ${typeOfInfo},
        ${actionPerformed},
        NOW(),
        ${accessedById},
        ${whoseInfoId},
        ${ipAddress},
        ${reasonForAccess},
        ${JSON.stringify(enhancedDetails)}::jsonb
      )
      RETURNING id
    `;

    console.log(`Audit log entry created with id: ${rows[0].id}`);
    return rows[0].id;
  } catch (error) {
    // Error handling remains the same
    console.error("Error creating audit log entry:", error);
    console.error("Error details:", {
      typeOfInfo,
      actionPerformed,
      accessedById: typeof accessedById,
      whoseInfoId: typeof whoseInfoId,
      reasonForAccess,
      additionalDetailsKeys: Object.keys(additionalDetails),
    });

    return null;
  }
}
