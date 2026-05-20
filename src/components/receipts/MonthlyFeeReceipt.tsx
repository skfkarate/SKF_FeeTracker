"use client";

import { Student } from "@/lib/api";
import {
  formatReceiptDate,
  formatReceiptTime,
  getBranchName,
  getReceiptAmounts,
  getReceiptFileName,
  getReceiptNumber,
  getReceiptPurpose,
} from "@/lib/receipts/monthly";
import { Download, Loader2 } from "lucide-react";
import NextImage from "next/image";
import { useMemo, useState, type ReactNode } from "react";

interface MonthlyFeeReceiptProps {
  student: Student;
  month: number;
  year: number;
  branch: string;
  onClose: () => void;
}

function inputDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function inputTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function parseReceiptDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function PreviewRow({
  label,
  children,
  vertical = "middle",
}: {
  label: string;
  children: ReactNode;
  vertical?: "middle" | "top";
}) {
  return (
    <tr>
      <td
        style={{
          color: "#4b5563",
          fontWeight: 700,
          fontSize: "11px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          padding: "4px 0",
          verticalAlign: vertical,
          width: "42%",
        }}
      >
        {label}
      </td>
      <td
        style={{
          color: "#1a1f2e",
          fontWeight: 700,
          fontSize: "14px",
          textAlign: "right",
          padding: "4px 0",
          verticalAlign: vertical,
          width: "58%",
        }}
      >
        {children}
      </td>
    </tr>
  );
}

