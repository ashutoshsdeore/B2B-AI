export default function StarsBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="w-[200%] h-[200%] animate-[spin_120s_linear_infinite] bg-[radial-gradient(white_1px,transparent_1px)] [background-size:40px_40px] opacity-10"></div>
    </div>
  );
}
