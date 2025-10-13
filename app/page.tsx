export default function Home() {
  return (
    <section className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <h1 className="text-5xl font-bold mb-4">
        🚀 Welcome to <span className="text-sky-600">My AI SaaS</span>
      </h1>
      <p className="text-lg text-gray-600 max-w-2xl mb-8">
        Build powerful B2B AI tools using Next.js, React, and Tailwind CSS.
      </p>
      <button className="px-6 py-3 rounded-xl bg-sky-600 text-white hover:bg-sky-700 transition">
        Get Started
      </button>
    </section>
  );
}
