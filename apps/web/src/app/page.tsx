import { getAppTagline } from "@/lib/app-copy";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fbfbfc] px-6 text-center text-[#202124]">
      <section>
        <p className="text-sm font-medium text-[#5b82f6]">Oppassum</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-normal">Peer-to-peer file sharing</h1>
        <p className="mt-3 max-w-md text-base text-[#6b7280]">{getAppTagline()}</p>
      </section>
    </main>
  );
}
