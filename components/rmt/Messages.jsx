"use client";

import React, { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateMessageStatus, sendReply } from "@/app/_actions";

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full px-3 py-1.5 rounded text-sm font-medium text-white transition-colors duration-200 ${
        pending
          ? "bg-gray-400 cursor-not-allowed"
          : children === "Reply"
          ? "bg-green-500 hover:bg-green-600"
          : "bg-blue-500 hover:bg-blue-600"
      }`}
    >
      {pending ? "Processing..." : children}
    </button>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

const Messages = ({ messages }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");

  const messageRequests = messages.filter(
    (message) => message.status === "delivered"
  );

  const openReplyModal = (message) => {
    setSelectedMessage(message);
    setReplyText("");
  };

  const closeReplyModal = () => {
    setSelectedMessage(null);
    setReplyText("");
  };

  const handleReplySubmit = async (event) => {
    event.preventDefault();
    // Use id instead of _id for PostgreSQL
    await sendReply(selectedMessage.id, replyText);
    closeReplyModal();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Messages</h2>
      {messageRequests.length === 0 ? (
        <div className="p-8 bg-yellow-50 rounded-md shadow-sm">
          <p className="text-gray-600 text-center text-lg">
            There are currently no new messages.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 mb-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {messageRequests.map((message) => (
            <div
              key={message.id} // Use id instead of _id
              className="bg-yellow-50 shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="mb-4">
                <h3 className="font-semibold text-lg mb-2 text-gray-800">
                  {message.firstName} {message.lastName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Email:</span> {message.email}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span> {message.phone}{" "}
                    {/* Changed from phoneNumber to phone */}
                  </p>
                </div>
                <div className="mt-3">
                  <p className="font-medium text-gray-700">Message:</p>
                  <p className="bg-gray-50 p-3 rounded mt-1 text-gray-600">
                    {message.message}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Sent: {formatDate(message.createdAt)}
                </p>
              </div>
              <div className="flex justify-between mt-4 space-x-2">
                <button
                  onClick={() => openReplyModal(message)}
                  className="flex-1 px-3 py-1.5 rounded text-sm font-medium text-white bg-green-500 hover:bg-green-600 transition-colors duration-200"
                >
                  Reply
                </button>
                <form action={updateMessageStatus} className="flex-1">
                  <input type="hidden" name="messageId" value={message.id} />{" "}
                  {/* Use id instead of _id */}
                  <input type="hidden" name="status" value="replied" />
                  <SubmitButton>Mark as Replied</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">
              Reply to Message
            </h3>
            <div className="mb-4 space-y-2">
              <p>
                <span className="font-medium">From:</span>{" "}
                {selectedMessage.firstName} {selectedMessage.lastName}
              </p>
              <p>
                <span className="font-medium">Email:</span>{" "}
                {selectedMessage.email}
              </p>
              <p>
                <span className="font-medium">Phone:</span>{" "}
                {selectedMessage.phone}{" "}
                {/* Changed from phoneNumber to phone */}
              </p>
              <p className="font-medium">Original Message:</p>
              <p className="bg-gray-50 p-3 rounded text-gray-600">
                {selectedMessage.message}
              </p>
            </div>
            <form onSubmit={handleReplySubmit}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full h-32 p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type your reply here..."
                required
              ></textarea>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  className="px-4 py-2 rounded text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 transition-colors duration-200"
                >
                  Cancel
                </button>
                <SubmitButton>Send Reply</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
