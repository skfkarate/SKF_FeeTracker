/* eslint-disable jsx-a11y/alt-text -- React PDF Image is not a DOM image and has no alt prop. */
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "path";
import type { ReactNode } from "react";

import {
  getBranchName,
  getReceiptAmounts,
  getReceiptNumber,
  getReceiptPurpose,
  RECEIPT_YEAR,
  type ReceiptStudentLike,
} from "@/lib/receipts/monthly";

type MonthlyFeeReceiptPdfProps = {
  student: ReceiptStudentLike;
  branch: string;
  month: number;
  year: number;
  dateLabel: string;
  timeLabel: string;
  logoSrc: string;
  stampSrc: string;
};

const fontRegularPath = path.join(process.cwd(), 'public/fonts/Montserrat-Regular.ttf')
const fontBoldPath = path.join(process.cwd(), 'public/fonts/Montserrat-Bold.ttf')

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: fontRegularPath, fontWeight: 'normal' },
    { src: fontBoldPath, fontWeight: 'bold' }
  ]
})

const colors = {
  canvas: "#eef2f5",
  dark: "#0f1419",
  ink: "#111827",
  muted: "#667085",
  line: "#d8dee8",
  gold: "#ffb703",
  crimson: "#d62828",
  green: "#12805c",
  paper: "#ffffff",
  soft: "#f8fafc",
  warm: "#fff7e1",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.canvas,
    color: colors.ink,
    fontFamily: "Montserrat",
    fontSize: 9,
    padding: 24,
  },
  receipt: {
    backgroundColor: colors.paper,
    borderColor: colors.dark,
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 1.2,
    flexDirection: "column",
    minHeight: "100%",
    overflow: "hidden",
  },
  topBand: {
    alignItems: "center",
    backgroundColor: colors.dark,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 16,
  },
  brandBlock: {
    alignItems: "center",
    flexDirection: "row",
    width: "68%",
  },
  logo: {
    backgroundColor: colors.paper,
    borderColor: colors.gold,
    borderRadius: 25,
    borderStyle: "solid",
    borderWidth: 1.4,
    height: 50,
    marginRight: 10,
    objectFit: "contain",
    width: 50,
  },
  brand: {
    color: colors.paper,
    fontSize: 19,
    fontWeight: "bold",
    letterSpacing: 3,
    lineHeight: 1,
  },
  association: {
    color: colors.gold,
    fontSize: 6.8,
    fontWeight: "bold",
    letterSpacing: 0.5,
    lineHeight: 1.35,
    marginTop: 3,
    textTransform: "uppercase",
    width: 270,
  },
  receiptHead: {
    alignItems: "flex-end",
    width: "32%",
  },
  documentTitle: {
    color: colors.paper,
    fontSize: 13,
    fontWeight: "bold",
    letterSpacing: 1.3,
    textAlign: "right",
    textTransform: "uppercase",
  },
  receiptPill: {
    borderColor: colors.gold,
    borderRadius: 4,
    borderStyle: "solid",
    borderWidth: 0.8,
    color: colors.gold,
    fontSize: 6.8,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: 6,
    paddingBottom: 3,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 3,
    textAlign: "right",
  },
  accentRail: {
    flexDirection: "row",
    height: 4,
  },
  accentRed: {
    backgroundColor: colors.crimson,
    flexGrow: 2,
  },
  accentGold: {
    backgroundColor: colors.gold,
    flexGrow: 1,
  },
  body: {
    flexGrow: 1,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 16,
  },
  summary: {
    backgroundColor: colors.soft,
    borderColor: colors.line,
    borderRadius: 7,
    borderStyle: "solid",
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
    overflow: "hidden",
  },
  summaryAccent: {
    backgroundColor: colors.crimson,
    width: 5,
  },
  summaryLeft: {
    borderRightColor: colors.line,
    borderRightStyle: "solid",
    borderRightWidth: 1,
    paddingBottom: 11,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 11,
    width: "58%",
  },
  summaryRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingBottom: 11,
    paddingLeft: 12,
    paddingRight: 12,
    paddingTop: 11,
    width: "42%",
  },
  kicker: {
    color: colors.muted,
    fontSize: 6.8,
    fontWeight: "bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  studentName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "bold",
    lineHeight: 1.15,
    marginTop: 4,
  },
  idBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.crimson,
    borderRadius: 4,
    color: colors.paper,
    fontSize: 7.2,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: 6,
    paddingBottom: 3,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 3,
  },
  summaryText: {
    color: colors.muted,
    fontSize: 8,
    lineHeight: 1.35,
    marginTop: 6,
  },
  amountLabel: {
    color: colors.muted,
    fontSize: 6.8,
    fontWeight: "bold",
    letterSpacing: 0.7,
    textAlign: "right",
    textTransform: "uppercase",
  },
  amount: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 1,
    marginTop: 4,
    textAlign: "right",
  },
  amountWords: {
    color: colors.muted,
    fontSize: 7.8,
    lineHeight: 1.3,
    marginTop: 7,
    textAlign: "right",
  },
  splitRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  panel: {
    borderColor: colors.line,
    borderRadius: 7,
    borderStyle: "solid",
    borderWidth: 1,
    paddingBottom: 9,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 9,
  },
  panelLeft: {
    marginRight: 6,
    width: "50%",
  },
  panelRight: {
    marginLeft: 6,
    width: "50%",
  },
  sectionTitle: {
    color: colors.crimson,
    fontSize: 7.5,
    fontWeight: "bold",
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  detailLine: {
    borderBottomColor: colors.line,
    borderBottomStyle: "solid",
    borderBottomWidth: 0.7,
    marginBottom: 6,
    paddingBottom: 5,
  },
  detailLineLast: {
    borderBottomWidth: 0,
    marginBottom: 0,
    paddingBottom: 0,
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 6.5,
    fontWeight: "bold",
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.ink,
    fontSize: 8.8,
    fontWeight: "bold",
    lineHeight: 1.25,
  },
  settlementPanel: {
    backgroundColor: colors.warm,
    borderColor: colors.gold,
    borderRadius: 7,
    borderStyle: "solid",
    borderWidth: 1,
    marginBottom: 12,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 8,
  },
  settlementHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  settlementTitle: {
    color: colors.ink,
    fontSize: 7.8,
    fontWeight: "bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  paidPill: {
    color: colors.green,
    fontSize: 7,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  settlementRow: {
    borderTopColor: colors.line,
    borderTopStyle: "solid",
    borderTopWidth: 0.6,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 5,
    marginTop: 5,
  },
  settlementLabel: {
    color: colors.muted,
    fontSize: 8,
  },
  settlementValue: {
    color: colors.ink,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "right",
  },
  creditValue: {
    color: colors.green,
  },
  settlementTotalLabel: {
    color: colors.ink,
    fontSize: 8.8,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  settlementTotalValue: {
    color: colors.ink,
    fontSize: 11.5,
    fontWeight: "bold",
    textAlign: "right",
  },
  footerRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopStyle: "solid",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
  },
  statusBlock: {
    paddingRight: 10,
    width: "68%",
  },
  status: {
    color: colors.green,
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  statusText: {
    color: colors.muted,
    fontSize: 7.5,
    lineHeight: 1.35,
    marginTop: 4,
  },
  stampWrap: {
    alignItems: "center",
    width: "32%",
  },
  stamp: {
    height: 56,
    objectFit: "contain",
    opacity: 0.85,
    width: 56,
    transform: "rotate(-10deg)",
  },
  signatureLine: {
    borderTopColor: colors.ink,
    borderTopStyle: "solid",
    borderTopWidth: 0.9,
    height: 1,
    marginTop: 5,
    width: 112,
  },
  signatureLabel: {
    color: colors.muted,
    fontSize: 6.8,
    fontWeight: "bold",
    letterSpacing: 0.5,
    marginTop: 5,
    textAlign: "center",
    textTransform: "uppercase",
  },
  footer: {
    backgroundColor: colors.dark,
    borderTopWidth: 3,
    borderTopColor: colors.gold,
    paddingBottom: 9,
    paddingLeft: 18,
    paddingRight: 18,
    paddingTop: 9,
  },
  footerText: {
    color: "#c8d0d8",
    fontSize: 7.2,
    lineHeight: 1.35,
    textAlign: "center",
  },
});

function currency(amount: number) {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function DetailField({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  const lineStyle = last
    ? [styles.detailLine, styles.detailLineLast]
    : styles.detailLine;

  return (
    <View style={lineStyle}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{children}</Text>
    </View>
  );
}

function SettlementRow({
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
  const valueStyle = total
    ? styles.settlementTotalValue
    : credit
      ? [styles.settlementValue, styles.creditValue]
      : styles.settlementValue;

  return (
    <View style={styles.settlementRow}>
      <Text style={total ? styles.settlementTotalLabel : styles.settlementLabel}>
        {label}
      </Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  );
}

export default function MonthlyFeeReceiptPdf({
  student,
  branch,
  month,
  year,
  dateLabel,
  timeLabel,
  logoSrc,
  stampSrc,
}: MonthlyFeeReceiptPdfProps) {
  const receiptNo = getReceiptNumber(student, branch, month, year);
  const purpose = getReceiptPurpose(month);
  const { baseFee, creditApplied, amountReceived, amountWords } =
    getReceiptAmounts(student);

  return (
    <Document
      author="SKF Karate"
      creator="SKF FeeTrack"
      producer="SKF FeeTrack"
      subject={`${purpose} receipt`}
      title={`${student.id} ${purpose} ${year || RECEIPT_YEAR}`}
    >
      <Page size="A4" style={styles.page} wrap={false}>
        <View style={styles.receipt}>
          <View style={styles.topBand}>
            <View style={styles.brandBlock}>
              <Image src={logoSrc} style={styles.logo} />
              <View>
                <Text style={styles.brand}>S K F KARATE</Text>
                <Text style={styles.association}>
                  Sports Karate-do Fitness & Self Defence Association (R)
                </Text>
              </View>
            </View>
            <View style={styles.receiptHead}>
              <Text style={styles.documentTitle}>Fee Receipt</Text>
              <Text style={styles.receiptPill}>{receiptNo}</Text>
            </View>
          </View>
          <View style={styles.accentRail}>
            <View style={styles.accentRed} />
            <View style={styles.accentGold} />
          </View>

          <View style={styles.body}>
            <View style={styles.summary}>
              <View style={styles.summaryAccent} />
              <View style={styles.summaryLeft}>
                <Text style={styles.kicker}>Received from</Text>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.idBadge}>{student.id}</Text>
                <Text style={styles.summaryText}>
                  Fee received for {purpose}. Parent / guardian:{" "}
                  {student.parentName || "N/A"}.
                </Text>
              </View>
              <View style={styles.summaryRight}>
                <Text style={styles.amountLabel}>Amount Received</Text>
                <Text style={styles.amount}>{currency(amountReceived)}</Text>
                <Text style={styles.amountWords}>{amountWords}</Text>
              </View>
            </View>

            <View style={styles.splitRow}>
              <View style={[styles.panel, styles.panelLeft]}>
                <Text style={styles.sectionTitle}>Receipt Details</Text>
                <DetailField label="Branch">{getBranchName(branch)}</DetailField>
                <DetailField label="Receipt No">{receiptNo}</DetailField>
                <DetailField label="Date">{dateLabel}</DetailField>
                <DetailField label="Time" last>
                  {timeLabel}
                </DetailField>
              </View>
              <View style={[styles.panel, styles.panelRight]}>
                <Text style={styles.sectionTitle}>Student Record</Text>
                <DetailField label="Student Name">{student.name}</DetailField>
                <DetailField label="SKF ID">{student.id}</DetailField>
                <DetailField label="Parent / Guardian">
                  {student.parentName || "N/A"}
                </DetailField>
                <DetailField label="Purpose" last>
                  {purpose}
                </DetailField>
              </View>
            </View>

            <View style={styles.settlementPanel}>
              <View style={styles.settlementHeader}>
                <Text style={styles.settlementTitle}>Settlement Summary</Text>
                <Text style={styles.paidPill}>Verified Paid</Text>
              </View>
              {creditApplied > 0 && (
                <>
                  <SettlementRow label="Monthly fee" value={currency(baseFee)} />
                  <SettlementRow
                    credit
                    label="Referral credit"
                    value={`- ${currency(creditApplied)}`}
                  />
                </>
              )}
              <SettlementRow
                label="Amount received"
                total
                value={currency(amountReceived)}
              />
            </View>

            <View style={styles.footerRow}>
              <View style={styles.statusBlock}>
                <Text style={styles.status}>Payment Received with Thanks</Text>
                <Text style={styles.statusText}>
                  This receipt confirms fee collection for the period shown
                  above and should be retained for records.
                </Text>
              </View>
              <View style={styles.stampWrap}>
                <Image src={stampSrc} style={styles.stamp} />
                <View style={styles.signatureLine} />
                <Text style={styles.signatureLabel}>Authorized Seal</Text>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This receipt is issued for confirmation and record purposes only.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
