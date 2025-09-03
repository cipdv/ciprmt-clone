"use client";

import { useState } from "react";
import { sendEmailBlast } from "@/app/_actions";

export default function EmailBlastForm() {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState(null);
  const [emailContent, setEmailContent] = useState("");
  const [subject, setSubject] = useState("");

  // Insert formatting at cursor position
  const insertFormatting = (format) => {
    const textarea = document.getElementById("emailContent");
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = emailContent.substring(start, end);
    let formattedText = "";

    switch (format) {
      case "bold":
        formattedText = `**${selectedText}**`;
        break;
      case "italic":
        formattedText = `*${selectedText}*`;
        break;
      case "heading":
        formattedText = `# ${selectedText}`;
        break;
      case "subheading":
        formattedText = `## ${selectedText}`;
        break;
      case "list":
        formattedText = selectedText
          ? selectedText
              .split("\n")
              .map((line) => `- ${line}`)
              .join("\n")
          : "- Item 1\n- Item 2\n- Item 3";
        break;
      case "link":
        formattedText = selectedText
          ? `[${selectedText}](https://example.com)`
          : "[Link text](https://example.com)";
        break;
      default:
        formattedText = selectedText;
    }

    const newContent =
      emailContent.substring(0, start) +
      formattedText +
      emailContent.substring(end);
    setEmailContent(newContent);

    // Set focus back to textarea and position cursor after the inserted text
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + formattedText.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setIsPending(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("emailContent", emailContent);

      const result = await sendEmailBlast(formData);
      setMessage(result);

      if (result.success) {
        // Reset the form
        setSubject("");
        setEmailContent("");
      }
    } catch (error) {
      setMessage({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Subject Line
          </label>
          <input
            type="text"
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
            placeholder="Enter email subject"
          />
        </div>

        <div>
          <label
            htmlFor="emailContent"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Email Content
          </label>

          {/* Formatting toolbar */}
          <div className="mb-3 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border">
            <button
              type="button"
              onClick={() => insertFormatting("bold")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Bold"
            >
              <strong>B</strong>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("italic")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Italic"
            >
              <em>I</em>
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("heading")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Heading"
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("subheading")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Subheading"
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("list")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Bullet List"
            >
              • List
            </button>
            <button
              type="button"
              onClick={() => insertFormatting("link")}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-100 transition-colors"
              title="Link"
            >
              🔗 Link
            </button>
          </div>

          <textarea
            id="emailContent"
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            required
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-gray-600"
            placeholder="Write your email content here. Use the formatting buttons above or markdown syntax (**bold**, *italic*, # heading, etc.)"
          />

          <p className="text-xs text-gray-500 mt-2">
            Use **text** for bold, *text* for italic, # for headings, ## for
            subheadings, - for lists, [text](url) for links
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-md ${
              message.success
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {message.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full px-6 py-3 bg-gray-800 text-white rounded-md hover:bg-gray-600 transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Sending Email Campaign..." : "Send Email Campaign"}
        </button>

        {isPending && (
          <p className="text-sm text-gray-600 text-center">
            Emails are being sent in batches to avoid spam filters. This may
            take a few minutes.
          </p>
        )}
      </form>
    </div>
  );
}
