import { Suspense } from "react";
import StudentList from "./StudentList";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ branch: "Herohalli" }, { branch: "MPSC" }];
}

export default async function Page({
  params,
}: {
  params: Promise<{ branch: string }>;
}) {
  const { branch } = await params;
  return (
    <Suspense
      fallback={
        <div className="text-center py-[48px] text-[color:var(--color-text-dim)]">
          Loading student list...
        </div>
      }
    >
      <StudentList branch={branch} />
    </Suspense>
  );
}
