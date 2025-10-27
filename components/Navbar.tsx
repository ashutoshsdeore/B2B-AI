"use client";
import { useState } from "react";
    import Link from "next/link";
export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="flex justify-between items-center px-6 md:px-16 py-6 border-b border-gray-800">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <span className="font-bold text-lg">T</span>
        </div>
        <span className="text-xl font-semibold">TeamFlow</span>
      </div>

      <nav className="hidden md:flex space-x-8 text-gray-300">
        <a href="#" className="hover:text-white transition">Features</a>
        <a href="#" className="hover:text-white transition">Solution</a>
        <a href="#" className="hover:text-white transition">Pricing</a>
        <a href="#" className="hover:text-white transition">About</a>
      </nav>

      <div className="hidden md:flex items-center space-x-4">
       
    

<button className="px-4 py-2 text-sm bg-blue-600 rounded-lg font-medium hover:bg-blue-700">
  <Link href="/login">Get Started</Link>
</button>

      </div>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden text-gray-400"
        onClick={() => setMenuOpen(!menuOpen)}
      >
        ☰
      </button>
    </header>
  );
}
