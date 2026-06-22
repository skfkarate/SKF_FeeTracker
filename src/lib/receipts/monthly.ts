import { getCurrentFeeYear } from "@/lib/fee-year";

export const RECEIPT_YEAR = getCurrentFeeYear();

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type ReceiptStudentLike = {
  id: string;
  name: string;
  parentName?: string | null;
  fee: number;
  paid?: boolean;
  monthStatus?: string;
  originalFee?: number | null;
  creditApplied?: number | null;
  receiptId?: string | null;
};

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
] as const;

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
] as const;

function positiveAmount(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? Math.round(amount) : 0;
}

function wordsBelowThousand(value: number) {
  const hundred = Math.floor(value / 100);
  const remainder = value % 100;
  const parts: string[] = [];

  if (hundred > 0) {
    parts.push(`${ONES[hundred]} Hundred`);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const ten = Math.floor(remainder / 10);
      const one = remainder % 10;
      parts.push([TENS[ten], ONES[one]].filter(Boolean).join(" "));
    }
  }

  return parts.join(" ");
}

function normalizeReceiptToken(value: string) {
  return value.trim().replace(/[^A-Za-z0-9]+/g, "").toUpperCase() || "NA";
}

export function getBranchName(branch: string) {
  return branch === "MPSC" ? "MP Sports Club" : branch.trim().toUpperCase();
}

export function getBranchCode(branch: string) {
  if (branch === "MPSC") return "MP";
  const token = normalizeReceiptToken(branch);
  return token.slice(0, 2).toUpperCase() || "XX";
}

export function getReceiptNumber(
  student: Pick<ReceiptStudentLike, "id" | "receiptId">,
  branch: string,
  month: number,
  year = RECEIPT_YEAR,
) {
  if (student.receiptId) return student.receiptId;
  const monthToken = String(month + 1).padStart(2, "0");
  return `SKF-FEE-${year}-${monthToken}-MON-${normalizeReceiptToken(student.id)}`;
}

export function getReceiptPurpose(month: number) {
  return `${MONTH_NAMES[month] ?? "Selected"} Monthly Training Fee`;
}

export function getReceiptAmounts(student: ReceiptStudentLike) {
  const baseFee = positiveAmount(student.originalFee) || positiveAmount(student.fee);
  const creditApplied = Math.min(positiveAmount(student.creditApplied), baseFee);
  const amountReceived = Math.max(0, baseFee - creditApplied);

  return {
    baseFee,
    creditApplied,
    amountReceived,
    amountWords: amountToIndianWords(amountReceived),
  };
}

export function amountToIndianWords(value: number) {
  const amount = Math.max(0, Math.round(value));
  if (amount === 0) return "Rupees Zero Only";

  const crore = Math.floor(amount / 10000000);
  const lakh = Math.floor((amount % 10000000) / 100000);
  const thousand = Math.floor((amount % 100000) / 1000);
  const rest = amount % 1000;

  const parts = [
    crore ? `${wordsBelowThousand(crore)} Crore` : "",
    lakh ? `${wordsBelowThousand(lakh)} Lakh` : "",
    thousand ? `${wordsBelowThousand(thousand)} Thousand` : "",
    rest ? wordsBelowThousand(rest) : "",
  ].filter(Boolean);

  return `Rupees ${parts.join(" ")} Only`;
}

export function formatReceiptDate(date: Date) {
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatReceiptTime(date: Date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatReceiptDateToken(dateToken: string) {
  const match = dateToken.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    !Number.isFinite(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(day).padStart(2, "0")} ${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatReceiptTimeToken(timeToken: string) {
  const match = timeToken.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function getReceiptFileName(
  studentId: string,
  month: number,
  year = RECEIPT_YEAR,
) {
  const studentToken = normalizeReceiptToken(studentId);
  const monthToken = MONTH_SHORT_NAMES[month] ?? "Month";
  return `SKF_${studentToken}_${monthToken}_${year}_receipt.pdf`;
}