async function responseError(response: Response) {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) {
    const data = await response.json().catch(() => null);
    return data?.error || `Receipt download failed (${response.status}).`;
  }

  const text = await response.text().catch(() => "");
  return text || `Receipt download failed (${response.status}).`;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export default function MonthlyFeeReceipt({
  student,
  month,
  year,
  branch,
  onClose,
}: MonthlyFeeReceiptProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptDate, setReceiptDate] = useState<Date | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [pickerDate, setPickerDate] = useState(() => inputDateValue(new Date()));
  const [pickerTime, setPickerTime] = useState(() => inputTimeValue(new Date()));

  const officialReceiptId = student.receiptId?.trim();
  const previewDate = receiptDate || parseReceiptDate(student.paidDate) || new Date();
  const branchName = getBranchName(branch);
  const receiptNo = getReceiptNumber(student, branch, month, year);
  const purpose = getReceiptPurpose(month);
  const { baseFee, creditApplied, amountReceived, amountWords } = useMemo(
    () => getReceiptAmounts(student),
    [student],
  );
  const date = formatReceiptDate(previewDate);
  const timeStr = formatReceiptTime(previewDate);

  const executeDownload = async (dateToUse?: Date) => {
    setDownloadError(null);
    setIsDownloading(true);

    try {
      const response = officialReceiptId
        ? await fetch(`/api/feetrack/receipts/${encodeURIComponent(officialReceiptId)}`, {
            cache: "no-store",
          })
        : await fetch(
            `/api/feetrack/receipts/monthly?${new URLSearchParams({
              branch,
              month: String(month),
              year: String(year),
              paidDate: inputDateValue(dateToUse || new Date()),
              paidTime: inputTimeValue(dateToUse || new Date()),
              studentId: student.id,
            })}`,
            { cache: "no-store" },
          );

      if (!response.ok) {
        throw new Error(await responseError(response));
      }

      const blob = await response.blob();
      downloadBlob(blob, getReceiptFileName(student.id, month, year));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Receipt download failed.";
      setDownloadError(message);
      alert(message);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadClick = () => {
    if (officialReceiptId) {
      void executeDownload();
      return;
    }

    if (!receiptDate) {
      setShowDatePicker(true);
      return;
    }

    void executeDownload(receiptDate);
  };

  const confirmDateAndDownload = () => {
    if (!pickerDate || !pickerTime) {
      const message = "Select a receipt date and time.";
      setDownloadError(message);
      alert(message);
      return;
    }

    const [year, mon, day] = pickerDate.split("-").map(Number);
    const [hours, minutes] = pickerTime.split(":").map(Number);
    const chosen = new Date(year, mon - 1, day, hours, minutes);
    setReceiptDate(chosen);
    setShowDatePicker(false);
    void executeDownload(chosen);
  };

  return (
    <div className="glass-modal-overlay" style={{ zIndex: 100 }}>
      <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto px-4 custom-scrollbar">
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#1a1f2e",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a1f2e, #0f1419)",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "12px",
              }}
            >
              <NextImage
                src="/logo.png"
                alt="SKF"
                width={70}
                height={70}
                className="rounded-full object-contain border border-[#d4af37]/50 bg-white/5"
              />
            </div>
            <h1
              style={{
                color: "#ffffff",
                fontSize: "28px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                margin: 0,
              }}
            >
              SKF
            </h1>
            <p
              style={{
                color: "#d4af37",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.1em",
                marginTop: "4px",
              }}
            >
              Sports Karate-do Fitness & Self Defence Association ®
            </p>
          </div>

          <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <h2
                style={{
                  color: "#1a1f2e",
                  fontSize: "18px",
                  fontWeight: 900,
                  margin: 0,
                }}
              >
                Monthly Fee Receipt
              </h2>
              <p
                style={{ color: "#6b7280", fontSize: "11px", marginTop: "4px" }}
              >
                Payment confirmation
              </p>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <PreviewRow label="Branch">{branchName}</PreviewRow>
                <PreviewRow label="Receipt No">{receiptNo}</PreviewRow>
                <PreviewRow label="Date">{date}</PreviewRow>
                <PreviewRow label="Time">{timeStr}</PreviewRow>
              </tbody>
            </table>
          </div>

          <div style={{ padding: "24px", position: "relative" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <PreviewRow label="Parent / Guardian">
                  {student.parentName || "N/A"}
                </PreviewRow>
                <PreviewRow label="Student Name" vertical="top">
                  {student.name}
                  <br />
                  <span
                    style={{
                      backgroundColor: "#b8860b",
                      color: "#ffffff",
                      fontSize: "10px",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontWeight: 700,
                      display: "inline-block",
                      marginTop: "4px",
                    }}
                  >
                    {student.id}
                  </span>
                </PreviewRow>
                <PreviewRow label="Purpose">{purpose}</PreviewRow>
              </tbody>
            </table>

            <div
              style={{
                marginTop: "24px",
                padding: "16px",
                borderRadius: "12px",
                border: "2px solid #d4af37",
                background: "linear-gradient(135deg, #fafbfc, #f3f4f6)",
                textAlign: "center",
              }}
            >
              {creditApplied > 0 && (
                <div
                  style={{
                    marginBottom: "10px",
                    color: "#4b5563",
                    fontSize: "11px",
                    textAlign: "left",
                  }}
                >
                  <div className="flex justify-between">
                    <span>Monthly fee</span>
                    <span>₹ {baseFee.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>Referral credit</span>
                    <span>- ₹ {creditApplied.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              )}
              <div
                style={{ fontSize: "28px", fontWeight: 900, color: "#1a1f2e" }}
              >
                ₹ {amountReceived.toLocaleString("en-IN")}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontStyle: "italic",
                  color: "#6b7280",
                  marginTop: "4px",
                }}
              >
                {amountWords}
              </div>
            </div>

            <div
              style={{
                marginTop: "16px",
                textAlign: "center",
                fontWeight: 700,
                fontSize: "13px",
                color: "#16a34a",
              }}
            >
              Payment Received with Thanks
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "8px",
                opacity: 0.9,
              }}
            >
              <NextImage
                src="/stamp.png"
                alt="PAID"
                width={96}
                height={96}
                className="object-contain -rotate-12"
              />
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #1a1f2e, #0f1419)",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#d1d5db", fontSize: "10px", margin: 0 }}>
              This receipt is issued for confirmation and record purposes only.
            </p>
          </div>
        </div>

        {downloadError && (
          <p className="mt-3 text-center text-xs text-red-300">
            {downloadError}
          </p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="btn-ghost flex-1 font-[family-name:var(--font-space)] tracking-wider"
          >
            CLOSE
          </button>
          {student.receiptId && (
            <a
              href={`/api/feetrack/receipts/${encodeURIComponent(student.receiptId)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost flex-1 font-[family-name:var(--font-space)] tracking-wider text-center"
            >
              OFFICIAL PDF
            </a>
          )}
          <button
            onClick={handleDownloadClick}
            disabled={isDownloading}
            className="btn-primary flex-1 font-[family-name:var(--font-space)] tracking-wider flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed border-none text-white"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            DOWNLOAD
          </button>
        </div>
      </div>

      {showDatePicker && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setShowDatePicker(false)}
        >
          <div
            className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-[0_0_40px_rgba(34,197,94,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h3 className="font-[family-name:var(--font-space)] text-lg font-bold text-white tracking-wider">
                RECEIPT DATE & TIME
              </h3>
              <p className="text-white/40 text-xs mt-1">
                Set the payment date & time for this receipt
              </p>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-[10px] uppercase tracking-wider font-bold block mb-2">
                Payment Date
              </label>
              <input
                type="date"
                value={pickerDate}
                onChange={(e) => setPickerDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div className="mb-6">
              <label className="text-white/50 text-[10px] uppercase tracking-wider font-bold block mb-2">
                Payment Time
              </label>
              <input
                type="time"
                value={pickerTime}
                onChange={(e) => setPickerTime(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                style={{ colorScheme: "dark" }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDatePicker(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-[family-name:var(--font-space)] tracking-wider transition-all border border-white/5 hover:border-white/10"
              >
                CANCEL
              </button>
              <button
                onClick={confirmDateAndDownload}
                disabled={isDownloading}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-[family-name:var(--font-space)] tracking-wider transition-all font-bold shadow-lg shadow-green-900/30"
              >
                CONFIRM & DOWNLOAD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
