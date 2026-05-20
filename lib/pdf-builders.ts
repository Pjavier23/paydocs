import type { PaystubData, Form1099NECData, Form1099MISCData, InvoiceData } from '@/types'

const fmt = (n: number) => `$${(n || 0).toFixed(2)}`

const GRAY = '#6b7280'
const LIGHT = '#9ca3af'
const DARK = '#0f0f1a'
const BORDER_LIGHT = '#e5e7eb'

type Row = Record<string, unknown>

function sectionLabel(text: string): Row {
  return { text: text.toUpperCase(), fontSize: 7, bold: true, color: LIGHT, marginBottom: 5 }
}

function kvRow(label: string, value: string): Row[] {
  return [{ columns: [{ text: label, color: GRAY, fontSize: 9 }, { text: value, alignment: 'right', fontSize: 9 }], marginBottom: 2 }]
}

function hrBold(label: string, value: string): Row[] {
  return [
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: BORDER_LIGHT }], marginBottom: 3, marginTop: 2 },
    { columns: [{ text: label, bold: true, fontSize: 9 }, { text: value, alignment: 'right', bold: true, fontSize: 9 }], marginBottom: 3 },
  ]
}

function paystubPage(d: PaystubData, copyLabel: string): Row[] {
  const totalDed = d.federalTax + d.stateTax + d.socialSecurity + d.medicare + d.healthInsurance + d.otherDeduction
  const netPay = d.grossPay - totalDed

  const deductionRows: Row[] = [
    ...kvRow('Federal Income Tax', fmt(d.federalTax)),
    ...kvRow(`${d.stateCode} State Tax`, fmt(d.stateTax)),
    ...kvRow('Social Security (6.2%)', fmt(d.socialSecurity)),
    ...kvRow('Medicare (1.45%)', fmt(d.medicare)),
    ...(d.healthInsurance > 0 ? kvRow('Health Insurance', fmt(d.healthInsurance)) : []),
    ...(d.otherDeduction > 0 ? kvRow(d.otherDeductionLabel || 'Other', fmt(d.otherDeduction)) : []),
    ...hrBold('TOTAL DEDUCTIONS', fmt(totalDed)),
  ]

  const earningRows: Row[] = [
    ...kvRow(
      d.payType === 'hourly' ? `Regular (${d.hoursWorked} hrs @ ${fmt(d.hourlyRate)})` : 'Salary',
      fmt(d.grossPay),
    ),
    ...(d.overtimeHours > 0
      ? kvRow(`Overtime (${d.overtimeHours} hrs)`, fmt(d.overtimeHours * (d.overtimeRate || d.hourlyRate * 1.5)))
      : []),
    ...hrBold('GROSS PAY', fmt(d.grossPay)),
  ]

  return [
    { text: copyLabel.toUpperCase(), fontSize: 7, bold: true, color: LIGHT, characterSpacing: 2, marginBottom: 8 },
    {
      columns: [
        {
          stack: [
            { text: 'PAY STATEMENT', fontSize: 14, bold: true, marginBottom: 3 },
            { text: `Pay Date: ${d.payDate}  |  Period: ${d.payPeriodStart} – ${d.payPeriodEnd}  |  Check #${d.checkNumber}`, fontSize: 8, color: GRAY, marginBottom: 10 },
            { text: d.companyName, bold: true, fontSize: 10, marginBottom: 2 },
            { text: d.companyAddress, color: GRAY, fontSize: 9 },
            { text: d.companyCity, color: GRAY, fontSize: 9 },
            { text: `EIN: ${d.companyEIN}`, color: GRAY, fontSize: 9 },
          ],
        },
        {
          stack: [
            { text: d.empName, bold: true, fontSize: 10, alignment: 'right', marginBottom: 2 },
            { text: d.empAddress, color: GRAY, fontSize: 9, alignment: 'right' },
            { text: d.empCity, color: GRAY, fontSize: 9, alignment: 'right' },
            { text: `SSN: ${d.empSSN}`, color: GRAY, fontSize: 9, alignment: 'right' },
            { text: `Filing: ${d.empFilingStatus}`, color: GRAY, fontSize: 9, alignment: 'right' },
          ],
        },
      ],
      marginBottom: 14,
    },
    {
      columns: [
        { stack: [sectionLabel('EARNINGS'), ...earningRows], width: '50%' },
        { stack: [sectionLabel('DEDUCTIONS'), ...deductionRows], width: '50%' },
      ],
      columnGap: 16,
      marginBottom: 12,
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: DARK }], marginBottom: 8 },
    {
      columns: [
        {
          stack: [
            sectionLabel('YEAR-TO-DATE'),
            {
              columns: [
                { stack: [{ text: 'Gross', color: GRAY, fontSize: 8 }, { text: fmt(d.ytdGross), bold: true, fontSize: 9 }], width: 'auto' },
                { stack: [{ text: 'Federal', color: GRAY, fontSize: 8 }, { text: fmt(d.ytdFederal), bold: true, fontSize: 9 }], width: 'auto' },
                { stack: [{ text: d.stateCode, color: GRAY, fontSize: 8 }, { text: fmt(d.ytdState), bold: true, fontSize: 9 }], width: 'auto' },
                { stack: [{ text: 'SS', color: GRAY, fontSize: 8 }, { text: fmt(d.ytdSS), bold: true, fontSize: 9 }], width: 'auto' },
                { stack: [{ text: 'Medicare', color: GRAY, fontSize: 8 }, { text: fmt(d.ytdMedicare), bold: true, fontSize: 9 }], width: 'auto' },
                { stack: [{ text: 'Net', color: GRAY, fontSize: 8 }, { text: fmt(d.ytdNet), bold: true, fontSize: 9 }], width: 'auto' },
              ],
              columnGap: 16,
            },
          ],
        },
        {
          stack: [sectionLabel('NET PAY'), { text: fmt(netPay), fontSize: 20, bold: true, alignment: 'right' }],
          alignment: 'right',
        },
      ],
    },
  ]
}

