"use client";

import { useEffect, useRef, useState } from "react";
import {
  Smile,
  Send,
  Paperclip,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Sparkles
} from "lucide-react";
import { pusherClient } from "../app/lib/pusher-client";
import { motion, AnimatePresence } from "framer-motion";

interface ChatSectionProps {
  selectedChannel: { id: string; name: string } | null;
}

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string; lastName?: string };
}

interface CurrentUser {
  id: string;
  firstName: string;
  lastName?: string;
  email: string;
}

export default function ChatSection({ selectedChannel }: ChatSectionProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.success) setCurrentUser(data.user);
      } catch (error) {
        console.error("Fetch user error:", error);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    pusherClient.connection.bind("connected", () =>
      console.log("✅ Pusher connected!")
    );
    pusherClient.connection.bind("error", (err) =>
      console.error("❌ Pusher error:", err)
    );
  }, []);

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const threshold = 100;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsNearBottom(distanceFromBottom < threshold);
  };

  useEffect(() => {
    if (!selectedChannel) return;
    setMessages([]);

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/message/${selectedChannel.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setMessages(data.messages);
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } catch (error) {
        console.error("Fetch messages error:", error);
      }
    };

    fetchMessages();
  }, [selectedChannel]);

  useEffect(() => {
    if (!selectedChannel) return;
    const channel = pusherClient.subscribe(`channel-${selectedChannel.id}`);

    const handleNewMessage = (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
      );
      if (isNearBottom) scrollToBottom();
    };

    channel.bind("message-sent", handleNewMessage);

    return () => {
      channel.unbind("message-sent", handleNewMessage);
      pusherClient.unsubscribe(`channel-${selectedChannel.id}`);
    };
  }, [selectedChannel, isNearBottom]);

  useEffect(() => {
    if (isNearBottom) scrollToBottom(false);
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChannel) return;

    try {
      const res = await fetch(`/api/message/${selectedChannel.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: message }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage("");
        if (editorRef.current) editorRef.current.innerHTML = "";
      } else console.error("❌ Send failed:", data);
    } catch (error) {
      console.error("Send error:", error);
    }
  };

  if (!selectedChannel)
    return (
      <div className="flex flex-1 items-center justify-center text-gray-500 text-sm">
        Select a channel to start chatting 💬
      </div>
    );

  return (
    <div className="flex flex-col flex-1 h-full bg-[#0d1117]">
      {/* Header */}
      <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-2">
        <h2 className="text-gray-100 font-semibold text-sm">
          #{selectedChannel.name}
        </h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-5 space-y-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.length > 0 ? (
            messages.map((msg) => {
              const isOwn = msg.user.id === currentUser?.id;
              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex w-full ${
                    isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`flex items-end gap-2 max-w-[80%] ${
                      isOwn ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <img
                      src={`https://ui-avatars.com/api/?name=${msg.user.firstName}+${msg.user.lastName || ""}&background=random`}
                      alt="avatar"
                      className="w-9 h-9 rounded-full"
                    />
                    <div
                      className={`flex flex-col ${
                        isOwn ? "items-end" : "items-start"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-200">
                          {msg.user.firstName} {msg.user.lastName || ""}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.2 }}
                        className={`px-4 py-2 text-sm border rounded-2xl break-words ${
                          isOwn
                            ? "bg-purple-600 text-white border-purple-500 rounded-br-none"
                            : "bg-[#161b22] text-gray-200 border-gray-800 rounded-bl-none"
                        }`}
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <p className="text-sm text-gray-500 italic">
              Welcome to #{selectedChannel.name}! 🎉 Start the conversation.
            </p>
          )}
        </AnimatePresence>
      </div>

      {/* Toolbar + Input */}
      <div className="border-t border-gray-800 p-4 bg-[#0d1117] sticky bottom-0">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-3 text-gray-300">
          <button onClick={() => handleFormat("bold")} className="hover:text-white transition">
            <Bold size={18} />
          </button>
          <button onClick={() => handleFormat("italic")} className="hover:text-white transition">
            <Italic size={18} />
          </button>
          <button onClick={() => handleFormat("underline")} className="hover:text-white transition">
            <Underline size={18} />
          </button>
          <button onClick={() => handleFormat("strikeThrough")} className="hover:text-white transition">
            <Strikethrough size={18} />
          </button>
          <button onClick={() => handleFormat("insertUnorderedList")} className="hover:text-white transition">
            <List size={18} />
          </button>
          <button onClick={() => handleFormat("insertOrderedList")} className="hover:text-white transition">
            <ListOrdered size={18} />
          </button>
          <button onClick={() => handleFormat("formatBlock", "pre")} className="hover:text-white transition">
            <Code size={18} />
          </button>
           <button
            type="button"
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1 transition"
          >
            <Sparkles size={16} /> Compose
          </button>
        </div>

        {/* Input Row */}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-3 bg-[#161b22] border border-gray-700 rounded-2xl px-4 py-2"
        >
          <button type="button" className="p-2 text-gray-400 hover:text-gray-200 transition">
            <Paperclip size={20} />
          </button>

          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => setMessage((e.target as HTMLDivElement).innerHTML)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-gray-200 text-sm focus:outline-none min-h-[24px]"
            suppressContentEditableWarning={true}
          ></div>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-1 transition"
          >
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
