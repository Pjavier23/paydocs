import type { PaystubData, Form1099NECData, Form1099MISCData, InvoiceData, FormW2Data } from '@/types'

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

// 12 columns × 45pt = 540pt — fine-grained control over IRS box proportions
const W12 = Array(12).fill(45)

const mkPh = () => ({ text: '', border: [false, false, false, false] })
const phs = (n: number): Row[] => Array.from({ length: n }, mkPh)

function mkCell(stack: Row[], cs: number, m = [3, 3, 3, 5]): Row {
  return { colSpan: cs, border: [true, true, true, true], stack, margin: m }
}

// Thin horizontal rule used inside stacked cells
function hr(w = 213): Row {
  return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: w, y2: 0, lineWidth: 0.4, lineColor: '#aaaaaa' }], margin: [0, 3, 0, 3] }
}

// Address/text field: small label on top, value below
function adr(label: string, value: string, cs: number): Row[] {
  return [
    mkCell([{ text: label, fontSize: 6, color: '#444444' }, { text: value || '—', fontSize: 9, marginTop: 2 }], cs),
    ...phs(cs - 1),
  ]
}

// Amount box: box-number + label on top, dollar value below
function amtBox(num: string, label: string, value: string, cs: number, vSize = 11): Row[] {
  return [
    mkCell([
      { text: num ? `${num}   ${label}` : label, fontSize: 6, color: '#444444' },
      { text: value, fontSize: vSize, bold: true, marginTop: 3 },
    ], cs),
    ...phs(cs - 1),
  ]
}

// Empty box (label only, no data collected for this box)
function emptyBox(num: string, label: string, cs: number): Row[] {
  return [
    mkCell([{ text: `${num}   ${label}`, fontSize: 6, color: '#444444' }, { text: '', marginTop: 9 }], cs),
    ...phs(cs - 1),
  ]
}

const NEC_DISCLAIMER = 'This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported. Amounts shown may be subject to self-employment (SE) tax.'
const MISC_DISCLAIMER = 'This is important tax information and is being furnished to the IRS. If you are required to file a return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported.'

// ── 1099-NEC ───────────────────────────────────────────────────────────────
// 12 columns × 45pt = 540pt. Payer left (7 cols = 315pt, 58%), meta+Box1 right (5 cols = 225pt, 42%).
// Box 1 lives in the upper-right corner alongside the form title — matching the actual IRS form.