export function buildPaystub(d: PaystubData): Record<string, unknown> {
  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      ...paystubPage(d, 'EMPLOYER COPY'),
      { text: '', pageBreak: 'before' },
      ...paystubPage(d, 'EMPLOYEE COPY'),
    ],
  }
}

export function buildNEC(d: Form1099NECData): Record<string, unknown> {
  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      { text: `Form 1099-NEC — Tax Year ${d.taxYear}`, fontSize: 14, bold: true, marginBottom: 3 },
      { text: 'Nonemployee Compensation', color: GRAY, fontSize: 8, marginBottom: 14 },
      {
        columns: [
          {
            stack: [
              sectionLabel('PAYER'),
              { text: d.payerName, bold: true, fontSize: 10 },
              { text: d.payerAddress, fontSize: 9 },
              { text: d.payerCity, fontSize: 9 },
              { text: `EIN: ${d.payerEIN}`, fontSize: 9 },
              { text: d.payerPhone, fontSize: 9 },
            ],
            margin: [0, 0, 8, 0],
          },
          {
            stack: [
              sectionLabel('RECIPIENT'),
              { text: d.recipientName, bold: true, fontSize: 10 },
              { text: d.recipientAddress, fontSize: 9 },
              { text: d.recipientCity, fontSize: 9 },
              { text: `TIN: ${d.recipientTIN}`, fontSize: 9 },
              ...(d.recipientAccountNo ? [{ text: `Acct: ${d.recipientAccountNo}`, fontSize: 9 }] : []),
            ],
          },
        ],
        marginBottom: 14,
      },
      {
        columns: [
          { stack: [sectionLabel('BOX 1 — NONEMPLOYEE COMPENSATION'), { text: fmt(d.nonemployeeComp), fontSize: 18, bold: true }], width: '*' },
          { stack: [sectionLabel('BOX 4 — FEDERAL TAX WITHHELD'), { text: fmt(d.federalTaxWithheld), fontSize: 14, bold: true }], width: 'auto' },
          { stack: [sectionLabel(`BOX 6 — ${d.stateCode} TAX WITHHELD`), { text: fmt(d.stateTaxWithheld), fontSize: 14, bold: true }], width: 'auto' },
        ],
        columnGap: 12,
        marginBottom: 16,
      },
      { text: 'FOR PRINT & MAIL ONLY — NOT FOR E-FILE', fontSize: 7, color: LIGHT },
    ],
  }
}

