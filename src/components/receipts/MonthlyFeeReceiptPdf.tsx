/* eslint-disable jsx-a11y/alt-text -- React PDF Image is not a DOM image and has no alt prop. */
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
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

const colors = {
  ink: "#1a1f2e",
  muted: "#6b7280",
  line: "#e5e7eb",
  gold: "#b8860b",
  green: "#15803d",
  paper: "#ffffff",
  soft: "#f8fafc",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.paper,
    color: colors.ink,
    fontFamily: "Helvetica",
    fontSize: 11,
    padding: 28,
  },
  receipt: {
    borderColor: colors.line,
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 1.5,
    minHeight: "100%",
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    backgroundColor: colors.ink,
    paddingBottom: 24,
    paddingTop: 24,
  },
  logo: {
    borderColor: colors.gold,
    borderRadius: 40,
    borderStyle: "solid",
    borderWidth: 1.5,
    height: 78,
    marginBottom: 12,
    objectFit: "contain",
    width: 78,
  },
  brand: {
    color: colors.paper,
    fontSize: 33,
    fontWeight: "bold",
    letterSpacing: 7,
    lineHeight: 1,
    textAlign: "center",
  },
  association: {
    color: "#d4af37",
    fontSize: 10.5,
    fontWeight: "bold",
    letterSpacing: 1.2,
    marginTop: 8,
    textAlign: "center",
  },
  body: {
    flexGrow: 1,
    paddingBottom: 28,
    paddingLeft: 34,
    paddingRight: 34,
    paddingTop: 24,
  },
  titleBlock: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomStyle: "solid",
    borderBottomWidth: 1,
    marginBottom: 18,
    paddingBottom: 16,
  },
  title: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
  },
  row: {
    alignItems: "flex-start",
    borderBottomColor: colors.line,
    borderBottomStyle: "solid",
    borderBottomWidth: 0.6,
    flexDirection: "row",
    paddingBottom: 9,
    paddingTop: 9,
  },
  label: {
    color: "#4b5563",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    width: "38%",
  },
  value: {
    color: colors.ink,
    flexGrow: 1,
    fontSize: 13,
    fontWeight: "bold",
    lineHeight: 1.25,
    textAlign: "right",
    width: "62%",
  },
  idBadge: {
    alignSelf: "flex-end",
    backgroundColor: colors.gold,
    borderRadius: 3,
    color: colors.paper,
    fontSize: 8,
    fontWeight: "bold",
    marginTop: 4,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 2,
  },
  amountBox: {
    backgroundColor: colors.soft,
    borderColor: "#d4af37",
    borderRadius: 8,
    borderStyle: "solid",
    borderWidth: 1.5,
    marginTop: 22,
    padding: 16,
  },
  amountMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  amountMetaLabel: {
    color: colors.muted,
    fontSize: 10,
  },
  amountMetaValue: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: "bold",
  },
  amount: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "bold",
    lineHeight: 1.1,
    marginTop: 8,
    textAlign: "center",
  },
  amountWords: {
    color: colors.muted,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
  status: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 18,
    textAlign: "center",
  },
  stampWrap: {
    alignItems: "center",
    marginTop: 8,
  },
  stamp: {
    height: 74,
    objectFit: "contain",
    opacity: 0.9,
    width: 74,
  },
  footer: {
    backgroundColor: colors.ink,
    paddingBottom: 10,
    paddingTop: 10,
  },
  footerText: {
    color: "#d1d5db",
    fontSize: 7.5,
    textAlign: "center",
  },
});

function currency(amount: number) {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.value}>{children}</View>
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
      <Page size="A4" style={styles.page}>
        <View style={styles.receipt}>
          <View style={styles.header}>
            <Image src={logoSrc} style={styles.logo} />
            <Text style={styles.brand}>S K F</Text>
            <Text style={styles.association}>
              Sports Karate-do Fitness & Self Defence Association (R)
            </Text>
          </View>

          <View style={styles.body}>
            <View style={styles.titleBlock}>
              <Text style={styles.title}>Monthly Fee Receipt</Text>
              <Text style={styles.subtitle}>Payment confirmation</Text>
            </View>

            <DetailRow label="Branch">
              <Text>{getBranchName(branch)}</Text>
            </DetailRow>
            <DetailRow label="Receipt No">
              <Text>{receiptNo}</Text>
            </DetailRow>
            <DetailRow label="Date">
              <Text>{dateLabel}</Text>
            </DetailRow>
            <DetailRow label="Time">
              <Text>{timeLabel}</Text>
            </DetailRow>
            <DetailRow label="Parent / Guardian">
              <Text>{student.parentName || "N/A"}</Text>
            </DetailRow>
            <DetailRow label="Student Name">
              <Text>{student.name}</Text>
              <Text style={styles.idBadge}>{student.id}</Text>
            </DetailRow>
            <DetailRow label="Purpose">
              <Text>{purpose}</Text>
            </DetailRow>

            <View style={styles.amountBox}>
              {creditApplied > 0 && (
                <>
                  <View style={styles.amountMetaRow}>
                    <Text style={styles.amountMetaLabel}>Monthly fee</Text>
                    <Text style={styles.amountMetaValue}>{currency(baseFee)}</Text>
                  </View>
                  <View style={styles.amountMetaRow}>
                    <Text style={styles.amountMetaLabel}>Referral credit</Text>
                    <Text style={styles.amountMetaValue}>
                      - {currency(creditApplied)}
                    </Text>
                  </View>
                </>
              )}
              <Text style={styles.amount}>{currency(amountReceived)}</Text>
              <Text style={styles.amountWords}>{amountWords}</Text>
            </View>

            <Text style={styles.status}>Payment Received with Thanks</Text>
            <View style={styles.stampWrap}>
              <Image src={stampSrc} style={styles.stamp} />
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
