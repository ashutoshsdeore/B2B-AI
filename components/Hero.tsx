import { ArrowRight } from "lucide-react";
import Image from "next/image";
import DashboardPreview from "./DashboardPreview";
import Partners from "./Partners";
import StarsBackground from "./StarBackground";

export default function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 md:px-16 py-20 overflow-hidden">
      <StarsBackground />

      <div className="relative z-10">
        <div className="inline-flex items-center border border-gray-800 rounded-full px-4 py-2 text-sm text-gray-300 mb-6 hover:bg-gray-900 transition cursor-pointer">
          <span>Introducing new AI features</span>
          <ArrowRight className="ml-2" size={16} />
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight max-w-4xl">
          The{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-sky-400">
            AI-ready
          </span>{" "}
          home for team communication
        </h1>

        <p className="text-gray-400 max-w-2xl mx-auto mb-10 text-lg">
          TailFlow organizes conversations into channels with threads, Realtime,
          and AI so teams stay in sync.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-medium">
            Get Started Today
          </button>
          <button className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-200 border border-gray-700 font-medium">
            Request a Demo
          </button>
        </div>
      </div>

      <DashboardPreview />
      <Partners />
    </section>
  );
}
