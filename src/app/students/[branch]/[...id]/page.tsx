"use client";

import { useEffect, useState } from "react";
import { use, Suspense } from "react";
import { Phone, MessageCircle, Trophy, AlertCircle, History, IndianRupee } from "lucide-react";
import GlobalSearch from "@/components/common/GlobalSearch";
import NotificationBell from "@/components/common/NotificationBell";
import PageShell from "@/components/ui/PageShell";
import AccountMenu from "@/components/common/AccountMenu";
import { getStudents, Student } from "@/lib/api";
import { useFeeTrackAuth } from "@/lib/client-auth";
import { avatarTintStyle, initials, normalizeProfilePhotoUrl } from "@/lib/profile-photo";

// Wrap in Suspense to avoid sync rendering issues
export default function StudentProfilePage({
  params,
}: {
  params: Promise<{ branch: string; id: string[] }>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-[32px] h-[32px] border-2 border-[color:var(--color-hairline)] border-t-zinc-400 rounded-full animate-spin" /></div>}>
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
    <PageShell
      hud={{
        title: "Student Profile",
        backHref: `/students/${branch}`,
        actions: <GlobalSearch />,
        bell: <NotificationBell />,
        account: <AccountMenu />,
      }}
    >
        {loading ? (
          <div className="flex justify-center items-center h-[256px]">
             <div className="w-[32px] h-[32px] border-2 border-[color:var(--color-hairline)] border-t-zinc-400 rounded-full animate-spin" />
          </div>
        ) : !student ? (
          <div className="text-center py-[80px] animate-fade-in">
            <AlertCircle className="w-[48px] h-[48px] text-[color:var(--color-text-faint)] mx-auto mb-[16px]" />
            <h2 className="text-xl font-medium text-[color:var(--color-text)] mb-[8px]">Student Not Found</h2>
            <p className="text-[color:var(--color-text-dim)]">We couldn&apos;t locate {studentId} in the {branch} database.</p>
          </div>
        ) : (
          <div className="animate-slide-up space-y-[32px]">
            {/* Header Profile Card */}
            <div className="card-panel p-[32px] relative overflow-hidden">
              <div className="absolute top-[0px] right-[0px] w-[256px] h-[256px] bg-[color:var(--color-well)] rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[24px] relative z-10">
                <div className="w-[80px] h-[80px] overflow-hidden rounded-2xl bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] flex items-center justify-center flex-shrink-0 shadow-xl">
                  {studentPhotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studentPhotoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold" style={avatarTintStyle(student.name)}>{initials(student.name)}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-[12px] mb-[4px]">
                    <h1 className="text-3xl font-semibold text-[color:var(--color-text)] font-sans tracking-tight">
                      {student.name}
                    </h1>
                    <span className={`text-[10px] uppercase tracking-widest px-[10px] py-[4px] rounded-md border ${
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[16px]">
              <a 
                href={`tel:${student.phone}`} 
                className="card-panel p-[16px] flex items-center gap-[16px] hover:bg-[color:var(--color-well)] transition-all group"
              >
                <div className="w-[40px] h-[40px] rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline)] flex items-center justify-center text-[color:var(--color-text-dim)] group-hover:text-[color:var(--color-text)] transition-colors">
                  <Phone className="w-[16px] h-[16px]" />
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
                className="card-panel p-[16px] flex items-center gap-[16px] hover:bg-[color:var(--color-well)] transition-all group border-[color:var(--color-hairline-strong)]"
              >
                <div className="w-[40px] h-[40px] rounded-full bg-[color:var(--color-well)] border border-[color:var(--color-hairline-strong)] flex items-center justify-center text-[color:var(--color-text-dim)] group-hover:text-[color:var(--color-text-dim)] transition-colors">
                  <MessageCircle className="w-[16px] h-[16px]" />
                </div>
                <div>
                  <p className="text-xs text-[color:var(--color-text-dim)]">WhatsApp</p>
                  <p className="text-sm font-medium text-[color:var(--color-text-dim)]">Message Parent</p>
                </div>
              </a>
            </div>

            {/* Details Grid */}
            <div className="card-panel p-[0px] overflow-hidden">
              <div className="p-[16px] border-b border-[color:var(--color-hairline)] bg-[color:var(--color-well)]">
                <h3 className="text-sm font-medium text-[color:var(--color-text)] flex items-center gap-[8px]">
                  <History className="w-[16px] h-[16px] text-[color:var(--color-text-dim)]" /> Administrative Details
                </h3>
              </div>
              <div className="divide-y divide-[color:var(--color-hairline)]">
                <div className="p-[16px] flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Parent/Guardian Name</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium">{student.parentName || "—"}</span>
                </div>
                <div className="p-[16px] flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Base Monthly Fee</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium flex items-center gap-[4px]">
                    <IndianRupee className="w-[14px] h-[14px] text-[color:var(--color-text-dim)]" /> {student.fee}
                  </span>
                </div>
                <div className="p-[16px] flex justify-between items-center hover:bg-[color:var(--color-well)] transition-colors">
                  <span className="text-[color:var(--color-text-dim)] text-sm">Training Experience</span>
                  <span className="text-[color:var(--color-text)] text-sm font-medium flex items-center gap-[8px]">
                    <Trophy className="w-[14px] h-[14px] text-[color:var(--color-text-dim)]" /> {student.trainingExperience || "—"}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
    </PageShell>
  );
}
