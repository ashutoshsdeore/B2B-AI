import Image from "next/image";

export default function Partners() {
  const logos = [
    "arcjet",
    "kinde",
    "vercel",
    "neon",
    "orpc",
    "prisma",
    "openai",
  ];

  return (
    <section className="mt-16 flex flex-wrap justify-center items-center gap-12 opacity-90">
      {logos.map((name) => (
        <div
          key={name}
          className="flex items-center justify-center w-32 h-16 bg-transparent"
        >
          <Image
            src={`/logo/${name}.svg`}
            alt={`${name} logo`}
            width={120}
            height={60}
            className="brightness-0 invert opacity-70 hover:opacity-100 transition-all duration-300 object-contain"
          />
        </div>
      ))}
    </section>
  );
}
