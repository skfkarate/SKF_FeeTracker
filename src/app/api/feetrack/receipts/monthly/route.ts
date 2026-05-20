import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createElement } from "react";

import { renderToBuffer } from "@react-pdf/renderer";
import { cookies } from "next/headers";

import MonthlyFeeReceiptPdf from "@/components/receipts/MonthlyFeeReceiptPdf";
import { normalizeFeeYear } from "@/lib/fee-year";
import {
  formatReceiptDateToken,
  formatReceiptTimeToken,
  getReceiptFileName,
  type ReceiptStudentLike,
} from "@/lib/receipts/monthly";
import { callKarateBackend } from "@/lib/server/backend";
import {
  FEETRACK_SESSION_COOKIE,
  readFeeTrackSession,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReceiptStudent = ReceiptStudentLike & {
  paid?: boolean;
  monthStatus?: string;
};

type StudentsResponse = {
  students?: ReceiptStudent[];
  data?: ReceiptStudent[] | { students?: ReceiptStudent[] };
};

function jsonError(message: string, status: number) {
  return Response.json(
    { success: false, error: message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

function getStudents(data: StudentsResponse) {
  if (Array.isArray(data.students)) return data.students;
  if (Array.isArray(data.data)) return data.data;
  if (data.data && Array.isArray(data.data.students)) return data.data.students;
  return [];
}

function pdfHeaders(filename: string) {
  const safeFileName = filename.replace(/[^A-Za-z0-9_.-]/g, "_");
  return {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="${safeFileName}"`,
    "Content-Type": "application/pdf",
  };
}

async function imageSource(path: string) {
  const image = await readFile(path);
  return `data:image/png;base64,${image.toString("base64")}`;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const staff = readFeeTrackSession(
      cookieStore.get(FEETRACK_SESSION_COOKIE)?.value,
    );
    if (!staff) {
      return jsonError("FeeTrack session expired. Please sign in again.", 401);
    }

    const url = new URL(request.url);
    const studentId = String(url.searchParams.get("studentId") || "").trim();
    const branch = String(url.searchParams.get("branch") || "").trim();
    const month = Number(url.searchParams.get("month"));
    const year = normalizeFeeYear(url.searchParams.get("year"));
    const paidDate = String(url.searchParams.get("paidDate") || "").trim();
    const paidTime = String(url.searchParams.get("paidTime") || "").trim();

    if (!studentId) return jsonError("Student ID is required.", 400);
    if (!branch) return jsonError("Branch is required.", 400);
    if (!Number.isInteger(month) || month < 0 || month > 11) {
      return jsonError("Month must be between 0 and 11.", 400);
    }

    const dateLabel = formatReceiptDateToken(paidDate);
    const timeLabel = formatReceiptTimeToken(paidTime);
    if (!dateLabel || !timeLabel) {
      return jsonError("Valid receipt date and time are required.", 400);
    }

    const data = await callKarateBackend<StudentsResponse>({
      action: "get_students",
      branch,
      month,
      year,
      staff,
    });
    const students = getStudents(data);
    const student = students.find(
      (candidate) => String(candidate.id).trim() === studentId,
    );

    if (!student) return jsonError("Student not found for this month.", 404);
    if (student.monthStatus !== "Paid" && !student.paid) {
      return jsonError("Receipt is available only for paid students.", 409);
    }

    const logoSrc = await imageSource(join(process.cwd(), "public/logo.png"));
    const stampSrc = await imageSource(join(process.cwd(), "public/stamp.png"));
    const pdfDocument = createElement(MonthlyFeeReceiptPdf, {
      branch,
      dateLabel,
      logoSrc,
      month,
      year,
      stampSrc,
      student,
      timeLabel,
    }) as Parameters<typeof renderToBuffer>[0];
    const pdf = await renderToBuffer(pdfDocument);

    return new Response(new Uint8Array(pdf), {
      headers: pdfHeaders(getReceiptFileName(student.id, month, year)),
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Receipt generation failed.",
      500,
    );
  }
}
