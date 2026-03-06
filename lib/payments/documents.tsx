import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 42,
    paddingHorizontal: 36,
    fontSize: 10,
    color: "#172033",
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#d5dce6",
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#4e5b73",
    marginBottom: 2,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d5dce6",
    borderStyle: "solid",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e9f0",
  },
  headerRow: {
    backgroundColor: "#eef3f8",
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: "#e4e9f0",
  },
  wide: {
    width: "30%",
  },
  medium: {
    width: "18%",
  },
  narrow: {
    width: "16%",
  },
  fullWidthCard: {
    borderWidth: 1,
    borderColor: "#d5dce6",
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  paragraph: {
    lineHeight: 1.5,
    marginBottom: 8,
  },
  totalStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#172033",
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 16,
  },
  footer: {
    position: "absolute",
    left: 36,
    right: 36,
    bottom: 18,
    color: "#6c7890",
    fontSize: 9,
  },
});

function formatMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}

type PaymentHistoryRow = {
  id: number;
  paidAt: string | Date;
  source: string;
  kind: string;
  designation: string;
  amountCents: number;
  deductibleAmountCents: number;
  currency: string;
  classificationStatus: string;
};

export async function renderPaymentHistoryPdf(input: {
  title: string;
  subtitle: string;
  rows: PaymentHistoryRow[];
}) {
  const totalAmount = input.rows.reduce((sum, row) => sum + row.amountCents, 0);
  const deductibleAmount = input.rows.reduce((sum, row) => sum + row.deductibleAmountCents, 0);

  return renderToBuffer(
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{input.title}</Text>
          <Text style={styles.subtitle}>{input.subtitle}</Text>
        </View>

        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.medium]}>Date</Text>
            <Text style={[styles.cell, styles.medium]}>Source</Text>
            <Text style={[styles.cell, styles.medium]}>Type</Text>
            <Text style={[styles.cell, styles.wide]}>Designation</Text>
            <Text style={[styles.cell, styles.narrow]}>Amount</Text>
            <Text style={[styles.cell, styles.narrow]}>Deductible</Text>
          </View>
          {input.rows.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={[styles.cell, styles.medium]}>{formatDate(row.paidAt)}</Text>
              <Text style={[styles.cell, styles.medium]}>{row.source}</Text>
              <Text style={[styles.cell, styles.medium]}>{row.kind}</Text>
              <Text style={[styles.cell, styles.wide]}>{row.designation}</Text>
              <Text style={[styles.cell, styles.narrow]}>{formatMoney(row.amountCents, row.currency)}</Text>
              <Text style={[styles.cell, styles.narrow]}>{formatMoney(row.deductibleAmountCents, row.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalStrip}>
          <Text>Total paid: {formatMoney(totalAmount)}</Text>
          <Text>Total deductible: {formatMoney(deductibleAmount)}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Mekor Habracha payment export
        </Text>
      </Page>
    </Document>,
  );
}

export async function renderYearEndLetterPdf(input: {
  donorName: string;
  taxYear: number;
  organizationLegalName: string;
  organizationEin: string;
  totalDeductibleAmountCents: number;
  payments: Array<{ paidAt: string; designation: string; deductibleAmountCents: number }>;
}) {
  return renderToBuffer(
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{input.taxYear} Annual Donation Summary</Text>
          <Text style={styles.subtitle}>{input.organizationLegalName}</Text>
          <Text style={styles.subtitle}>EIN: {input.organizationEin}</Text>
        </View>

        <View style={styles.fullWidthCard}>
          <Text style={styles.paragraph}>Dear {input.donorName},</Text>
          <Text style={styles.paragraph}>
            This letter summarizes charitable contributions received by {input.organizationLegalName} during tax year {input.taxYear}. Only qualifying deductible amounts are included below.
          </Text>
          <Text style={styles.paragraph}>
            Total deductible contributions: {formatMoney(input.totalDeductibleAmountCents)}
          </Text>
          <Text style={styles.paragraph}>
            No goods or services are included in this annual deductible total unless explicitly reduced in the line-item detail.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifying contributions</Text>
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, styles.medium]}>Date</Text>
              <Text style={[styles.cell, styles.wide]}>Designation</Text>
              <Text style={[styles.cell, styles.medium]}>Deductible amount</Text>
            </View>
            {input.payments.map((payment, index) => (
              <View key={`${payment.paidAt}-${index}`} style={styles.row}>
                <Text style={[styles.cell, styles.medium]}>{formatDate(payment.paidAt)}</Text>
                <Text style={[styles.cell, styles.wide]}>{payment.designation}</Text>
                <Text style={[styles.cell, styles.medium]}>{formatMoney(payment.deductibleAmountCents)}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Please retain this letter with your tax records.
        </Text>
      </Page>
    </Document>,
  );
}

export async function renderTaxReceiptPdf(input: {
  receiptNumber: string;
  donorName: string;
  donationDate: string;
  donationAmountCents: number;
  deductibleAmountCents: number;
  designation: string;
  organizationLegalName: string;
  organizationEin: string;
  taxDeductibilityStatement: string;
  goodsServicesStatement: string;
}) {
  return renderToBuffer(
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Donation receipt</Text>
          <Text style={styles.subtitle}>{input.organizationLegalName}</Text>
          <Text style={styles.subtitle}>EIN: {input.organizationEin}</Text>
        </View>

        <View style={styles.fullWidthCard}>
          <Text style={styles.paragraph}>Receipt number: {input.receiptNumber}</Text>
          <Text style={styles.paragraph}>Donor: {input.donorName}</Text>
          <Text style={styles.paragraph}>Donation date: {formatDate(input.donationDate)}</Text>
          <Text style={styles.paragraph}>Designation: {input.designation}</Text>
          <Text style={styles.paragraph}>Contribution amount: {formatMoney(input.donationAmountCents)}</Text>
          <Text style={styles.paragraph}>Deductible amount: {formatMoney(input.deductibleAmountCents)}</Text>
          <Text style={styles.paragraph}>{input.taxDeductibilityStatement}</Text>
          <Text style={styles.paragraph}>{input.goodsServicesStatement}</Text>
        </View>

        <Text style={styles.footer} fixed>
          Please retain this receipt for your tax records.
        </Text>
      </Page>
    </Document>,
  );
}
