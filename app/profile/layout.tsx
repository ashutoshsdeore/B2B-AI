"use client";

import { useEffect, useState, ReactNode } from "react";
import { Plus, X, Send, Smile, Eye, Check, XCircle } from "lucide-react";
import { pusherClient } from "../lib/pusher-client";
import ChatSection from "../../components/ChatSection";

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  workspaceId?: string;
}

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Invite {
  id: string;
  inviteeEmail: string;
  status: string;
  token?: string;
  channel?: { name: string };
  inviter?: { firstName?: string; lastName?: string; email?: string };
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  // === State ===
  const [messages, setMessages] = useState<any[]>([]);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");

  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [channelName, setChannelName] = useState("");

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  const [isViewInvitesOpen, setIsViewInvitesOpen] = useState(false);
  const [showReceived, setShowReceived] = useState(false);

  const [message, setMessage] = useState("");


// fetch messages for selected channel
  useEffect(() => {
  if (!selectedChannel) return;

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/channel/${selectedChannel.id}/messages`, {
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) setMessages(data.messages);
    } catch (error) {
      console.error("Fetch messages error:", error);
    }
  };

  fetchMessages();
}, [selectedChannel]);

// pusher updates 

useEffect(() => {
  if (!selectedChannel) return;

  const channel = pusherClient.subscribe(`channel-${selectedChannel.id}`);
  const handleNewMessage = (message: any) => {
    setMessages((prev) => [...prev, message]);
  };

  channel.bind("message-sent", handleNewMessage);

  return () => {
    pusherClient.unsubscribe(`channel-${selectedChannel.id}`);
    channel.unbind("message-sent", handleNewMessage);
  };
}, [selectedChannel]);


  // === Fetch Workspaces ===
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const res = await fetch("/api/workspace", { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.success) {
          setWorkspaces(data.workspaces);
          if (!selectedWorkspace && data.workspaces.length > 0)
            setSelectedWorkspace(data.workspaces[0]);
        }
      } catch (error) {
        console.error("Fetch workspaces error:", error);
      }
    };
    fetchWorkspaces();
  }, []);

  
  // === Fetch Channels ===
  useEffect(() => {
    if (!selectedWorkspace) return;
    const fetchChannels = async () => {
      try {
        const res = await fetch(`/api/channel?workspaceId=${selectedWorkspace.id}`, {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok && data.success) setChannels(data.channels);
      } catch (error) {
        console.error("Fetch channels error:", error);
      }
    };
    fetchChannels();
  }, [selectedWorkspace]);

  // === Fetch Members of selected channel ===
// === Fetch Members + Include Logged-in User ===
useEffect(() => {
  if (!selectedChannel) return;

  const fetchMembers = async () => {
    try {
      // 1️⃣ Fetch channel members
      const res = await fetch(`/api/channel/${selectedChannel.id}/members`, {
        credentials: "include",
      });
      const data = await res.json();

      // 2️⃣ Fetch logged-in user
      const meRes = await fetch("/api/auth/me", { credentials: "include" });
      const meData = await meRes.json();

      if (res.ok && data.success) {
        let allMembers = data.members || [];

        // Add logged-in user if not already in list
        if (meRes.ok && meData.success && meData.user) {
          const currentUser = {
            id: meData.user.id,
            name: `${meData.user.firstName || ""} ${meData.user.lastName || ""}`.trim(),
            email: meData.user.email,
            role: "You",
          };

          const isIncluded = allMembers.some((m: any) => m.email === currentUser.email);
          if (!isIncluded) {
            allMembers.unshift(currentUser); // put at top of list
          }
        }

        setMembers(allMembers);
      }
    } catch (error) {
      console.error("Fetch channel members error:", error);
    }
  };

  fetchMembers();
}, [selectedChannel]);


  // === Create Workspace ===
  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: workspaceName }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWorkspaces((prev) => [...prev, data.workspace]);
        setSelectedWorkspace(data.workspace);
        setWorkspaceName("");
        setIsWorkspaceModalOpen(false);
      } else alert(data.error || "Failed to create workspace.");
    } catch (error) {
      console.error("Create workspace error:", error);
    }
  };

  // === Create Channel ===
  const handleCreateChannel = async () => {
    if (!channelName.trim() || !selectedWorkspace) return;
    try {
      const res = await fetch("/api/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: channelName,
          workspaceId: selectedWorkspace.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setChannels((prev) => [...prev, data.channel]);
        setChannelName("");
        setIsChannelModalOpen(false);
      } else alert(data.error || "Failed to create channel.");
    } catch (error) {
      console.error("Create channel error:", error);
    }
  };

  // === Invite Member (channel-based) ===
 // === Invite Member (channel-based) ===
const handleInvite = async () => {
  if (!inviteEmail.trim() || !selectedChannel) {
    alert("Select a channel and enter email");
    return;
  }

  try {
    const res = await fetch(`/api/channel/${selectedChannel.id}/invites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email: inviteEmail }), // ✅ changed key name
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert(`✅ Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setIsInviteModalOpen(false);
    } else {
      alert(`❌ ${data.error || "Failed to send invite."}`);
    }
  } catch (error) {
    console.error("Channel invite error:", error);
  }
};

  // === View Sent Channel Invites ===
  // === View Sent Channel Invites ===
const handleViewInvites = async () => {
  if (!selectedChannel) {
    alert("Select a channel first");
    return;
  }

  try {
    const res = await fetch(`/api/channel/${selectedChannel.id}/invites`, {
      credentials: "include",
    });
    const data = await res.json();

    if (res.ok && data.success) {
      setInvites(data.invites);
      setShowReceived(false);
      setIsViewInvitesOpen(true);
    } else {
      alert(data.error || "Failed to fetch invites");
    }
  } catch (error) {
    console.error("View channel invites error:", error);
  }
};

  // === View My Received Invites ===
  const handleViewMyInvites = async () => {
    try {
      const res = await fetch(`/api/channel/invites`, { credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvites(data.invites);
        setShowReceived(true);
        setIsViewInvitesOpen(true);
      } else {
        alert(data.error || "Failed to fetch received invites");
      }
    } catch (error) {
      console.error("View my invites error:", error);
    }
  };

  // === Accept Invite ===
  // === Accept Invite ===
const handleAcceptInvite = async (token?: string, id?: string) => {
  if (!token) return alert("Missing invite token");
  try {
    const res = await fetch(`/api/channel/invite/accept?token=${encodeURIComponent(token)}`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();

    if (res.ok && data.success) {
      alert(`✅ ${data.message || "Channel invite accepted!"}`);

      // 🧠 Remove the accepted invite from modal list
      const removedId = data.inviteId || id;
      if (removedId) setInvites((prev) => prev.filter((i) => i.id !== removedId));

      // 🧩 Add the new channel to the sidebar (if not already present)
      if (data.channel) {
        setChannels((prev) => {
          const exists = prev.some((ch) => ch.id === data.channel.id);
          if (!exists) return [...prev, data.channel];
          return prev;
        });

        // 🎯 Automatically switch to that channel
        setSelectedChannel(data.channel);
      }
    } else {
      alert(data.error || "Failed to accept invite");
    }
  } catch (error) {
    console.error("Accept channel invite error:", error);
  }
};


  // === Reject Invite ===
  const handleRejectInvite = async (token?: string, id?: string) => {
    if (!token) return alert("Missing invite token");
    try {
      const res = await fetch(`/api/channel/invite/reject?token=${encodeURIComponent(token)}`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Invite rejected");
        const removedId = data.inviteId || id;
        if (removedId) setInvites((prev) => prev.filter((i) => i.id !== removedId));
      } else alert(data.error || "Failed to reject invite");
    } catch (error) {
      console.error("Reject channel invite error:", error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0d1117] text-gray-200">
      {/* === GLOBAL STICKY NAV === */}
      <div className="sticky top-0 z-30 bg-[#0d1117]/95 backdrop-blur-sm border-b border-gray-800 flex justify-between items-center px-6 py-3">
        <h1 className="text-lg font-semibold text-gray-100">
          {selectedChannel ? `# ${selectedChannel.name}` : "Dashboard"}
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="bg-gray-800 text-sm px-4 py-2 rounded-md hover:bg-gray-700"
          >
            Invite Member (channel)
          </button>
          <button
            onClick={handleViewInvites}
            className="bg-gray-800 text-sm px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-1"
          >
            <Eye size={16} /> View Sent Invites
          </button>
          <button
            onClick={handleViewMyInvites}
            className="bg-gray-800 text-sm px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-1"
          >
            <Eye size={16} /> My Invites
          </button>
        </div>
      </div>

      {/* === MAIN CONTENT === */}
      <div className="flex flex-1">
        {/* === LEFT WORKSPACE SIDEBAR === */}
        <div className="w-16 bg-[#161b22] flex flex-col items-center py-4 space-y-3 border-r border-gray-800">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              onClick={() => setSelectedWorkspace(ws)}
              title={ws.name}
              className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-white cursor-pointer transition-all ${
                selectedWorkspace?.id === ws.id ? "ring-2 ring-blue-500" : ""
              }`}
              style={{ backgroundColor: ws.color }}
            >
              {ws.name.charAt(0).toUpperCase()}
            </div>
          ))}
          <div
            onClick={() => setIsWorkspaceModalOpen(true)}
            className="mt-2 w-10 h-10 flex items-center justify-center rounded-md border-2 border-dashed border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white cursor-pointer"
          >
            <Plus size={20} />
          </div>
        </div>

       {/* === CHANNEL SIDEBAR === */}
<div className="flex flex-1 h-screen overflow-hidden">
  {/* === LEFT SIDEBAR === */}
  <aside className="w-72 bg-[#161b22] border-r border-gray-800 flex flex-col h-full">
    {/* Workspace Header */}
    <div className="px-4 py-3 border-b border-gray-700 text-gray-100 font-semibold">
      {selectedWorkspace ? selectedWorkspace.name : "Loading..."}
    </div>

    {/* Channel List */}
    <div className="flex-1 overflow-y-auto px-3 py-2">
      <div className="flex justify-center mb-2">
        <button
          onClick={() => setIsChannelModalOpen(true)}
          className="flex items-center justify-center gap-2 text-gray-300 hover:text-white hover:bg-zinc-800/60 text-sm font-medium rounded-md px-4 py-2 transition-all"
        >
          <Plus size={16} /> Add channel
        </button>
      </div>

      <nav className="space-y-1">
        {channels.length > 0 ? (
          channels.map((ch) => (
            <div
              key={ch.id}
              onClick={() => setSelectedChannel(ch)}
              className={`block px-3 py-2 text-sm rounded-md cursor-pointer ${
                selectedChannel?.id === ch.id
                  ? "bg-gray-700 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              #{ch.name}
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-xs italic text-center">No channels yet</p>
        )}
      </nav>
    </div>

    {/* Members */}
    {selectedChannel && (
      <div className="border-t border-gray-800 bg-[#0f141a] px-4 py-3 max-h-56 overflow-y-auto">
        <p className="text-xs font-semibold text-gray-400 mb-2">
          Members ({members.length})
        </p>

        {members.length > 0 ? (
          <ul className="space-y-1">
            {members.map((member) => (
              <li
                key={member.id}
                className="text-sm text-gray-300 truncate flex items-center gap-2"
                title={member.email}
              >
                <span className="w-2 h-2 bg-green-500 rounded-full" />
                {member.name || member.email}
                {member.role === "You" && (
                  <span className="text-xs text-gray-500 ml-1">(You)</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-600 text-xs italic">No members yet...</p>
        )}
      </div>
    )}
  </aside>

  {/* === FIXED HEIGHT CHAT AREA === */}
  <main className="flex-1 flex flex-col h-full">
    <ChatSection selectedChannel={selectedChannel} />
  </main>
</div>



      </div>
       {/* === CREATE WORKSPACE MODAL === */}
{isWorkspaceModalOpen && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-[#161b22] rounded-lg p-6 w-[380px] relative border border-gray-700">
      <button
        onClick={() => setIsWorkspaceModalOpen(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold text-white mb-4">Create New Workspace</h2>

      <input
        type="text"
        value={workspaceName}
        onChange={(e) => setWorkspaceName(e.target.value)}
        placeholder="Enter workspace name"
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsWorkspaceModalOpen(false)}
          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateWorkspace}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md text-white"
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}

{/* === CREATE CHANNEL MODAL === */}
{isChannelModalOpen && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-[#161b22] rounded-lg p-6 w-[380px] relative border border-gray-700">
      <button
        onClick={() => setIsChannelModalOpen(false)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold text-white mb-4">Create New Channel</h2>

      <input
        type="text"
        value={channelName}
        onChange={(e) => setChannelName(e.target.value)}
        placeholder="Enter channel name"
        className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
      />

      <div className="flex justify-end gap-2">
        <button
          onClick={() => setIsChannelModalOpen(false)}
          className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateChannel}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md text-white"
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}

      {/* === INVITE MODAL === */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] rounded-lg p-6 w-[380px] relative border border-gray-700">
            <button
              onClick={() => setIsInviteModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
            >
              <X size={18} />
            </button>

            <h2 className="text-lg font-semibold text-white mb-4">
              Invite Member to Channel
            </h2>

            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-md text-white"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === VIEW INVITES MODAL === */}
      {isViewInvitesOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#161b22] rounded-lg p-6 w-[420px] relative border border-gray-700">
            <button
              onClick={() => setIsViewInvitesOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-200"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold text-white mb-4">
              {showReceived ? "My Channel Invites" : "Sent Channel Invites"}
            </h2>

            {invites.length > 0 ? (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {invites.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-md text-sm text-gray-300"
                  >
                    <div>
                      <p className="font-medium">{invite.inviteeEmail}</p>
                      {invite.channel && (
                        <p className="text-xs text-gray-500">
                          Channel: {invite.channel.name}
                        </p>
                      )}
                      {invite.inviter && (
                        <p className="text-xs text-gray-500">
                          Invited by:{" "}
                          {invite.inviter.firstName || invite.inviter.email}
                        </p>
                      )}
                    </div>

                    {showReceived ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptInvite(invite.token, invite.id)}
                          className="p-1 bg-green-600 hover:bg-green-500 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRejectInvite(invite.token, invite.id)}
                          className="p-1 bg-red-600 hover:bg-red-500 rounded"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{invite.status}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">No invites found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}