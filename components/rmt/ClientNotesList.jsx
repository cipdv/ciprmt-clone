"use client";

import { useMemo, useState } from "react";

function formatDate(dateValue) {
  if (!dateValue) return "Unknown date";
  try {
    return new Date(dateValue).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(dateValue);
  }
}

function summarizeNote(treatmentNotes) {
  if (!treatmentNotes) return "";
  if (typeof treatmentNotes === "string") return treatmentNotes.trim();
  if (typeof treatmentNotes.notes === "string") return treatmentNotes.notes.trim();
  return "";
}

export default function ClientNotesList({ notes }) {
  const [expanded, setExpanded] = useState(false);

  const sortedNotes = useMemo(() => {
    if (!Array.isArray(notes)) return [];
    const normalized = notes
      .map((entry) => ({
        ...entry,
        summary: summarizeNote(entry.treatmentNotes),
      }))
      .filter((entry) => entry.summary);

    return normalized.sort((a, b) => {
      const aTime = new Date(
        `${new Date(a.appointmentDate).toISOString().split("T")[0]}T${
          a.appointmentBeginsAt || "00:00:00"
        }`,
      ).getTime();
      const bTime = new Date(
        `${new Date(b.appointmentDate).toISOString().split("T")[0]}T${
          b.appointmentBeginsAt || "00:00:00"
        }`,
      ).getTime();
      return bTime - aTime;
    });
  }, [notes]);

  const visibleNotes = expanded ? sortedNotes : sortedNotes.slice(0, 3);
  const hasMore = sortedNotes.length > 3;

  return (
    <div className="border border-[#b7c7b0] bg-[#f4f7f2] rounded-xl shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#1f2a1f]">Client Notes</h2>
        <span className="text-sm text-[#5b6758]">{sortedNotes.length} total</span>
      </div>

      {sortedNotes.length > 0 && (
        <div className="mt-4 space-y-3">
          {visibleNotes.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-[#d5e0d1] bg-[#f4f7f2] p-4"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#5b6758] mb-2">
                <span className="font-medium text-[#2e3a2d]">
                  {formatDate(entry.appointmentDate)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-[#253124]">
                {entry.summary}
              </p>
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-4 text-sm font-medium text-[#2f5d90] hover:text-[#22476f]"
        >
          {expanded ? "Show less" : `Show more (${sortedNotes.length - 3} more)`}
        </button>
      )}
    </div>
  );
}
