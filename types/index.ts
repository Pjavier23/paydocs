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
  payFrequency: 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
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

// ── Bookkeeping types ──────────────────────────────────────────────────────

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'pending' | 'past_due'

export type DocCategory =
  | 'materials'
  | 'labor'
  | 'equipment'
  | 'office'
  | 'travel'
  | 'meals'
  | 'utilities'
  | 'other'

export type BkDocType = 'receipt' | 'invoice' | 'bank_statement' | 'other'

export type TaxEventType = 'quarterly_estimated' | 'annual_filing' | 'other'

export interface BkClient {
  id: string
  owner_id: string
  business_name: string
  contact_name: string | null
  email: string | null
  phone: string | null
  industry: string | null
  monthly_fee: number
  subscription_status: SubscriptionStatus
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  invite_token: string | null
  onboarded_at: string | null
  created_at: string
  // Enriched fields added by the /api/bookkeeping/clients GET handler
  doc_count?: number
  last_upload?: string | null
}

export interface BkDocument {
  id: string
  client_id: string
  uploaded_by: string
  doc_type: BkDocType
  file_url: string
  vendor: string | null
  amount: number | null
  doc_date: string | null
  category: DocCategory | null
  description: string | null
  is_income: boolean
  tax_deductible: boolean
  ai_processed: boolean
  ai_summary: string | null
  created_at: string
}

export interface BkTaxEvent {
  id: string
  client_id: string
  event_type: TaxEventType
  due_date: string
  title: string
  description: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
}
