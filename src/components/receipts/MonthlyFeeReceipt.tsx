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

function PreviewField({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      style={{
        borderBottom: last ? "0" : "1px solid #d8dee8",
        paddingBottom: last ? 0 : "8px",
        marginBottom: last ? 0 : "8px",
      }}
    >
      <div
        style={{
          color: "#667085",
          fontWeight: 700,
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          marginBottom: "3px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#111827",
          fontWeight: 800,
          fontSize: "13px",
          lineHeight: 1.25,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PreviewSettlementLine({
  label,
  value,
  credit = false,
  total = false,
}: {
  label: string;
  value: string;
  credit?: boolean;
  total?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "16px",
        borderTop: "1px solid #d8dee8",
        paddingTop: "8px",
        marginTop: "8px",
        color: total ? "#111827" : "#667085",
        fontSize: total ? "14px" : "12px",
        fontWeight: total ? 900 : 700,
      }}
    >
      <span style={{ textTransform: total ? "uppercase" : "none" }}>
        {label}
      </span>
      <span style={{ color: credit ? "#12805c" : "#111827" }}>{value}</span>
    </div>
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
      <div className="w-full max-w-[640px] max-h-[92dvh] overflow-y-auto custom-scrollbar">
        <div
          style={{
            backgroundColor: "#ffffff",
            color: "#111827",
            border: "1px solid #0f1419",
            borderRadius: "10px",
            fontFamily: "'Montserrat', sans-serif",
            overflow: "hidden",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          }}
        >
          <div
            style={{
              alignItems: "center",
              background: "#0f1419",
              display: "flex",
              gap: "16px",
              justifyContent: "space-between",
              padding: "18px 20px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                minWidth: "260px",
              }}
            >
              <NextImage
                src="/logo.png"
                alt="SKF"
                width={54}
                height={54}
                className="rounded-full object-contain border-2 border-[#ffb703] bg-white"
              />
              <div>
                <h1
                  style={{
                    color: "#ffffff",
                    fontSize: "21px",
                    fontWeight: 900,
                    letterSpacing: "0.16em",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  S K F KARATE
                </h1>
                <p
                  style={{
                    color: "#ffb703",
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                    lineHeight: 1.3,
                    margin: "5px 0 0",
                    textTransform: "uppercase",
                  }}
                >
                  Sports Karate-do Fitness & Self Defence Association ®
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Fee Receipt
              </div>
              <div
                style={{
                  border: "1px solid #ffb703",
                  borderRadius: "4px",
                  color: "#ffb703",
                  display: "inline-block",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                  marginTop: "7px",
                  padding: "4px 8px",
                }}
              >
                {receiptNo}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", height: "4px" }}>
            <div style={{ background: "#d62828", flex: 2 }} />
            <div style={{ background: "#ffb703", flex: 1 }} />
          </div>

          <div style={{ padding: "18px" }}>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #d8dee8",
                borderRadius: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                overflow: "hidden",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  borderLeft: "5px solid #d62828",
                  padding: "14px",
                }}
              >
                <div
                  style={{
                    color: "#667085",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Received from
                </div>
                <div
                  style={{
                    color: "#111827",
                    fontSize: "20px",
                    fontWeight: 900,
                    lineHeight: 1.1,
                    marginTop: "5px",
                  }}
                >
                  {student.name}
                </div>
                <span
                  style={{
                    backgroundColor: "#d62828",
                    borderRadius: "4px",
                    color: "#ffffff",
                    display: "inline-block",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    marginTop: "8px",
                    padding: "3px 8px",
                  }}
                >
                  {student.id}
                </span>
                <div
                  style={{
                    color: "#667085",
                    fontSize: "12px",
                    lineHeight: 1.45,
                    marginTop: "8px",
                  }}
                >
                  Fee received for {purpose}. Parent / guardian:{" "}
                  {student.parentName || "N/A"}.
                </div>
              </div>
              <div
                style={{
                  alignItems: "flex-end",
                  borderLeft: "1px solid #d8dee8",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  padding: "14px",
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    color: "#667085",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Amount Received
                </div>
                <div
                  style={{
                    color: "#111827",
                    fontSize: "32px",
                    fontWeight: 900,
                    lineHeight: 1,
                    marginTop: "6px",
                  }}
                >
                  ₹ {amountReceived.toLocaleString("en-IN")}
                </div>
                <div
                  style={{
                    color: "#667085",
                    fontSize: "11px",
                    lineHeight: 1.35,
                    marginTop: "7px",
                    maxWidth: "250px",
                  }}
                >
                  {amountWords}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gap: "12px",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  border: "1px solid #d8dee8",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#d62828",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  Receipt Details
                </div>
                <PreviewField label="Branch">{branchName}</PreviewField>
                <PreviewField label="Receipt No">{receiptNo}</PreviewField>
                <PreviewField label="Date">{date}</PreviewField>
                <PreviewField label="Time" last>
                  {timeStr}
                </PreviewField>
              </div>
              <div
                style={{
                  border: "1px solid #d8dee8",
                  borderRadius: "8px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    color: "#d62828",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.08em",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  Student Record
                </div>
                <PreviewField label="Student Name">{student.name}</PreviewField>
                <PreviewField label="SKF ID">{student.id}</PreviewField>
                <PreviewField label="Parent / Guardian">
                  {student.parentName || "N/A"}
                </PreviewField>
                <PreviewField label="Purpose" last>
                  {purpose}
                </PreviewField>
              </div>
            </div>

            <div
              style={{
                background: "#fff7e1",
                border: "1px solid #ffb703",
                borderRadius: "8px",
                marginBottom: "14px",
                padding: "12px",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    color: "#111827",
                    fontSize: "12px",
                    fontWeight: 900,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                  }}
                >
                  Settlement Summary
                </div>
                <div
                  style={{
                    color: "#12805c",
                    fontSize: "11px",
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  Verified Paid
                </div>
              </div>
              {creditApplied > 0 && (
                <>
                  <PreviewSettlementLine
                    label="Monthly fee"
                    value={`₹ ${baseFee.toLocaleString("en-IN")}`}
                  />
                  <PreviewSettlementLine
                    credit
                    label="Referral credit"
                    value={`- ₹ ${creditApplied.toLocaleString("en-IN")}`}
                  />
                </>
              )}
              <PreviewSettlementLine
                label="Amount received"
                total
                value={`₹ ${amountReceived.toLocaleString("en-IN")}`}
              />
            </div>

            <div
              style={{
                alignItems: "center",
                borderTop: "1px solid #d8dee8",
                display: "flex",
                flexWrap: "wrap",
                gap: "16px",
                paddingTop: "12px",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#12805c",
                    fontSize: "13px",
                    fontWeight: 900,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Payment Received with Thanks
                </div>
                <div
                  style={{
                    color: "#667085",
                    fontSize: "11px",
                    lineHeight: 1.45,
                    marginTop: "5px",
                  }}
                >
                  This receipt confirms fee collection for the period shown
                  above and should be retained for records.
                </div>
              </div>
              <div style={{ minWidth: "128px", textAlign: "center" }}>
                <NextImage
                  src="/stamp.png"
                  alt="PAID"
                  width={64}
                  height={64}
                  className="object-contain -rotate-12"
                />
                <div
                  style={{
                    borderTop: "1px solid #111827",
                    margin: "4px auto 0",
                    width: "108px",
                  }}
                />
                <div
                  style={{
                    color: "#667085",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    marginTop: "6px",
                    textTransform: "uppercase",
                  }}
                >
                  Authorized Seal
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, #0f1419, #1a1f2e)",
              borderTop: "3px solid #ffb703",
              padding: "16px",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#c8d0d8", fontSize: "10px", margin: 0 }}>
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
