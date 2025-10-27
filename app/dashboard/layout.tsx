"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
   const fetchUser = async () => {
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      credentials: "include",
    });

    const data = await res.json();

    if (res.ok && data.success && data.user) {
      setUser(data.user); // ✅ correctly store the actual user object
    } else {
      router.push("/login");
    }
  } catch (error) {
    console.error("❌ Failed to fetch user:", error);
    router.push("/login");
  } finally {
    setLoading(false);
  }
};


    fetchUser();
  }, [router]);

  const organizationMenu = [
    { name: "Organization details", href: "/dashboard/organization" },
    { name: "Plan", href: "/dashboard/plan" },
    { name: "Payment details", href: "/dashboard/payment" },
  ];

  const accountMenu = [{ name: "Profile", href: "/profile" }];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 text-gray-600">
        Loading your dashboard...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 flex flex-col">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 bg-gray-200 text-gray-800 rounded-lg flex items-center justify-center font-semibold">
            T
          </div>
          <span className="font-medium">Teamflow</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Account Section */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-3">Account</h3>
            <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-50">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                {user?.firstName?.[0] ?? "?"}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {user ? `${user.firstName} ${user.lastName}` : "Loading..."}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Organization settings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              Organization settings
            </h3>
            <nav className="space-y-1">
              {organizationMenu.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm rounded-md transition ${
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Account settings */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              Account settings
            </h3>
            <nav className="space-y-1">
              {accountMenu.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-3 py-2 text-sm rounded-md transition ${
                      isActive
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="border-t border-gray-200 p-4 text-xs text-gray-500">
          <Link href="/" className="block mb-1 hover:underline">
            ← Back to Teamflow
          </Link>
          <p>Powered by Prisma + JWT</p>
        </div>
      </aside>

      <main className="flex-1 bg-gray-50 p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
