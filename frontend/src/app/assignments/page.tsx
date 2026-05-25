"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteAssignment, listAssignments } from "@/lib/api";
import { AssignmentSummary } from "@/lib/types";
import { Filter, Loader2, MoreVertical, Plus, Search } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { EmptyIllustration } from "@/components/EmptyIllustration";

export default function ListPage() {
  const router = useRouter();
  const [items, setItems] = useState<AssignmentSummary[] | null>(null);
  const [err, setErr] = useState("");
  const [query, setQuery] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    listAssignments()
      .then(setItems)
      .catch((e) => setErr(e.message));
  }, []);

  if (err)
    return (
      <>
        <Topbar title="Assignment" />
        <div className="card p-6 text-hard">{err}</div>
      </>
    );

  if (!items)
    return (
      <>
        <Topbar title="Assignment" />
        <div className="card p-6 flex items-center gap-2 text-ink-500">
          <Loader2 className="animate-spin" size={18} /> Loading…
        </div>
      </>
    );

  const filtered = items.filter((a) =>
    a.title.toLowerCase().includes(query.toLowerCase())
  );

  if (items.length === 0) {
    return (
      <>
        <Topbar title="Assignment" />
        <div className="flex flex-col items-center justify-center text-center py-16 lg:py-24 px-4">
          <EmptyIllustration className="w-64 h-52 mb-6" />
          <h2 className="text-2xl mb-2">No assignments yet</h2>
          <p className="text-ink-500 max-w-md mb-6">
            Create your first assignment to start collecting and grading student
            submissions. You can set up rubrics, define marking criteria, and let
            AI assist with grading.
          </p>
          <button
            onClick={() => router.push("/assignments/new")}
            className="btn-black"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Your First Assignment
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Assignment" />
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <h1 className="text-2xl">Assignments</h1>
        </div>
        <p className="text-sm text-ink-500">
          Manage and create assignments for your classes.
        </p>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button className="btn-ghost">
          <Filter size={16} />
          Filter By
        </button>
        <div className="relative flex-1 max-w-md ml-auto">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Assignment"
            className="input pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-20">
        {filtered.map((a) => (
          <AssignmentCard
            key={a._id}
            assignment={a}
            isMenuOpen={openMenu === a._id}
            onToggleMenu={() => setOpenMenu(openMenu === a._id ? null : a._id)}
            onClose={() => setOpenMenu(null)}
            onDelete={async () => {
              try {
                await deleteAssignment(a._id);
                setItems((prev) => (prev ? prev.filter((x) => x._id !== a._id) : prev));
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Delete failed");
              }
            }}
          />
        ))}
      </div>

      <button
        onClick={() => router.push("/assignments/new")}
        className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 btn-black shadow-pop z-30"
      >
        <Plus size={16} strokeWidth={2.5} />
        Create Assignment
      </button>
    </>
  );
}

function AssignmentCard({
  assignment,
  isMenuOpen,
  onToggleMenu,
  onClose,
  onDelete,
}: {
  assignment: AssignmentSummary;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onClose: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (isMenuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isMenuOpen, onClose]);

  const assignedAt = new Date(assignment.createdAt).toLocaleDateString("en-GB").replaceAll("/", "-");
  const dueAt = new Date(assignment.dueDate).toLocaleDateString("en-GB").replaceAll("/", "-");

  return (
    <div className="relative card p-5 hover:shadow-pop transition group" ref={ref}>
      <Link href={`/assignments/${assignment._id}`} className="block">
        <div className="flex items-start justify-between gap-3 mb-8">
          <h3 className="text-lg font-semibold underline decoration-1 underline-offset-4 line-clamp-1">
            {assignment.title}
          </h3>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="font-semibold">Assigned on</span>{" "}
            <span className="text-ink-500">: {assignedAt}</span>
          </div>
          <div>
            <span className="font-semibold">Due</span>{" "}
            <span className="text-ink-500">: {dueAt}</span>
          </div>
        </div>
      </Link>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleMenu();
        }}
        className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-ink-500"
      >
        <MoreVertical size={18} />
      </button>

      {isMenuOpen && (
        <div className="absolute top-12 right-4 bg-white rounded-2xl shadow-pop border border-line py-2 w-44 z-20">
          <Link
            href={`/assignments/${assignment._id}`}
            className="block px-4 py-2 text-sm hover:bg-muted"
          >
            View Assignment
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
              onDelete();
            }}
            className="w-full text-left px-4 py-2 text-sm text-hard hover:bg-muted"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