function necCopy(d: Form1099NECData, copyLabel: string, copyDesc: string): Row[] {
  return [
    {
      columns: [
        { text: 'Department of the Treasury — Internal Revenue Service', fontSize: 7, color: '#555555' },
        { text: `${copyLabel} — ${copyDesc}`, fontSize: 7.5, bold: true, alignment: 'right' },
      ],
      marginBottom: 3,
    },
    {
      table: {
        widths: W12,
        body: [
          // ── Row 1: Payer info (7 cols) | OMB + Form title + Box 1 + Box 2 (5 cols) ──
          [
            mkCell([
              { text: '□ VOID   □ CORRECTED', fontSize: 6, color: '#999999' },
              { text: "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.", fontSize: 5.5, color: '#444444', marginTop: 4 },
              { text: d.payerName || '—', bold: true, fontSize: 9, marginTop: 3 },
              { text: d.payerAddress || '', fontSize: 8 },
              { text: d.payerCity || '', fontSize: 8 },
              ...(d.payerPhone ? [{ text: d.payerPhone, fontSize: 8 }] : []),
            ], 7, [3, 3, 3, 6]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'OMB No. 1545-0116', fontSize: 6.5, alignment: 'right', color: '#555555' },
              { text: d.taxYear || '', fontSize: 20, bold: true, alignment: 'center', marginTop: 1 },
              { text: 'Form 1099-NEC', fontSize: 8.5, bold: true, alignment: 'center', marginTop: 1 },
              { text: 'Nonemployee Compensation', fontSize: 6.5, alignment: 'center' },
              hr(),
              { text: '1   Nonemployee compensation', fontSize: 6, color: '#444444' },
              { text: fmt(d.nonemployeeComp), fontSize: 14, bold: true, marginTop: 2 },
              hr(),
              { text: '2   Payer made direct sales of $5,000 or more  □', fontSize: 5.5, color: '#444444', marginTop: 2 },
            ], 5, [3, 3, 3, 3]),
            mkPh(), mkPh(), mkPh(), mkPh(),
          ],
          // ── Row 2: Payer TIN (6 cols) | Recipient TIN (6 cols) ──
          [...adr("PAYER'S TIN", d.payerEIN, 6), ...adr("RECIPIENT'S TIN", d.recipientTIN, 6)],
          // ── Rows 3-5: Recipient info (full width) ──
          [...adr("RECIPIENT'S name", d.recipientName, 12)],
          [...adr('Street address (including apt. no.)', d.recipientAddress, 12)],
          [...adr('City or town, state or province, country, and ZIP or foreign postal code', d.recipientCity, 12)],
          // ── Row 6: Account number (8 cols) | 2nd TIN not. (4 cols) ──
          [
            ...adr('Account number (see instructions)', d.recipientAccountNo || '', 8),
            mkCell([{ text: '2nd TIN not.', fontSize: 6, color: '#444444' }, { text: '', marginTop: 9 }], 4),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Row 7: Box 4 Federal income tax withheld (full width) ──
          [...amtBox('4', 'Federal income tax withheld', fmt(d.federalTaxWithheld), 12, 12)],
          // ── Row 8: Box 5 (4 cols) | Box 6 (4 cols) | Box 7 (4 cols) ──
          [
            ...amtBox('5', 'State tax withheld', fmt(d.stateTaxWithheld), 4, 10),
            ...amtBox('6', "State/Payer's state no.", `${d.stateCode || ''}   ${d.stateIdNo || ''}`, 4, 9),
            ...emptyBox('7', 'State income', 4),
          ],
        ],
      },
      layout: FORM_LAYOUT,
      marginBottom: 6,
    },
    { text: NEC_DISCLAIMER, fontSize: 6.5, color: '#555555' },
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

// ── 1099-MISC ──────────────────────────────────────────────────────────────
// Same 12-column grid. Amount boxes in 2 equal columns (6 cols = 270pt each).
// State row at bottom in 3 columns (4 cols = 180pt each).

function miscCopy(d: Form1099MISCData, copyLabel: string, copyDesc: string): Row[] {
  return [
    {
      columns: [
        { text: 'Department of the Treasury — Internal Revenue Service', fontSize: 7, color: '#555555' },
        { text: `${copyLabel} — ${copyDesc}`, fontSize: 7.5, bold: true, alignment: 'right' },
      ],
      marginBottom: 3,
    },
    {
      table: {
        widths: W12,
        body: [
          // ── Row 1: Payer info (7 cols) | Form meta (5 cols) ──
          [
            mkCell([
              { text: '□ VOID   □ CORRECTED', fontSize: 6, color: '#999999' },
              { text: "PAYER'S name, street address, city or town, state or province, country, ZIP or foreign postal code, and telephone no.", fontSize: 5.5, color: '#444444', marginTop: 4 },
              { text: d.payerName || '—', bold: true, fontSize: 9, marginTop: 3 },
              { text: d.payerAddress || '', fontSize: 8 },
              { text: d.payerCity || '', fontSize: 8 },
              ...(d.payerPhone ? [{ text: d.payerPhone, fontSize: 8 }] : []),
            ], 7, [3, 3, 3, 6]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'OMB No. 1545-0115', fontSize: 6.5, alignment: 'right', color: '#555555' },
              { text: d.taxYear || '', fontSize: 20, bold: true, alignment: 'center', marginTop: 1 },
              { text: 'Form 1099-MISC', fontSize: 8.5, bold: true, alignment: 'center', marginTop: 1 },
              { text: 'Miscellaneous Information', fontSize: 6.5, alignment: 'center' },
            ], 5, [3, 3, 3, 3]),
            mkPh(), mkPh(), mkPh(), mkPh(),
          ],
          // ── Row 2: Payer TIN (6) | Recipient TIN (6) ──
          [...adr("PAYER'S TIN", d.payerEIN, 6), ...adr("RECIPIENT'S TIN", d.recipientTIN, 6)],
          // ── Rows 3-5: Recipient info ──
          [...adr("RECIPIENT'S name", d.recipientName, 12)],
          [...adr('Street address (including apt. no.)', d.recipientAddress, 12)],
          [...adr('City or town, state or province, country, and ZIP or foreign postal code', d.recipientCity, 12)],
          // ── Row 6: Account number (8) | FATCA (4) ──
          [
            ...adr('Account number (see instructions)', d.recipientAccountNo || '', 8),
            mkCell([{ text: 'FATCA filing requirement  □', fontSize: 6, color: '#444444' }, { text: '', marginTop: 9 }], 4),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Amount boxes in 2 equal columns (6 cols = 270pt each) ──
          [...amtBox('1', 'Rents', fmt(d.rents), 6), ...amtBox('2', 'Royalties', fmt(d.royalties), 6)],
          [...amtBox('3', 'Other income', fmt(d.otherIncome), 6), ...amtBox('4', 'Federal income tax withheld', fmt(d.federalTaxWithheld), 6)],
          [...amtBox('5', 'Fishing boat proceeds', fmt(d.fishingBoatProceeds), 6), ...amtBox('6', 'Medical and health care payments', fmt(d.medicalPayments), 6)],
          [
            mkCell([{ text: '7   Payer made direct sales of $5,000+ of consumer products to buyer for resale  □', fontSize: 6, color: '#444444', marginTop: 4 }], 6, [3, 3, 3, 6]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
            ...amtBox('8', 'Substitute payments in lieu of dividends or interest', fmt(d.substitutePayments), 6),
          ],
          [...amtBox('9', 'Crop insurance proceeds', fmt(d.cropInsurance), 6), ...amtBox('10', 'Gross proceeds paid to an attorney', fmt(d.grossAttorney), 6)],
          [...emptyBox('11', 'Fish purchased for resale', 6), ...emptyBox('12', 'Section 409A deferrals', 6)],
          [...emptyBox('13', 'Excess golden parachute payments', 6), ...emptyBox('14', 'Nonqualified deferred compensation', 6)],
          // ── State row: 3 equal columns (4 cols = 180pt each) ──
          [
            ...amtBox('15', 'State tax withheld', fmt(d.stateTaxWithheld), 4, 10),
            ...amtBox('16', "State/Payer's state no.", `${d.stateCode || ''}   ${d.stateIdNo || ''}`, 4, 9),
            ...emptyBox('17', 'State income', 4),
          ],
        ],
      },
      layout: FORM_LAYOUT,
      marginBottom: 6,
    },
    { text: MISC_DISCLAIMER, fontSize: 6.5, color: '#555555' },
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

// ── W-2 ───────────────────────────────────────────────────────────────────
// 12 columns × 45pt = 540pt.
// Layout mirrors IRS W-2 layout: employer info top-left, employee info below,
// then the numbered boxes in rows of 3 (4 cols each).

const SS_WAGE_CAP = 176100 // 2025 Social Security wage base

const W2_DISCLAIMER = "This information is being furnished to the Internal Revenue Service. If you are required to file a tax return, a negligence penalty or other sanction may be imposed on you if this income is taxable and the IRS determines that it has not been reported."

function w2Copy(d: FormW2Data, copyLabel: string, copyDesc: string): Row[] {
  const check = (v: boolean) => (v ? '☑' : '☐')

  return [
    {
      columns: [
        { text: 'Department of the Treasury — Internal Revenue Service', fontSize: 7, color: '#555555' },
        { text: `${copyLabel} — ${copyDesc}`, fontSize: 7.5, bold: true, alignment: 'right' },
      ],
      marginBottom: 3,
    },
    {
      table: {
        widths: W12,
        body: [
          // ── Row 1: Box a (SSN 4cols) | Box b (EIN 4cols) | Form header (4cols) ──
          [
            ...adr('a  Employee\'s social security number', d.employeeSSN, 4),
            ...adr('b  Employer identification number (EIN)', d.employerEIN, 4),
            mkCell([
              { text: 'OMB No. 1545-0008', fontSize: 6.5, alignment: 'right', color: '#555555' },
              { text: d.taxYear || '', fontSize: 18, bold: true, alignment: 'center', marginTop: 2 },
              { text: 'Form W-2', fontSize: 9, bold: true, alignment: 'center', marginTop: 1 },
              { text: 'Wage and Tax Statement', fontSize: 6, alignment: 'center' },
            ], 4, [3, 3, 3, 3]),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Row 2: Box c Employer info (8cols) | Box d Control # (4cols) ──
          [
            mkCell([
              { text: 'c  Employer\'s name, address, and ZIP code', fontSize: 5.5, color: '#444444' },
              { text: d.employerName || '—', bold: true, fontSize: 9, marginTop: 3 },
              { text: d.employerAddress || '', fontSize: 8 },
              { text: d.employerCity || '', fontSize: 8 },
            ], 8, [3, 3, 3, 8]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'd  Control number', fontSize: 5.5, color: '#444444' },
              { text: '', marginTop: 9 },
            ], 4, [3, 3, 3, 8]),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Row 3: Box e Employee name (8cols) | Box f SSN (4cols) ──
          [
            mkCell([
              { text: 'e  Employee\'s first name and initial    Last name    Suf.', fontSize: 5.5, color: '#444444' },
              { text: d.employeeName || '—', bold: true, fontSize: 9, marginTop: 3 },
            ], 8, [3, 3, 3, 6]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: 'f  Employee\'s address and ZIP code', fontSize: 5.5, color: '#444444' },
              { text: d.employeeAddress || '', fontSize: 8, marginTop: 3 },
              { text: d.employeeCity || '', fontSize: 8 },
            ], 4, [3, 3, 3, 6]),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Amount boxes — 3 per row (4 cols each) ──
          [
            ...amtBox('1', 'Wages, tips, other compensation', fmt(d.wages), 4, 12),
            ...amtBox('2', 'Federal income tax withheld', fmt(d.federalTax), 4, 12),
            ...amtBox('3', 'Social security wages', fmt(Math.min(d.ssWages, SS_WAGE_CAP)), 4, 12),
          ],
          [
            ...amtBox('4', 'Social security tax withheld', fmt(d.ssTax), 4, 12),
            ...amtBox('5', 'Medicare wages and tips', fmt(d.medicareWages), 4, 12),
            ...amtBox('6', 'Medicare tax withheld', fmt(d.medicareTax), 4, 12),
          ],
          [
            ...emptyBox('7', 'Social security tips', 4),
            ...emptyBox('8', 'Allocated tips', 4),
            ...emptyBox('10', 'Dependent care benefits', 4),
          ],
          // ── Box 11 (nonqualified) | Box 12 placeholder | Box 13 checkboxes ──
          [
            ...emptyBox('11', 'Nonqualified plans', 4),
            mkCell([
              { text: '12a  See instructions for box 12', fontSize: 5.5, color: '#444444' },
              { columns: [{ text: 'Code', color: '#444444', fontSize: 7 }, { text: '', alignment: 'right', fontSize: 9 }], marginTop: 6 },
            ], 4, [3, 3, 3, 5]),
            mkPh(), mkPh(), mkPh(),
            mkCell([
              { text: '13', fontSize: 5.5, color: '#444444', marginBottom: 4 },
              { text: `${check(d.statutoryEmployee)}  Statutory employee`, fontSize: 7, marginBottom: 3 },
              { text: `${check(d.retirementPlan)}  Retirement plan`, fontSize: 7, marginBottom: 3 },
              { text: `${check(d.thirdPartySickPay)}  Third-party sick pay`, fontSize: 7 },
            ], 4, [3, 3, 3, 3]),
            mkPh(), mkPh(), mkPh(),
          ],
          // ── Box 14 Other (full width) ──
          [
            mkCell([
              { text: '14  Other', fontSize: 5.5, color: '#444444' },
              { text: '', marginTop: 12 },
            ], 12, [3, 3, 3, 3]),
            mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(), mkPh(),
          ],
          // ── State row: Box 15 (4cols) | Box 16 (4cols) | Box 17 (4cols) ──
          [
            mkCell([
              { text: '15  State    Employer\'s state ID number', fontSize: 5.5, color: '#444444' },
              { text: `${d.employerState || ''}   ${d.employerStateId || ''}`, fontSize: 9, marginTop: 3 },
            ], 4, [3, 3, 3, 5]),
            mkPh(), mkPh(), mkPh(),
            ...amtBox('16', 'State wages, tips, etc.', fmt(d.stateWages), 4, 10),
            ...amtBox('17', 'State income tax', fmt(d.stateTax), 4, 10),
          ],
          // ── Local row: Box 18 (4cols) | Box 19 (4cols) | Box 20 (4cols) ──
          [
            ...amtBox('18', 'Local wages, tips, etc.', fmt(d.localWages), 4, 10),
            ...amtBox('19', 'Local income tax', fmt(d.localTax), 4, 10),
            mkCell([
              { text: '20  Locality name', fontSize: 5.5, color: '#444444' },
              { text: d.localityName || '', fontSize: 9, marginTop: 3 },
            ], 4, [3, 3, 3, 5]),
            mkPh(), mkPh(), mkPh(),
          ],
        ],
      },
      layout: FORM_LAYOUT,
      marginBottom: 6,
    },
    { text: W2_DISCLAIMER, fontSize: 6.5, color: '#555555' },
  ]
}

export function buildW2(d: FormW2Data): Record<string, unknown> {
  return {
    defaultStyle: { font: 'Helvetica', fontSize: 9, color: DARK },
    pageSize: 'LETTER',
    pageMargins: [36, 36, 36, 36],
    content: [
      ...w2Copy(d, 'Copy B', "To Be Filed with Employee's Federal Tax Return"),
      { text: '', pageBreak: 'before' },
      ...w2Copy(d, 'Copy C', "For Employee's Records"),
      { text: '', pageBreak: 'before' },
      ...w2Copy(d, 'Copy D', "For Employer"),
    ],
  }
}

export function buildInvoice(d: InvoiceData): Record<string, unknown> {
  const subtotal = d.items.reduce((s, i) => s + i.amount, 0)
  const discountAmt = d.discount > 0 ? subtotal * (d.discount / 100) : 0
  const taxAmt = d.taxRate > 0 ? (subtotal - discountAmt) * (d.taxRate / 100) : 0
  const total = subtotal - discountAmt + taxAmt

  const fmtC = (n: number) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: d.currency || 'USD', maximumFractionDigits: 2 }).format(n || 0)
    } catch {
      return `${d.currency || 'USD'} ${(n || 0).toFixed(2)}`
    }
  }

  const lineRows = d.items.map(item => [
    { text: item.description, fontSize: 9 },
    { text: String(item.quantity), alignment: 'right', fontSize: 9 },
    { text: fmtC(item.rate), alignment: 'right', fontSize: 9 },
    { text: fmtC(item.amount), alignment: 'right', bold: true, fontSize: 9 },
  ])

  const totalsRows: Row[][] = [
    [{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: 'Subtotal', color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: fmtC(subtotal), fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[],
  ]
  if (discountAmt > 0) {
    totalsRows.push([{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: `Discount (${d.discount}%)`, color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: `– ${fmtC(discountAmt)}`, color: '#ef4444', fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[])
  }
  if (taxAmt > 0) {
    totalsRows.push([{ text: '', border: [false, false, false, false] }, { text: '', border: [false, false, false, false] }, { text: `Tax (${d.taxRate}%)`, color: GRAY, fontSize: 9, alignment: 'right', border: [false, false, false, false] }, { text: fmtC(taxAmt), fontSize: 9, alignment: 'right', border: [false, false, false, false] }] as Row[])
  }
  totalsRows.push([{ text: '', border: [false, true, false, false] }, { text: '', border: [false, true, false, false] }, { text: `TOTAL (${d.currency})`, bold: true, fontSize: 11, alignment: 'right', border: [false, true, false, false] }, { text: fmtC(total), bold: true, fontSize: 11, alignment: 'right', border: [false, true, false, false] }] as Row[])

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
