import type { Student } from "@/lib/api";

export const FEE_REMINDER_TEMPLATE_STORAGE_KEY = "skf_feetrack_fee_reminder_template_v1";

export const MONTHS = [
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
];

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DEFAULT_FEE_REMINDER_TEMPLATE = `Dear *{parent_name}*,

This is a reminder that the monthly training fee of *{pending_amount}* for _{student_name}_ ({skf_id}) is pending for *{month}*.

Please clear the dues at your earliest convenience.

Thank you,
SKF Karate - {branch}`;

export function readFeeReminderTemplate() {
  if (typeof window === "undefined") return DEFAULT_FEE_REMINDER_TEMPLATE;
  return window.localStorage.getItem(FEE_REMINDER_TEMPLATE_STORAGE_KEY) || DEFAULT_FEE_REMINDER_TEMPLATE;
}

export function writeFeeReminderTemplate(template: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FEE_REMINDER_TEMPLATE_STORAGE_KEY, template);
}

export function phoneValue(student: Student) {
  return String(student.whatsapp || student.phone || "").trim();
}

export function cleanIndianPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length >= 12) return digits;
  return `91${digits.slice(-10)}`;
}

export function studentName(student: Student) {
  return student.name || student.id || "Student";
}

export function branchMessageName(branch: string) {
  const normalized = String(branch || "").trim().toLowerCase();
  if (normalized === "herohalli") return "HEROHALLI";
  if (normalized === "mpsc" || normalized.includes("sports")) return "MP SPORTS CLUB";
  return String(branch || "SKF").trim().toUpperCase();
}

export function replaceFeeReminderPlaceholders(
  template: string,
  student: Student,
  context: { branch: string; monthIndex: number },
) {
  return template
    .replace(/{student_name}/g, studentName(student))
    .replace(/{parent_name}/g, student.parentName || "Parent")
    .replace(/{pending_amount}/g, `₹${Number(student.fee || 0).toLocaleString("en-IN")}`)
    .replace(/{month}/g, MONTHS[context.monthIndex] || MONTHS[new Date().getMonth()])
    .replace(/{branch}/g, branchMessageName(context.branch))
    .replace(/{skf_id}/g, student.id);
}

export function unresolvedPlaceholders(message: string) {
  return message.match(/{[^}]+}/g) || [];
}

export function feeReminderWhatsAppUrl(
  template: string,
  student: Student,
  context: { branch: string; monthIndex: number },
) {
  const phone = cleanIndianPhone(phoneValue(student));
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(replaceFeeReminderPlaceholders(template, student, context))}`;
}
