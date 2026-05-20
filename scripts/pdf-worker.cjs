// Runs as a child process — completely outside Next.js bundler.
// Reads {type, data} as JSON from stdin, writes PDF buffer as base64 to stdout.
'use strict'
const React = require('react')
const { renderToBuffer, Document, Page, Text, View, StyleSheet } = require('@react-pdf/renderer')

const fmt = (n) => `$${(n || 0).toFixed(2)}`

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 9, color: '#0f0f1a' },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  subtitle: { fontSize: 8, color: '#6b7280', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  label: { color: '#6b7280' },
  sectionTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, color: '#9ca3af', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb', paddingBottom: 3, marginBottom: 6 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#0f0f1a', marginVertical: 16 },
  box: { borderWidth: 0.5, borderColor: '#d1d5db', padding: 8, marginBottom: 8 },
  netPay: { fontSize: 20, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  copyLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 2, color: '#9ca3af', marginBottom: 8 },
})

function PaystubPDF({ d }) {
  const totalDed = d.federalTax + d.stateTax + d.socialSecurity + d.medicare + d.healthInsurance + d.otherDeduction
  const netPay = d.grossPay - totalDed

  const copy = (label) => React.createElement(Page, { size: 'LETTER', style: styles.page },
    React.createElement(Text, { style: styles.copyLabel }, label),
    React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 } },
      React.createElement(View, null,
        React.createElement(Text, { style: styles.title }, 'PAY STATEMENT'),
        React.createElement(Text, { style: styles.subtitle }, `Pay Date: ${d.payDate}  |  Period: ${d.payPeriodStart} – ${d.payPeriodEnd}  |  Check #${d.checkNumber}`),
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 10 } }, d.companyName),
        React.createElement(Text, { style: styles.label }, d.companyAddress),
        React.createElement(Text, { style: styles.label }, d.companyCity),
        React.createElement(Text, { style: styles.label }, `EIN: ${d.companyEIN}`),
      ),
      React.createElement(View, { style: { textAlign: 'right' } },
        React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 10 } }, d.empName),
        React.createElement(Text, { style: styles.label }, d.empAddress),
        React.createElement(Text, { style: styles.label }, d.empCity),
        React.createElement(Text, { style: styles.label }, `SSN: ${d.empSSN}`),
        React.createElement(Text, { style: styles.label }, `Filing: ${d.empFilingStatus}`),
      ),
    ),
    React.createElement(View, { style: { flexDirection: 'row', gap: 16 } },
      React.createElement(View, { style: { flex: 1 } },
        React.createElement(Text, { style: styles.sectionTitle }, 'EARNINGS'),
        React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, d.payType === 'hourly' ? `Regular (${d.hoursWorked} hrs @ ${fmt(d.hourlyRate)})` : 'Salary'),
          React.createElement(Text, null, fmt(d.grossPay)),
        ),
        d.overtimeHours > 0 ? React.createElement(View, { style: styles.row },
          React.createElement(Text, { style: styles.label }, `Overtime (${d.overtimeHours} hrs)`),
          React.createElement(Text, null, fmt(d.overtimeHours * (d.overtimeRate || d.hourlyRate * 1.5))),
        ) : null,
        React.createElement(View, { style: { ...styles.row, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 4, marginTop: 4 } },
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'GROSS PAY'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, fmt(d.grossPay)),
        ),
      ),
      React.createElement(View, { style: { flex: 1 } },
        React.createElement(Text, { style: styles.sectionTitle }, 'DEDUCTIONS'),
        ...[
          ['Federal Income Tax', d.federalTax],
          [`${d.stateCode} State Tax`, d.stateTax],
          ['Social Security (6.2%)', d.socialSecurity],
          ['Medicare (1.45%)', d.medicare],
          d.healthInsurance > 0 ? ['Health Insurance', d.healthInsurance] : null,
          d.otherDeduction > 0 ? [d.otherDeductionLabel || 'Other', d.otherDeduction] : null,
        ].filter(Boolean).map(([l, v]) =>
          React.createElement(View, { key: l, style: styles.row },
            React.createElement(Text, { style: styles.label }, l),
            React.createElement(Text, null, fmt(v)),
          )
        ),
        React.createElement(View, { style: { ...styles.row, borderTopWidth: 0.5, borderTopColor: '#e5e7eb', paddingTop: 4, marginTop: 4 } },
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, 'TOTAL DEDUCTIONS'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, fmt(totalDed)),
        ),
      ),
    ),
    React.createElement(View, { style: { borderTopWidth: 2, borderTopColor: '#0f0f1a', marginTop: 12, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' } },
      React.createElement(View, null,
        React.createElement(Text, { style: styles.sectionTitle }, 'YEAR-TO-DATE'),
        React.createElement(View, { style: { flexDirection: 'row', gap: 24 } },
          ...[['Gross', d.ytdGross], ['Federal', d.ytdFederal], [d.stateCode, d.ytdState], ['SS', d.ytdSS], ['Medicare', d.ytdMedicare], ['Net', d.ytdNet]].map(([l, v]) =>
            React.createElement(View, { key: l },
              React.createElement(Text, { style: styles.label }, l),
              React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, fmt(v)),
            )
          ),
        ),
      ),
      React.createElement(View, { style: { textAlign: 'right' } },
        React.createElement(Text, { style: styles.sectionTitle }, 'NET PAY'),
        React.createElement(Text, { style: styles.netPay }, fmt(netPay)),
      ),
    ),
  )

  return React.createElement(Document, null, copy('EMPLOYER COPY'), copy('EMPLOYEE COPY'))
}

