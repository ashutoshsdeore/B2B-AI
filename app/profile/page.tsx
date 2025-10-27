"use client";

import { useState } from "react";
import { Send, Smile } from "lucide-react";

export default function ChannelPage({ channel }) {
  const [message, setMessage] = useState("");

  if (!channel) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
        Select a channel to start messaging
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-semibold text-gray-100">
          # {channel.name}
        </h1>
        <div className="flex items-center gap-3">
          <button className="bg-gray-800 text-sm px-4 py-2 rounded-md hover:bg-gray-700">
            Invite Member
          </button>
          <button className="bg-gray-800 text-sm px-4 py-2 rounded-md hover:bg-gray-700">
            Members
          </button>
        </div>
      </div>

      {/* MESSAGE SECTION */}
      <div className="flex-1 overflow-y-auto bg-[#161b22] rounded-lg p-6 border border-gray-800">
        <div className="mb-6">
          <img
            src="/diagram-example.png"
            alt="diagram"
            className="rounded-md mb-3 border border-gray-700"
          />
          <p className="text-sm text-gray-300">
            Thanks, everyone! Glad it makes sense. I was a bit worried it was
            too cluttered 😅
          </p>
        </div>

        <div className="text-sm text-gray-300">
          Hey team, I’ve run into a problem with the staging build — the new
          search feature keeps returning empty results even though the data is
          there 😅
        </div>
      </div>

      {/* INPUT BOX */}
      <div className="mt-4 border-t border-gray-800 pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setMessage("");
          }}
          className="flex items-center gap-2"
        >
          <button
            type="button"
            className="p-2 bg-gray-800 rounded-md hover:bg-gray-700"
          >
            <Smile size={18} />
          </button>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message"
            className="flex-1 bg-gray-800 border border-gray-700 rounded-md px-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-md text-sm font-medium flex items-center gap-1"
          >
            <Send size={16} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
