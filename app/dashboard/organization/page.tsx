"use client";
import { useEffect, useState } from "react";
import { Copy } from "lucide-react";

export default function OrganizationDetailsPage() {
  const [orgCode, setOrgCode] = useState("");
  const [orgName, setOrgName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchOrg() {
      const res = await fetch("/api/organization");
      if (res.ok) {
        const data = await res.json();
        setOrgCode(data.code);
        setOrgName(data.name);
      }
    }
    fetchOrg();
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(orgCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-10">
      <h1 className="text-2xl font-semibold mb-8">Organization details</h1>

      <div className="space-y-6">
        {/* Code */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code
          </label>
          <div className="relative">
            <input
              type="text"
              value={orgCode || ""}
              disabled
              className="w-full bg-gray-100 border border-gray-200 rounded-md px-4 py-2 pr-10 text-gray-600 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              <Copy size={18} />
            </button>
          </div>
          {copied && (
            <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            value={orgName || ""}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full border border-gray-200 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
