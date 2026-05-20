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

// ── 1099 shared table helpers ──────────────────────────────────────────────

const FORM_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#000000',
  vLineColor: () => '#000000',
  defaultBorder: false,
}

// 6 equal columns × 90pt = 540pt (fits between 36pt margins on LETTER)
const W6 = [90, 90, 90, 90, 90, 90]

const mkPh = () => ({ text: '', border: [false, false, false, false] })
const phs = (n: number): Row[] => Array.from({ length: n }, mkPh)

function mkCell(stack: Row[], cs: number, m = [3, 3, 3, 5]): Row {
  return { colSpan: cs, border: [true, true, true, true], stack, margin: m }
}

// Address/text field: small label on top, value below
function adr(label: string, value: string, cs: number): Row[] {
  return [
    mkCell([{ text: label, fontSize: 6, color: '#444444' }, { text: value || '—', fontSize: 9, marginTop: 2 }], cs),
    ...phs(cs - 1),
  ]
}

// Amount box: "N   Label" label, formatted dollar value below
function amtBox(num: string, label: string, value: string, cs: number, vSize = 12): Row[] {
  return [
    mkCell([
      { text: num ? `${num}   ${label}` : label, fontSize: 6, color: '#444444' },
      { text: value, fontSize: vSize, bold: true, marginTop: 3 },
    ], cs),
    ...phs(cs - 1),
  ]
}

// Empty box (for boxes we don't collect data for)
function emptyBox(num: string, label: string, cs: number): Row[] {
  return [
    mkCell([{ text: `${num}   ${label}`, fontSize: 6, color: '#444444' }, { text: '', marginTop: 10 }], cs),
    ...phs(cs - 1),
  ]
}

const NEC_DISCLAIMER = 'This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported. Amounts shown may be subject to self-employment (SE) tax.'

const MISC_DISCLAIMER = 'This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported.'

// ── 1099-NEC copy ──────────────────────────────────────────────────────────

function necCopy(d: Form1099NECData, copyLabel: string, copyDesc: string): Row[] {
  return [
    {
      columns: [
        { text: 'Department of the Treasury — Internal Revenue Service', fontSize: 7, color: '#555555' },
        { text: `${copyLabel} — ${copyDesc}`, fontSize: 7.5, bold: true, alignment: 'right', color: '#000000' },
      ],
      marginBottom: 3,
    },
    {
      table: {
        widths: W6,
        body: [
          // Row 1 — Payer info (cs 4) | Form meta (cs 2)
          [
            mkCell([
              { text: '□ VOID   □ CORRECTED', fontSize: 6, color: '#999999' },
              { text: "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.", fontSize: 6, color: '#444444', marginTop: 4 },
              { text: d.payerName || '—', bold: true, fontSize: 9, marginTop: 3 },
              { text: d.payerAddress || '', fontSize: 8 },
              { text: d.payerCity || '', fontSize: 8 },
              ...(d.payerPhone ? [{ text: d.payerPhone, fontSize: 8 }] : []),
            ], 4, [3, 3, 3, 10]),
            mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'OMB No. 1545-0116', fontSize: 7, alignment: 'right', color: '#555555' },
              { text: d.taxYear || '', fontSize: 22, bold: true, alignment: 'center', marginTop: 2, marginBottom: 2 },
              { text: 'Form 1099-NEC', fontSize: 9, bold: true, alignment: 'center' },
              { text: 'Nonemployee', fontSize: 7.5, alignment: 'center' },
              { text: 'Compensation', fontSize: 7.5, alignment: 'center' },
            ], 2, [4, 4, 4, 4]),
            mkPh(),
          ],
          // Row 2 — Payer TIN (cs 2) | Recipient TIN (cs 4)
          [...adr("PAYER'S TIN", d.payerEIN, 2), ...adr("RECIPIENT'S TIN", d.recipientTIN, 4)],
          // Row 3 — Recipient name (cs 6)
          [...adr("RECIPIENT'S name", d.recipientName, 6)],
          // Row 4 — Street address (cs 6)
          [...adr('Street address (including apt. no.)', d.recipientAddress, 6)],
          // Row 5 — City / State / ZIP (cs 6)
          [...adr('City or town, state or province, country, and ZIP or foreign postal code', d.recipientCity, 6)],
          // Row 6 — Account number (cs 4) | 2nd TIN not. (cs 2)
          [
            ...adr('Account number (see instructions)', d.recipientAccountNo || '', 4),
            mkCell([{ text: '2nd TIN not.', fontSize: 6, color: '#444444' }, { text: '', marginTop: 10 }], 2),
            mkPh(),
          ],
          // Row 7 — Box 1: Nonemployee comp (cs 3) | Box 2: Direct sales checkbox (cs 3)
          [
            ...amtBox('1', 'Nonemployee compensation', fmt(d.nonemployeeComp), 3, 16),
            mkCell([{ text: '2   Payer made direct sales totaling $5,000 or more of consumer products to recipient for resale  □', fontSize: 6, color: '#444444' }], 3, [3, 3, 3, 20]),
            mkPh(), mkPh(),
          ],
          // Row 8 — Box 4: Federal income tax withheld (cs 6)
          [...amtBox('4', 'Federal income tax withheld', fmt(d.federalTaxWithheld), 6, 13)],
          // Row 9 — Box 5 (cs 2) | Box 6 (cs 2) | Box 7 (cs 2)
          [
            ...amtBox('5', 'State tax withheld', fmt(d.stateTaxWithheld), 2, 11),
            ...amtBox('6', "State/Payer's state no.", `${d.stateCode || ''}   ${d.stateIdNo || ''}`, 2, 9),
            ...emptyBox('7', 'State income', 2),
          ],
        ],
      },
      layout: FORM_LAYOUT,
      marginBottom: 5,
    },
    { text: NEC_DISCLAIMER, fontSize: 6.5, color: '#555555', marginBottom: 4 },
  ]
}