function NEC_PDF({ d }) {
  return React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.title }, `Form 1099-NEC — Tax Year ${d.taxYear}`),
      React.createElement(Text, { style: styles.subtitle }, 'Nonemployee Compensation'),
      React.createElement(View, { style: { flexDirection: 'row', gap: 24, marginBottom: 16 } },
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'PAYER'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, d.payerName),
          React.createElement(Text, null, d.payerAddress),
          React.createElement(Text, null, d.payerCity),
          React.createElement(Text, null, `EIN: ${d.payerEIN}`),
          React.createElement(Text, null, d.payerPhone),
        ),
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'RECIPIENT'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, d.recipientName),
          React.createElement(Text, null, d.recipientAddress),
          React.createElement(Text, null, d.recipientCity),
          React.createElement(Text, null, `TIN: ${d.recipientTIN}`),
          d.recipientAccountNo ? React.createElement(Text, null, `Acct: ${d.recipientAccountNo}`) : null,
        ),
      ),
      React.createElement(View, { style: { flexDirection: 'row', gap: 8 } },
        React.createElement(View, { style: { flex: 2, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'BOX 1 — NONEMPLOYEE COMPENSATION'),
          React.createElement(Text, { style: { fontSize: 18, fontFamily: 'Helvetica-Bold' } }, fmt(d.nonemployeeComp)),
        ),
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'BOX 4 — FEDERAL TAX WITHHELD'),
          React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold' } }, fmt(d.federalTaxWithheld)),
        ),
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, `BOX 6 — ${d.stateCode} TAX WITHHELD`),
          React.createElement(Text, { style: { fontSize: 14, fontFamily: 'Helvetica-Bold' } }, fmt(d.stateTaxWithheld)),
        ),
      ),
      React.createElement(Text, { style: { marginTop: 16, fontSize: 7, color: '#9ca3af' } }, 'FOR PRINT & MAIL ONLY — NOT FOR E-FILE'),
    )
  )
}

