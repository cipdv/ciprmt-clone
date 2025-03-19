"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { searchUsers } from "@/app/_actions";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const searchResults = await searchUsers(query);
      console.log(searchResults);
      setResults(searchResults);
    } catch (error) {
      console.error("Error searching users:", error);
      setError(error.message || "An error occurred while searching users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResultClick = (userId) => {
    router.push(`/dashboard/rmt/client-profile/${userId}`);
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-xl font-semibold mb-4">Search Clients</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users..."
            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            type="submit"
            className="ml-4 px-4 py-2 bg-buttons text-white rounded-md hover:bg-buttonsHover focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
          >
            {isLoading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {results.length > 0 && (
        <ul className="bg-white border border-gray-300 rounded-md shadow-sm">
          {results.map((user) => (
            <li
              key={user.id}
              onClick={() => handleResultClick(user.id)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              <div className="font-semibold">{user.name}</div>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-sm text-gray-600">{user.phoneNumber}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
