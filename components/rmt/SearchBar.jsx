"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchUsers } from "@/app/_actions";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  const router = useRouter();
  const searchContainerRef = useRef(null);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (trimmedQuery.length < 2) {
        setResults([]);
        setIsLoading(false);
        setError(null);
        setIsResultsOpen(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const searchResults = await searchUsers(trimmedQuery);
        setResults(searchResults || []);
        setIsResultsOpen(true);
      } catch (searchError) {
        console.error("Error searching users:", searchError);
        setError(searchError.message || "An error occurred while searching users");
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [trimmedQuery]);

  useEffect(() => {
    const handlePointerDownOutside = (event) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target)
      ) {
        setIsResultsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDownOutside);
    };
  }, []);

  const handleResultClick = (userId) => {
    setIsResultsOpen(false);
    router.push(`/dashboard/rmt/client-profile/${userId}`);
  };

  return (
    <div className="w-full border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl p-4">
      <h2 className="text-xl font-semibold text-[#1f2a1f] mb-4">Search Clients</h2>
      <div className="mb-4 space-y-2" ref={searchContainerRef}>
        <div className="flex flex-col gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (trimmedQuery.length >= 2) {
                setIsResultsOpen(true);
              }
            }}
            placeholder="Search by name, email, or phone"
            className="flex-grow px-4 py-2 border border-gray-300 bg-[#f4f7f2] rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          {isLoading && (
            <p className="text-xs text-gray-600">Searching...</p>
          )}
        </div>
        {trimmedQuery.length >= 2 && isResultsOpen && results.length > 0 && (
          <ul className="bg-[#f4f7f2] border border-[#b7c7b0] rounded-md">
            {results.map((user) => (
              <li
                key={user.id}
                onClick={() => handleResultClick(user.id)}
                className="px-4 py-2 hover:bg-[#e8efe4] transition-colors cursor-pointer"
              >
                <div className="font-semibold">{user.name}</div>
                <div className="text-sm text-gray-600">
                  {user.email || "No email"}{" "}
                  {user.phoneNumber ? `• ${user.phoneNumber}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}

        {trimmedQuery.length >= 2 &&
          isResultsOpen &&
          !isLoading &&
          !error &&
          results.length === 0 && (
            <p className="text-sm text-gray-600">No matching clients.</p>
          )}
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}
    </div>
  );
}
