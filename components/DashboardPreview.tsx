import Image from "next/image";

export default function DashboardPreview() {
  return (
    <div className="relative mt-20 z-10">
      <Image
        src="/dashboard-preview.png"
        alt="TailFlow Dashboard"
        width={1200}
        height={700}
        className="rounded-2xl border border-gray-800 shadow-2xl"
      />
    </div>
  );
}