export function buildNEC(d: Form1099NECData): Record<string, unknown> {
  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      ...necCopy(d, 'Copy B', 'For Recipient'),
      { text: '', pageBreak: 'before' },
      ...necCopy(d, 'Copy C', "For Payer's Records"),
    ],
  }
}

// ── 1099-MISC copy ─────────────────────────────────────────────────────────

function miscCopy(d: Form1099MISCData, copyLabel: string, copyDesc: string): Row[] {
  return [
    {
      columns: [
        { text: 'Department of the Treasury — Internal Revenue Service', fontSize: 7, color: '#555555' },
        { text: `${copyLabel} — ${copyDesc}`, fontSize: 7.5, bold: true, alignment: 'right', color: '#000000' },
      ],
      marginBottom: 3,
    },
    {
      table: {
        widths: W6,
        body: [
          // Row 1 — Payer info (cs 4) | Form meta (cs 2)
          [
            mkCell([
              { text: '□ VOID   □ CORRECTED', fontSize: 6, color: '#999999' },
              { text: "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.", fontSize: 6, color: '#444444', marginTop: 4 },
              { text: d.payerName || '—', bold: true, fontSize: 9, marginTop: 3 },
              { text: d.payerAddress || '', fontSize: 8 },
              { text: d.payerCity || '', fontSize: 8 },
              ...(d.payerPhone ? [{ text: d.payerPhone, fontSize: 8 }] : []),
            ], 4, [3, 3, 3, 10]),
            mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'OMB No. 1545-0115', fontSize: 7, alignment: 'right', color: '#555555' },
              { text: d.taxYear || '', fontSize: 22, bold: true, alignment: 'center', marginTop: 2, marginBottom: 2 },
              { text: 'Form 1099-MISC', fontSize: 9, bold: true, alignment: 'center' },
              { text: 'Miscellaneous', fontSize: 7.5, alignment: 'center' },
              { text: 'Information', fontSize: 7.5, alignment: 'center' },
            ], 2, [4, 4, 4, 4]),
            mkPh(),
          ],
          // Row 2 — Payer TIN (cs 2) | Recipient TIN (cs 4)
          [...adr("PAYER'S TIN", d.payerEIN, 2), ...adr("RECIPIENT'S TIN", d.recipientTIN, 4)],
          // Row 3 — Recipient name (cs 6)
          [...adr("RECIPIENT'S name", d.recipientName, 6)],
          // Row 4 — Street address (cs 6)
          [...adr('Street address (including apt. no.)', d.recipientAddress, 6)],
          // Row 5 — City / State / ZIP (cs 6)
          [...adr('City or town, state or province, country, and ZIP or foreign postal code', d.recipientCity, 6)],
          // Row 6 — Account number (cs 4) | FATCA filing requirement (cs 2)
          [
            ...adr('Account number (see instructions)', d.recipientAccountNo || '', 4),
            mkCell([{ text: 'FATCA filing requirement  □', fontSize: 6, color: '#444444' }, { text: '', marginTop: 10 }], 2),
            mkPh(),
          ],
          // Row 7 — Box 1: Rents (cs 3) | Box 2: Royalties (cs 3)
          [...amtBox('1', 'Rents', fmt(d.rents), 3), ...amtBox('2', 'Royalties', fmt(d.royalties), 3)],
          // Row 8 — Box 3: Other income (cs 3) | Box 4: Federal tax withheld (cs 3)
          [...amtBox('3', 'Other income', fmt(d.otherIncome), 3), ...amtBox('4', 'Federal income tax withheld', fmt(d.federalTaxWithheld), 3)],
          // Row 9 — Box 5: Fishing (cs 3) | Box 6: Medical (cs 3)
          [...amtBox('5', 'Fishing boat proceeds', fmt(d.fishingBoatProceeds), 3), ...amtBox('6', 'Medical and health care payments', fmt(d.medicalPayments), 3)],
          // Row 10 — Box 7: Direct sales checkbox (cs 3) | Box 8: Substitute payments (cs 3)
          [
            mkCell([{ text: '7   Payer made direct sales totaling $5,000 or more of consumer products to buyer (recipient) for resale  □', fontSize: 6, color: '#444444' }], 3, [3, 3, 3, 10]),
            mkPh(), mkPh(),
            ...amtBox('8', 'Substitute payments in lieu of dividends or interest', fmt(d.substitutePayments), 3),
          ],
          // Row 11 — Box 9: Crop insurance (cs 3) | Box 10: Gross proceeds attorney (cs 3)
          [...amtBox('9', 'Crop insurance proceeds', fmt(d.cropInsurance), 3), ...amtBox('10', 'Gross proceeds paid to an attorney', fmt(d.grossAttorney), 3)],
          // Row 12 — Box 11 (cs 3) | Box 12 (cs 3) — blank, not collected
          [...emptyBox('11', 'Fish purchased for resale', 3), ...emptyBox('12', 'Section 409A deferrals', 3)],
          // Row 13 — Box 13 (cs 3) | Box 14 (cs 3) — blank
          [...emptyBox('13', 'Excess golden parachute payments', 3), ...emptyBox('14', 'Nonqualified deferred compensation', 3)],
          // Row 14 — Box 15: State tax (cs 2) | Box 16: State/ID (cs 2) | Box 17: State income (cs 2)
          [
            ...amtBox('15', 'State tax withheld', fmt(d.stateTaxWithheld), 2, 10),
            ...amtBox('16', "State/Payer's state no.", `${d.stateCode || ''}   ${d.stateIdNo || ''}`, 2, 9),
            ...emptyBox('17', 'State income', 2),
          ],
        ],
      },
      layout: FORM_LAYOUT,
      marginBottom: 5,
    },
    { text: MISC_DISCLAIMER, fontSize: 6.5, color: '#555555', marginBottom: 4 },
  ]
}

export function buildMISC(d: Form1099MISCData): Record<string, unknown> {
  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      ...miscCopy(d, 'Copy B', 'For Recipient'),
      { text: '', pageBreak: 'before' },
      ...miscCopy(d, 'Copy C', "For Payer's Records"),
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