function MISC_PDF({ d }) {
  const boxes = [
    ['Box 1 — Rents', d.rents], ['Box 2 — Royalties', d.royalties],
    ['Box 3 — Other Income', d.otherIncome], ['Box 4 — Federal Tax Withheld', d.federalTaxWithheld],
    ['Box 5 — Fishing Boat Proceeds', d.fishingBoatProceeds], ['Box 6 — Medical Payments', d.medicalPayments],
    ['Box 8 — Substitute Payments', d.substitutePayments], ['Box 9 — Crop Insurance', d.cropInsurance],
    ['Box 10 — Gross Proceeds to Attorney', d.grossAttorney],
    [`Box 16 — ${d.stateCode} Tax Withheld`, d.stateTaxWithheld],
  ].filter(([, v]) => v > 0)

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(Text, { style: styles.title }, `Form 1099-MISC — Tax Year ${d.taxYear}`),
      React.createElement(Text, { style: styles.subtitle }, 'Miscellaneous Information'),
      React.createElement(View, { style: { flexDirection: 'row', gap: 24, marginBottom: 16 } },
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'PAYER'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, d.payerName),
          React.createElement(Text, null, d.payerAddress),
          React.createElement(Text, null, d.payerCity),
          React.createElement(Text, null, `EIN: ${d.payerEIN}`),
        ),
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'RECIPIENT'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold' } }, d.recipientName),
          React.createElement(Text, null, d.recipientAddress),
          React.createElement(Text, null, d.recipientCity),
          React.createElement(Text, null, `TIN: ${d.recipientTIN}`),
        ),
      ),
      React.createElement(View, { style: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 } },
        ...boxes.map(([label, val]) =>
          React.createElement(View, { key: label, style: { width: '48%', ...styles.box } },
            React.createElement(Text, { style: styles.sectionTitle }, label.toUpperCase()),
            React.createElement(Text, { style: { fontSize: 13, fontFamily: 'Helvetica-Bold' } }, fmt(val)),
          )
        ),
      ),
      React.createElement(Text, { style: { marginTop: 16, fontSize: 7, color: '#9ca3af' } }, 'FOR PRINT & MAIL ONLY — NOT FOR E-FILE'),
    )
  )
}

