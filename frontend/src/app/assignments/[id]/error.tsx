"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function AssignmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[assignment page error]", error);
  }, [error]);

  return (
    <div className="card p-6 sm:p-8 mx-auto max-w-xl mt-8">
      <div className="flex items-center gap-3 text-hard mb-3">
        <AlertTriangle size={20} />
        <h2 className="font-semibold text-base">Something went wrong loading this paper</h2>
      </div>
      <p className="text-sm text-ink-500 mb-5">
        The page hit an unexpected error. You can try again, or go back to the list.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className="btn-black">
          <RotateCw size={14} /> Try again
        </button>
        <Link href="/assignments" className="btn-ghost">
          Back to assignments
        </Link>
      </div>
    </div>
  );
}
