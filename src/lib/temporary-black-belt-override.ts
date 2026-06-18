/**
 * TEMPORARY — Black Belt Exam Installment Override
 * ==================================================
 * Applies ₹2000/month installment fee for 5 black belt candidates
 * (Jun–Oct 2026) in place of their regular monthly fee.
 *
 * SKF13BL000 is excepted — regular monthly fee + exam fee at end.
 *
 * DELETE THIS FILE after October 2026 (exam complete).
 */

const BLACK_BELT_INSTALLMENT_IDS = new Set([
  'SKF20HE001',
  'SKF20HE002',
  'SKF20HE003',
  'SKF21HE001',
  'SKF21HE003',
])

export function getBlackBeltOverride(skfId: string, month: number, year: number): {
  fee: number
  isExamInstallment: boolean
} | null {
  if (!BLACK_BELT_INSTALLMENT_IDS.has(skfId)) return null
  if (year !== 2026) return null
  if (month < 5 || month > 9) return null
  return { fee: 2000, isExamInstallment: true }
}
