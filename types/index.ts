export type DocType = 'paystub' | '1099-nec' | '1099-misc' | 'invoice'

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoiceData {
  // From (business)
  fromName: string
  fromAddress: string
  fromCity: string
  fromEmail: string
  fromPhone: string
  // To (client)
  toName: string
  toAddress: string
  toCity: string
  toEmail: string
  // Invoice details
  invoiceNumber: string
  invoiceDate: string
  dueDate: string
  currency: string
  // Line items
  items: InvoiceItem[]
  // Totals
  taxRate: number
  discount: number
  // Notes
  notes: string
  paymentTerms: string
}

export interface PaystubData {
  // Employer
  companyName: string
  companyAddress: string
  companyCity: string
  companyEIN: string
  // Employee
  empName: string
  empAddress: string
  empCity: string
  empSSN: string
  empFilingStatus: string
  // Pay period
  payPeriodStart: string
  payPeriodEnd: string
  payDate: string
  checkNumber: string
  payType: 'hourly' | 'salary'
  // Earnings
  hourlyRate: number
  hoursWorked: number
  overtimeHours: number
  overtimeRate: number
  grossPay: number
  // Deductions
  federalTax: number
  stateTax: number
  stateCode: string
  socialSecurity: number
  medicare: number
  healthInsurance: number
  otherDeduction: number
  otherDeductionLabel: string
  // YTD
  ytdGross: number
  ytdFederal: number
  ytdState: number
  ytdSS: number
  ytdMedicare: number
  ytdNet: number
}

export interface Form1099NECData {
  // Payer
  payerName: string
  payerAddress: string
  payerCity: string
  payerEIN: string
  payerPhone: string
  // Recipient
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientTIN: string
  recipientAccountNo: string
  // Amounts
  nonemployeeComp: number       // Box 1
  federalTaxWithheld: number    // Box 4
  stateTaxWithheld: number      // Box 6
  stateCode: string
  stateIdNo: string
  taxYear: string
}

export interface Form1099MISCData {
  // Payer
  payerName: string
  payerAddress: string
  payerCity: string
  payerEIN: string
  payerPhone: string
  // Recipient
  recipientName: string
  recipientAddress: string
  recipientCity: string
  recipientTIN: string
  recipientAccountNo: string
  // Boxes
  rents: number               // Box 1
  royalties: number           // Box 2
  otherIncome: number         // Box 3
  federalTaxWithheld: number  // Box 4
  fishingBoatProceeds: number // Box 5
  medicalPayments: number     // Box 6
  substitutePayments: number  // Box 8
  cropInsurance: number       // Box 9
  grossAttorney: number       // Box 10
  stateTaxWithheld: number    // Box 16
  stateCode: string
  stateIdNo: string
  taxYear: string
}

export interface Document {
  id: string
  user_id: string | null
  type: DocType
  data_json: PaystubData | Form1099NECData | Form1099MISCData | InvoiceData
  paid: boolean
  stripe_session_id: string | null
  created_at: string
}

export type Language = 'en' | 'es'
