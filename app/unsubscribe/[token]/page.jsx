import { unsubscribeByToken } from "@/app/_actions";
import Link from "next/link";

export default async function AutoUnsubscribePage({ params }) {
  const { token } = await params;
  const result = await unsubscribeByToken(token);

  return (
    <div className="px-6 py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold">
              {result.success ? "Unsubscribed" : "Unsubscribed"}
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              {result.success ? "You have been successfully unsubscribed" : ""}
            </p>
          </div>

          <div className="space-y-4">
            {result.success ? (
              <>
                <p className="text-sm sm:text-base text-gray-500">
                  You will no longer receive emails from this mailing list.
                </p>
              </>
            ) : (
              <>
                <div className="font-medium text-gray-500">
                  You are already unsubscribed from this mailling list.
                </div>
                <p className="text-red-600 text-sm sm:text-base ">
                  If you are still receiving emails, please contact
                  cipdevries@ciprmt.com.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// "use client";
// import React, { useState } from "react";
// import { unsubscribeEmail } from "@/app/_actions";

// const UnsubscribePage = () => {
//   const [email, setEmail] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [unsubscribed, setUnsubscribed] = useState(false);

//   const handleChange = (e) => {
//     setEmail(e.target.value);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setLoading(true);
//     try {
//       await unsubscribeEmail(email);
//       setUnsubscribed(true);
//     } catch (error) {
//       console.error("Error unsubscribing:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (unsubscribed) {
//     return <p className="text-center mt-8">You have been unsubscribed.</p>;
//   }

//   return (
//     <div className="flex justify-center items-start min-h-screen p-4 mt-16">
//       <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
//         <h1 className="text-2xl font-bold mb-6 text-center">Unsubscribe</h1>
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div>
//             <label htmlFor="email" className="block text-lg font-medium mb-2">
//               Enter your email to unsubscribe:
//             </label>
//             <input
//               type="email"
//               id="email"
//               name="email"
//               value={email}
//               onChange={handleChange}
//               required
//               className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-gray-800 focus:border-gray-800"
//             />
//           </div>
//           <button
//             type="submit"
//             className={`btn w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-md shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-800 ${
//               loading ? "opacity-50 cursor-not-allowed" : ""
//             }`}
//             disabled={loading}
//           >
//             {loading ? (
//               <svg
//                 className="animate-spin h-5 w-5 text-white mx-auto"
//                 xmlns="http://www.w3.org/2000/svg"
//                 fill="none"
//                 viewBox="0 0 24 24"
//               >
//                 <circle
//                   className="opacity-25"
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                 ></circle>
//                 <path
//                   className="opacity-75"
//                   fill="currentColor"
//                   d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
//                 ></path>
//               </svg>
//             ) : (
//               "Unsubscribe"
//             )}
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default UnsubscribePage;
