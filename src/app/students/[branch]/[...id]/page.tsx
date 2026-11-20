"use client";

import { useEffect, useState } from "react";
import { use, Suspense } from "react";
import { Phone, MessageCircle, Trophy, AlertCircle, History, IndianRupee } from "lucide-react";
import Navbar from "@/components/common/Navbar";
import AccountMenu from "@/components/common/AccountMenu";
import { getStudents, Student } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { initials, normalizeProfilePhotoUrl } from "@/lib/profile-photo";

// Wrap in Suspense to avoid sync rendering issues
export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ branch: string; id: string[] }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[color:var(--color-well)] flex items-center justify-center"><div className="w-8 h-8 border-2 border-[color:var(--color-hairline)] border-t-zinc-400 rounded-full animate-spin" /></div>}>
      <StudentProfileContent params={params} />
    </Suspense>
  );
}

function StudentProfileContent({
  params,
}: {
  params: Promise<{ branch: string; id: string[] }>;
}) {
  const { user, checking } = useFeeTrackAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const unwrappedParams = use(params);
  
  const branch = unwrappedParams.branch;
  const studentId = decodeURIComponent(unwrappedParams.id.join("/"));

  useEffect(() => {
    if (checking || !user) return;
    const currentMonth = new Date().getMonth();
    // Fetch students to find the specific one
    getStudents(branch, currentMonth).then((students) => {
      const found = students.find((s) => s.id === studentId);
      setStudent(found || null);
      setLoading(false);
    });
  }, [user, checking, branch, studentId]);

  if (checking || !user) return null;
  const studentPhotoUrl = student ? normalizeProfilePhotoUrl(student.photoUrl) : "";

  return (
    <div className="min-h-screen bg-[color:var(--color-well)] text-[color:var(--color-text)]">
      <Navbar showBack title="Student Profile" rightContent={<AccountMenu />} />

      <main className="mx-auto max-w-6xl px-4 sm:px-6 pt-24 sm:pt-32 pb-24">
        {loading ? (
          <div className="flex justify-center items-center h-64">
             <div className="w-8 h-8 border-2 border-[color:var(--color-hairline)] border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : !student ? (
          <div className="text-center py-20 animate-fade-in">
            <AlertCircle className="w-12 h-12 text-[color:var(--color-text-faint)] mx-auto mb-4" />
            <h2 className="text-xl font-medium text-[color:var(--color-text)] mb-2">Student Not Found</h2>
            <p className="text-[color:var(--color-text-dim)]">We couldn&apos;t locate {studentId} in the {branch} database.</p>
          </div>
        ) : (
          <div className="animate-slide-up space-y-8">
            {/* Header Profile Card */}
            <div className="card-panel p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[color:var(--color-well)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
                <div className="w-20 h-20 overflow-hidden rounded-2xl bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] flex items-center justify-center flex-shrink-0 shadow-xl">
                  {studentPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studentPhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-[color:var(--color-text-dim)]">{initials(student.name)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-3xl font-semibold text-[color:var(--color-text)] font-sans tracking-tight">
                      {student.name}
                    </h1>
                    <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                      student.status.toLowerCase() === 'active'
                        ? 'bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-accent-border)]'
                        : 'bg-[color:var(--color-well)] text-[color:var(--color-text-dim)] border-[color:var(--color-hairline)]'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  <p className="text-[color:var(--color-text-dim)] font-mono text-sm tracking-widest uppercase">{student.id}</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a 
                href={`tel:${student.phone}`} 
                className="card-panel p-4 flex items-center gap-4 hover:bg-[color:var(--color-well)] transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] flex items-center justify-center text-[color:var(--color-text-dim)] group-hover:text-[color:var(--color-text)] transition-colors">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-[color:var(--color-text-dim)]">Primary Contact</p>
                  <p className="text-sm font-medium text-[color:var(--color-text)]">{student.phone || "Not provided"}</p>
                </div>
              </a>
              <a 
                href={`https://wa.me/91${student.whatsapp?.replace(/\D/g, '') || student.phone?.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="card-panel p-4 flex items-center gap-4 hover:bg-[color:var(--color-well)] transition-all group border-[color:var(--color-hairline-strong)]"
              >
                <div className="w-10 h-10 rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline-strong)] flex items-center justify-center text-[color:var(--color-text-dim)] group-hover:text-[color:var(--color-text-dim)] transition-colors">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-[color:var(--color-text-dim)]">WhatsApp</p>
                  <p className="text-sm font-medium text-[color:var(--color-text-dim)]">Message Parent</p>
                </div>
              </a>
            </div>

            {/* Details Grid */}
            <div className="card-panel p-0 overflow-hidden">
              <div className="p-4 border-b border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                <h3 className="text-sm font-medium text-[color:var(--color-text)] flex items-center gap-2">
                  <History className="w-4 h-4 text-[color:var(--color-text-dim)]" /> Administrative Details
                </h3>
              </div>
              <div className="divide-y divide-[color:var(--color-hairline)]">
                <div className="p-4 flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Parent/Guardian Name</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{student.parentName || "—"}</span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Base Monthly Fee</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5 text-[color:var(--color-text-dim)]" /> {student.fee}
                  </span>
                </div>
                <div className="p-4 flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Training Experience</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-[color:var(--color-text-dim)]" /> {student.trainingExperience || "—"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