export function buildMISC(d: Form1099MISCData): Record<string, unknown> {
  const boxes: [string, number][] = [
    ['Box 1 — Rents', d.rents], ['Box 2 — Royalties', d.royalties],
    ['Box 3 — Other Income', d.otherIncome], ['Box 4 — Federal Tax Withheld', d.federalTaxWithheld],
    ['Box 5 — Fishing Boat Proceeds', d.fishingBoatProceeds], ['Box 6 — Medical Payments', d.medicalPayments],
    ['Box 8 — Substitute Payments', d.substitutePayments], ['Box 9 — Crop Insurance', d.cropInsurance],
    ['Box 10 — Gross Proceeds to Attorney', d.grossAttorney],
    [`Box 16 — ${d.stateCode} Tax Withheld`, d.stateTaxWithheld],
  ].filter(([, v]) => (v as number) > 0) as [string, number][]

  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      { text: `Form 1099-MISC — Tax Year ${d.taxYear}`, fontSize: 14, bold: true, marginBottom: 3 },
      { text: 'Miscellaneous Information', color: GRAY, fontSize: 8, marginBottom: 14 },
      {
        columns: [
          {
            stack: [sectionLabel('PAYER'), { text: d.payerName, bold: true, fontSize: 10 }, { text: d.payerAddress, fontSize: 9 }, { text: d.payerCity, fontSize: 9 }, { text: `EIN: ${d.payerEIN}`, fontSize: 9 }],
            margin: [0, 0, 8, 0],
          },
          {
            stack: [sectionLabel('RECIPIENT'), { text: d.recipientName, bold: true, fontSize: 10 }, { text: d.recipientAddress, fontSize: 9 }, { text: d.recipientCity, fontSize: 9 }, { text: `TIN: ${d.recipientTIN}`, fontSize: 9 }],
          },
        ],
        marginBottom: 14,
      },
      ...boxes.map(([label, val]) => ({ stack: [sectionLabel(label), { text: fmt(val), fontSize: 13, bold: true }], marginBottom: 8 })),
      { text: 'FOR PRINT & MAIL ONLY — NOT FOR E-FILE', fontSize: 7, color: LIGHT },
    ],
  }
}

