import { getDatabase } from "@/app/lib/database/mongoDbConnection";

export async function checkRateLimit(userId) {
  const db = await getDatabase();
  let rateLimitCollection;

  try {
    rateLimitCollection = await db.collection("ratelimits");
  } catch (error) {
    console.log("Collection does not exist, creating it now");
    rateLimitCollection = await db.createCollection("ratelimits");
  }

  const now = new Date();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10; // 10 requests per minute

  try {
    const result = await rateLimitCollection.findOneAndUpdate(
      { userId: userId },
      {
        $push: {
          requests: {
            $each: [now],
            $slice: -maxRequests,
          },
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    if (!result) {
      console.error("No document returned from findOneAndUpdate");
      return true; // Allow the request to proceed
    }

    const recentRequests = result.requests.filter(
      (date) => now - date < windowMs
    );

    console.log(
      `User ${userId} has made ${recentRequests.length} requests in the last minute`
    );

    return recentRequests.length <= maxRequests;
  } catch (error) {
    console.error("Error in checkRateLimit:", error);
    return true; // Allow the request to proceed in case of an error
  }
}
