"use server";

import { sql } from "@vercel/postgres";

export async function checkRateLimit(
  identifier,
  action,
  maxRequests,
  windowSeconds
) {
  try {
    if (!identifier) {
      identifier = "anonymous";
    }

    const userId = String(identifier);

    const now = new Date();
    const windowStart = new Date(now.getTime() - windowSeconds * 1000);

    console.log(`Checking rate limit for user ${userId} on action ${action}`);

    // First, ensure the rate_limits table exists
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS rate_limits (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          action TEXT NOT NULL,
          timestamp TIMESTAMP NOT NULL
        )
      `;
    } catch (tableError) {
      console.error("Error creating rate_limits table:", tableError);
      return true; // Allow the request to proceed if table creation fails
    }

    // Insert the current request
    try {
      await sql`
        INSERT INTO rate_limits (user_id, action, timestamp)
        VALUES (${userId}, ${action}, ${now})
      `;
    } catch (insertError) {
      console.error("Error inserting rate limit record:", insertError);
      return true; // Allow the request to proceed if insert fails
    }

    // Count recent requests
    let result;
    try {
      result = await sql`
        SELECT COUNT(*) as count
        FROM rate_limits
        WHERE user_id = ${userId}
          AND action = ${action}
          AND timestamp > ${windowStart}
      `;
    } catch (countError) {
      console.error("Error counting rate limit records:", countError);
      return true; // Allow the request to proceed if count fails
    }

    // With @vercel/postgres, results are in the rows property
    const count = Number.parseInt(result.rows[0].count);

    console.log(`User ${userId} has made ${count} requests in the last minute`);

    // Clean up old entries periodically
    try {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      await sql`
        DELETE FROM rate_limits
        WHERE timestamp < ${oneDayAgo}
      `;
    } catch (cleanupError) {
      console.error("Error cleaning up old rate limit records:", cleanupError);
      // Continue even if cleanup fails
    }

    // Check if rate limit exceeded
    if (count > maxRequests) {
      throw new Error(
        `Rate limit exceeded for ${action}. Please try again later.`
      );
    }

    return true;
  } catch (error) {
    console.error("Error in checkRateLimit:", error);
    if (error.message.includes("Rate limit exceeded")) {
      throw error;
    }
    // If there's an error with rate limiting, we'll allow the request to proceed
    return true;
  }
}

//mogodb
// import { getDatabase } from "@/app/lib/database/mongoDbConnection";

// export async function checkRateLimit(userId) {
//   const db = await getDatabase();
//   let rateLimitCollection;

//   try {
//     rateLimitCollection = await db.collection("ratelimits");
//   } catch (error) {
//     console.log("Collection does not exist, creating it now");
//     rateLimitCollection = await db.createCollection("ratelimits");
//   }

//   const now = new Date();
//   const windowMs = 60 * 1000; // 1 minute
//   const maxRequests = 10; // 10 requests per minute

//   try {
//     const result = await rateLimitCollection.findOneAndUpdate(
//       { userId: userId },
//       {
//         $push: {
//           requests: {
//             $each: [now],
//             $slice: -maxRequests,
//           },
//         },
//       },
//       { upsert: true, returnDocument: "after" }
//     );

//     if (!result) {
//       console.error("No document returned from findOneAndUpdate");
//       return true; // Allow the request to proceed
//     }

//     const recentRequests = result.requests.filter(
//       (date) => now - date < windowMs
//     );

//     console.log(
//       `User ${userId} has made ${recentRequests.length} requests in the last minute`
//     );

//     return recentRequests.length <= maxRequests;
//   } catch (error) {
//     console.error("Error in checkRateLimit:", error);
//     return true; // Allow the request to proceed in case of an error
//   }
// }