function Invoice_PDF({ d }) {
  const subtotal = d.items.reduce((s, i) => s + i.amount, 0)
  const discountAmt = d.discount > 0 ? subtotal * (d.discount / 100) : 0
  const taxAmt = d.taxRate > 0 ? (subtotal - discountAmt) * (d.taxRate / 100) : 0
  const total = subtotal - discountAmt + taxAmt

  return React.createElement(Document, null,
    React.createElement(Page, { size: 'LETTER', style: styles.page },
      React.createElement(View, { style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 } },
        React.createElement(View, null,
          React.createElement(Text, { style: { fontSize: 22, fontFamily: 'Helvetica-Bold' } }, 'INVOICE'),
          React.createElement(Text, { style: { fontSize: 9, color: '#6b7280', marginTop: 2 } }, `#${d.invoiceNumber}`),
        ),
        React.createElement(View, { style: { textAlign: 'right' } },
          React.createElement(Text, { style: { fontSize: 9, color: '#6b7280' } }, `Date: ${d.invoiceDate}`),
          React.createElement(Text, { style: { fontSize: 9, color: '#6b7280', marginTop: 2 } }, `Due: ${d.dueDate}`),
          React.createElement(Text, { style: { fontSize: 9, color: '#6b7280', marginTop: 2 } }, `Terms: ${d.paymentTerms}`),
        ),
      ),
      React.createElement(View, { style: { flexDirection: 'row', gap: 24, marginBottom: 20 } },
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'FROM'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', marginBottom: 2 } }, d.fromName),
          d.fromAddress ? React.createElement(Text, { style: { color: '#6b7280' } }, d.fromAddress) : null,
          d.fromCity ? React.createElement(Text, { style: { color: '#6b7280' } }, d.fromCity) : null,
          d.fromEmail ? React.createElement(Text, { style: { color: '#6b7280' } }, d.fromEmail) : null,
          d.fromPhone ? React.createElement(Text, { style: { color: '#6b7280' } }, d.fromPhone) : null,
        ),
        React.createElement(View, { style: { flex: 1, ...styles.box } },
          React.createElement(Text, { style: styles.sectionTitle }, 'BILL TO'),
          React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', marginBottom: 2 } }, d.toName),
          d.toAddress ? React.createElement(Text, { style: { color: '#6b7280' } }, d.toAddress) : null,
          d.toCity ? React.createElement(Text, { style: { color: '#6b7280' } }, d.toCity) : null,
          d.toEmail ? React.createElement(Text, { style: { color: '#6b7280' } }, d.toEmail) : null,
        ),
      ),
      React.createElement(View, { style: { flexDirection: 'row', backgroundColor: '#0f0f1a', padding: '6 8', marginBottom: 0 } },
        React.createElement(Text, { style: { flex: 4, color: '#d4f545', fontSize: 7, fontFamily: 'Helvetica-Bold' } }, 'Description'),
        React.createElement(Text, { style: { flex: 1, color: '#d4f545', fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' } }, 'Qty'),
        React.createElement(Text, { style: { flex: 1.5, color: '#d4f545', fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' } }, 'Rate'),
        React.createElement(Text, { style: { flex: 1.5, color: '#d4f545', fontSize: 7, fontFamily: 'Helvetica-Bold', textAlign: 'right' } }, 'Amount'),
      ),
      ...d.items.map((item, idx) =>
        React.createElement(View, {
          key: item.id,
          style: { flexDirection: 'row', padding: '5 8', backgroundColor: idx % 2 === 0 ? '#f9f9f7' : 'white', borderBottomWidth: 0.5, borderBottomColor: '#e5e7eb' },
        },
          React.createElement(Text, { style: { flex: 4, fontSize: 9 } }, item.description),
          React.createElement(Text, { style: { flex: 1, fontSize: 9, textAlign: 'right' } }, String(item.quantity)),
          React.createElement(Text, { style: { flex: 1.5, fontSize: 9, textAlign: 'right' } }, fmt(item.rate)),
          React.createElement(Text, { style: { flex: 1.5, fontSize: 9, fontFamily: 'Helvetica-Bold', textAlign: 'right' } }, fmt(item.amount)),
        )
      ),
      React.createElement(View, { style: { marginTop: 12, alignItems: 'flex-end' } },
        React.createElement(View, { style: { width: '40%' } },
          React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, 'Subtotal'),
            React.createElement(Text, null, fmt(subtotal)),
          ),
          discountAmt > 0 ? React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, `Discount (${d.discount}%)`),
            React.createElement(Text, { style: { color: '#ef4444' } }, `– ${fmt(discountAmt)}`),
          ) : null,
          taxAmt > 0 ? React.createElement(View, { style: styles.row },
            React.createElement(Text, { style: styles.label }, `Tax (${d.taxRate}%)`),
            React.createElement(Text, null, fmt(taxAmt)),
          ) : null,
          React.createElement(View, { style: { ...styles.row, borderTopWidth: 1.5, borderTopColor: '#0f0f1a', paddingTop: 4, marginTop: 4 } },
            React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 11 } }, `TOTAL (${d.currency})`),
            React.createElement(Text, { style: { fontFamily: 'Helvetica-Bold', fontSize: 11 } }, fmt(total)),
          ),
        ),
      ),
      d.notes ? React.createElement(View, { style: { marginTop: 20, ...styles.box } },
        React.createElement(Text, { style: styles.sectionTitle }, 'NOTES'),
        React.createElement(Text, { style: { fontSize: 9, color: '#374151' } }, d.notes),
      ) : null,
    )
  )
}

async function main() {
  let input = ''
  process.stdin.setEncoding('utf8')
  for await (const chunk of process.stdin) input += chunk

  const { type, data } = JSON.parse(input)

  let element
  if (type === 'paystub') element = React.createElement(PaystubPDF, { d: data })
  else if (type === '1099-nec') element = React.createElement(NEC_PDF, { d: data })
  else if (type === '1099-misc') element = React.createElement(MISC_PDF, { d: data })
  else if (type === 'invoice') element = React.createElement(Invoice_PDF, { d: data })
  else throw new Error(`Unknown type: ${type}`)

  const buf = await renderToBuffer(element)
  process.stdout.write(buf)
}

main().catch(e => { process.stderr.write(e.message); process.exit(1) })