export function buildInvoice(d: InvoiceData): Record<string, unknown> {
  const subtotal = d.items.reduce((s, i) => s + i.amount, 0)
  const discountAmt = d.discount > 0 ? subtotal * (d.discount / 100) : 0
  const taxAmt = d.taxRate > 0 ? (subtotal - discountAmt) * (d.taxRate / 100) : 0
  const total = subtotal - discountAmt + taxAmt

  const lineRows = d.items.map(item => [
    { text: item.description, fontSize: 9 },
    { text: String(item.quantity), alignment: 'right', fontSize: 9 },
    { text: fmt(item.rate), alignment: 'right', fontSize: 9 },
    { text: fmt(item.amount), alignment: 'right', bold: true, fontSize: 9 },
  ])

  const totalsRows: Row[][] = [
    [{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: 'Subtotal', color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: fmt(subtotal), fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[],
  ]
  if (discountAmt > 0) {
    totalsRows.push([{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: `Discount (${d.discount}%)`, color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: `– ${fmt(discountAmt)}`, color: '#ef4444', fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[])
  }
  if (taxAmt > 0) {
    totalsRows.push([{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: `Tax (${d.taxRate}%)`, color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: fmt(taxAmt), fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[])
  }
  totalsRows.push([{ text: '', border: [false, true, false, false] }, { text: '', border: [false, true, false, false] }, { text: `TOTAL (${d.currency})`, bold: true, fontSize: 11, alignment: 'right', border: [false, true, false, false] }, { text: fmt(total), bold: true, fontSize: 11, alignment: 'right', border: [false, true, false, false] }] as Row[])

  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      {
        columns: [
          { stack: [{ text: 'INVOICE', fontSize: 22, bold: true }, { text: `#${d.invoiceNumber}`, color: GRAY, fontSize: 9, marginTop: 2 }] },
          { stack: [{ text: `Date: ${d.invoiceDate}`, color: GRAY, fontSize: 9, alignment: 'right' }, { text: `Due: ${d.dueDate}`, color: GRAY, fontSize: 9, alignment: 'right', marginTop: 2 }, { text: `Terms: ${d.paymentTerms}`, color: GRAY, fontSize: 9, alignment: 'right', marginTop: 2 }] },
        ],
        marginBottom: 20,
      },
      {
        columns: [
          {
            stack: [
              sectionLabel('FROM'),
              { text: d.fromName, bold: true, fontSize: 10, marginBottom: 2 },
              ...(d.fromAddress ? [{ text: d.fromAddress, color: GRAY, fontSize: 9 }] : []),
              ...(d.fromCity ? [{ text: d.fromCity, color: GRAY, fontSize: 9 }] : []),
              ...(d.fromEmail ? [{ text: d.fromEmail, color: GRAY, fontSize: 9 }] : []),
              ...(d.fromPhone ? [{ text: d.fromPhone, color: GRAY, fontSize: 9 }] : []),
            ],
            margin: [0, 0, 8, 0],
          },
          {
            stack: [
              sectionLabel('BILL TO'),
              { text: d.toName, bold: true, fontSize: 10, marginBottom: 2 },
              ...(d.toAddress ? [{ text: d.toAddress, color: GRAY, fontSize: 9 }] : []),
              ...(d.toCity ? [{ text: d.toCity, color: GRAY, fontSize: 9 }] : []),
              ...(d.toEmail ? [{ text: d.toEmail, color: GRAY, fontSize: 9 }] : []),
            ],
          },
        ],
        marginBottom: 16,
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [
            [
              { text: 'Description', bold: true, fontSize: 7, color: '#d4f545', fillColor: DARK, border: [false, false, false, false] },
              { text: 'Qty', bold: true, fontSize: 7, color: '#d4f545', fillColor: DARK, alignment: 'right', border: [false, false, false, false] },
              { text: 'Rate', bold: true, fontSize: 7, color: '#d4f545', fillColor: DARK, alignment: 'right', border: [false, false, false, false] },
              { text: 'Amount', bold: true, fontSize: 7, color: '#d4f545', fillColor: DARK, alignment: 'right', border: [false, false, false, false] },
            ],
            ...lineRows.map((row, idx) =>
              row.map(cell => ({
                ...cell,
                fillColor: idx % 2 === 0 ? '#f9f9f7' : 'white',
                border: [false, false, false, true],
                borderColor: [BORDER_LIGHT, BORDER_LIGHT, BORDER_LIGHT, BORDER_LIGHT],
              }))
            ),
            ...totalsRows,
          ],
        },
        layout: { defaultBorder: false, hLineColor: () => BORDER_LIGHT, vLineColor: () => BORDER_LIGHT },
        marginBottom: 16,
      },
      ...(d.notes ? [sectionLabel('NOTES'), { text: d.notes, fontSize: 9, color: '#374151', marginBottom: 4 }] : []),
    ],
  }
}
