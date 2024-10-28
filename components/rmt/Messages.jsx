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
      className={`px-4 py-2 rounded text-sm text-white bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400`}
    >
      {pending ? "Processing..." : children}
    </button>
  );
}

const Messages = ({ messages }) => {
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [replyText, setReplyText] = useState("");

  const messageRequests = messages.filter(
    (message) => message.status === "sent"
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
    await sendReply(selectedMessage._id, replyText);
    closeReplyModal();
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Messages</h2>
      {messageRequests.length === 0 ? (
        <div className="p-8 bg-gray-100 rounded-md">
          <p className="text-gray-600">There are currently no new messages.</p>
        </div>
      ) : (
        <div className="grid gap-4 mb-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {messageRequests.map((message) => (
            <div
              key={message._id}
              className="bg-white shadow-md rounded-md p-4 text-sm"
            >
              <div className="mb-2">
                <p className="font-semibold">
                  From: {message.firstName} {message.lastName}
                </p>
                <p>Email: {message.email}</p>
                <p>Phone: {message.phone}</p>
                <p className="mt-2">Message:</p>
                <p className="bg-gray-100 p-2 rounded mt-1">
                  {message.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Sent: {new Date(message.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => openReplyModal(message)}
                  className="px-4 py-2 rounded text-sm text-white bg-green-500 hover:bg-green-600"
                >
                  Reply
                </button>
                <form action={updateMessageStatus}>
                  <input type="hidden" name="messageId" value={message._id} />
                  <input type="hidden" name="status" value="replied" />
                  <SubmitButton>Mark as Replied</SubmitButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h3 className="text-lg font-semibold mb-4">Reply to Message</h3>
            <div className="mb-4">
              <p>
                <strong>From:</strong> {selectedMessage.firstName}{" "}
                {selectedMessage.lastName}
              </p>
              <p>
                <strong>Email:</strong> {selectedMessage.email}
              </p>
              <p>
                <strong>Phone:</strong> {selectedMessage.phone}
              </p>
              <p>
                <strong>Original Message:</strong>
              </p>
              <p className="bg-gray-100 p-2 rounded mt-1">
                {selectedMessage.message}
              </p>
            </div>
            <form onSubmit={handleReplySubmit}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full h-32 p-2 border rounded mb-4"
                placeholder="Type your reply here..."
                required
              ></textarea>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeReplyModal}
                  className="px-4 py-2 rounded text-sm text-gray-600 bg-gray-200 hover:bg-gray-300"
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
