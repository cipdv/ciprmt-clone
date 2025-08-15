import { headers } from "next/headers";

/**
 * Gets the client IP address from request headers
 * @returns {string} The client IP address or 'Unknown'
 */
export async function getClientIp() {
  try {
    const headersList = await headers();
    // Try x-forwarded-for first (common with proxies/load balancers)
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      // Get the first IP in the list (client's original IP)
      return forwardedFor.split(",")[0].trim();
    }

    // Try other common headers
    return (
      headersList.get("x-real-ip") ||
      headersList.get("cf-connecting-ip") || // Cloudflare
      headersList.get("true-client-ip") || // Akamai and Cloudflare
      "Unknown"
    );
  } catch (error) {
    console.error("Error getting client IP:", error);
    return "Unknown";
  }
}

// import { headers } from "next/headers";

// /**
//  * Gets the client IP address from request headers
//  * @returns {string} The client IP address or 'Unknown'
//  */
// export function getClientIp() {
//   try {
//     const headersList = headers();
//     // Try x-forwarded-for first (common with proxies/load balancers)
//     const forwardedFor = headersList.get("x-forwarded-for");
//     if (forwardedFor) {
//       // Get the first IP in the list (client's original IP)
//       return forwardedFor.split(",")[0].trim();
//     }

//     // Try other common headers
//     return (
//       headersList.get("x-real-ip") ||
//       headersList.get("cf-connecting-ip") || // Cloudflare
//       headersList.get("true-client-ip") || // Akamai and Cloudflare
//       "Unknown"
//     );
//   } catch (error) {
//     console.error("Error getting client IP:", error);
//     return "Unknown";
//   }
// }
