import { Topbar } from "./Topbar";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <Topbar title={title} />
      <div className="card p-16 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-accent-50 text-accent flex items-center justify-center text-2xl">
          ✨
        </div>
        <h2 className="text-xl mb-2">{title}</h2>
        <p className="text-ink-500 max-w-md mx-auto">
          This area is part of the VedaAI product surface. The assessment creator flow is what's shipped in this build.
        </p>
      </div>
    </>
  );
}
