# Seller Settlement Payment Tracking Design

## Overview
This document outlines the design for tracking settlement payments made by admins to sellers. The system will:
- Track all settlement payments transferred to sellers
- Deduct these payments from total earnings to show pending amounts
- Maintain a complete audit trail of all transfers
- Support multiple settlements and status tracking

---

## Table Structure: `seller_settlement_payments`

### Column Definitions

| Column | Type | Constraints | Description |
|--------|------|-----------|-------------|
| `settlement_id` | `uuid` | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique identifier for each settlement |
| `seller_id` | `uuid` | NOT NULL, FK → sellers(id) | Reference to the seller receiving the settlement |
| `settlement_amount` | `numeric` | NOT NULL | Amount transferred to the seller (gross amount before any deductions) |
| `currency` | `varchar(3)` | DEFAULT 'INR' | Currency code (ISO 4217) |
| `description` | `text` | - | Details about what earnings this settlement covers (date range, order count, etc.) |
| `status` | `text` | CHECK IN ('pending', 'approved', 'processing', 'completed', 'failed', 'rejected') | Current status of settlement |
| `initiated_by` | `uuid` | NOT NULL, FK → auth.users(id) | Admin/system user who initiated the settlement |
| `processed_by` | `uuid` | NULLABLE, FK → auth.users(id) | Admin/system who processed the payment |
| `settlement_period_start` | `date` | - | Start date of the earnings period covered |
| `settlement_period_end` | `date` | - | End date of the earnings period covered |
| `payment_method` | `varchar(50)` | DEFAULT 'bank_transfer' | Payment method used (bank_transfer, upi, wallet, etc.) |
| `reference_number` | `varchar(100)` | NULLABLE, UNIQUE | Bank reference/transaction ID for tracking |
| `bank_account_used` | `uuid` | NULLABLE, FK → seller_bank_accounts(id) | Which bank account was used for settlement |
| `initiated_at` | `timestamp with time zone` | DEFAULT now() | When the settlement was initiated |
| `processed_at` | `timestamp with time zone` | NULLABLE | When the payment was actually transferred |
| `failed_at` | `timestamp with time zone` | NULLABLE | When the payment failed (if applicable) |
| `notes` | `text` | - | Admin notes or comments about the settlement |
| `failure_reason` | `text` | - | Reason for failure (if status is 'failed') |
| `metadata` | `jsonb` | - | Additional data (commission rates used, tax calculations, etc.) |
| `created_at` | `timestamp with time zone` | DEFAULT now() | Record creation timestamp |
| `updated_at` | `timestamp with time zone` | DEFAULT now() | Last update timestamp |

---

## SQL Migration Script

```sql
-- Create enum for settlement status
CREATE TYPE settlement_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'rejected'
);

-- Create the settlement payments table
CREATE TABLE public.seller_settlement_payments (
  settlement_id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  settlement_amount numeric NOT NULL,
  currency varchar(3) DEFAULT 'INR',
  description text,
  status settlement_status DEFAULT 'pending',
  initiated_by uuid NOT NULL,
  processed_by uuid,
  settlement_period_start date,
  settlement_period_end date,
  payment_method varchar(50) DEFAULT 'bank_transfer',
  reference_number varchar(100) UNIQUE,
  bank_account_used uuid,
  initiated_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  failed_at timestamp with time zone,
  notes text,
  failure_reason text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT seller_settlement_payments_pkey PRIMARY KEY (settlement_id),
  CONSTRAINT seller_settlement_payments_seller_id_fkey 
    FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT seller_settlement_payments_initiated_by_fkey 
    FOREIGN KEY (initiated_by) REFERENCES auth.users(id),
  CONSTRAINT seller_settlement_payments_processed_by_fkey 
    FOREIGN KEY (processed_by) REFERENCES auth.users(id),
  CONSTRAINT seller_settlement_payments_bank_account_fkey 
    FOREIGN KEY (bank_account_used) REFERENCES public.seller_bank_accounts(id),
  CONSTRAINT settlement_amount_positive CHECK (settlement_amount > 0)
);

-- Create index for faster queries
CREATE INDEX idx_seller_settlement_seller_id ON public.seller_settlement_payments(seller_id);
CREATE INDEX idx_seller_settlement_status ON public.seller_settlement_payments(status);
CREATE INDEX idx_seller_settlement_processed_at ON public.seller_settlement_payments(processed_at);
CREATE INDEX idx_seller_settlement_period ON public.seller_settlement_payments(settlement_period_start, settlement_period_end);

-- Create audit log table for tracking settlement changes
CREATE TABLE public.seller_settlement_audit (
  audit_id uuid NOT NULL DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL,
  changed_by uuid NOT NULL,
  old_status settlement_status,
  new_status settlement_status,
  old_data jsonb,
  new_data jsonb,
  change_reason text,
  changed_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT seller_settlement_audit_pkey PRIMARY KEY (audit_id),
  CONSTRAINT seller_settlement_audit_settlement_id_fkey 
    FOREIGN KEY (settlement_id) REFERENCES public.seller_settlement_payments(settlement_id),
  CONSTRAINT seller_settlement_audit_changed_by_fkey 
    FOREIGN KEY (changed_by) REFERENCES auth.users(id)
);

-- Create index for audit log queries
CREATE INDEX idx_settlement_audit_settlement_id ON public.seller_settlement_audit(settlement_id);
CREATE INDEX idx_settlement_audit_changed_at ON public.seller_settlement_audit(changed_at);
```

---

## TypeScript Types

```typescript
// Add to src/integrations/supabase/database.types.ts

export type Database = {
  // ... existing types
  public: {
    Tables: {
      // ... existing tables
      
      seller_settlement_payments: {
        Row: {
          settlement_id: string
          seller_id: string
          settlement_amount: number
          currency: string | null
          description: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'
          initiated_by: string
          processed_by: string | null
          settlement_period_start: string | null
          settlement_period_end: string | null
          payment_method: string | null
          reference_number: string | null
          bank_account_used: string | null
          initiated_at: string | null
          processed_at: string | null
          failed_at: string | null
          notes: string | null
          failure_reason: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          settlement_id?: string
          seller_id: string
          settlement_amount: number
          currency?: string | null
          description?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'
          initiated_by: string
          processed_by?: string | null
          settlement_period_start?: string | null
          settlement_period_end?: string | null
          payment_method?: string | null
          reference_number?: string | null
          bank_account_used?: string | null
          initiated_at?: string | null
          processed_at?: string | null
          failed_at?: string | null
          notes?: string | null
          failure_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          settlement_id?: string
          seller_id?: string
          settlement_amount?: number
          currency?: string | null
          description?: string | null
          status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected'
          initiated_by?: string
          processed_by?: string | null
          settlement_period_start?: string | null
          settlement_period_end?: string | null
          payment_method?: string | null
          reference_number?: string | null
          bank_account_used?: string | null
          initiated_at?: string | null
          processed_at?: string | null
          failed_at?: string | null
          notes?: string | null
          failure_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_settlement_payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_settlement_payments_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_settlement_payments_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_settlement_payments_bank_account_fkey"
            columns: ["bank_account_used"]
            isOneToOne: false
            referencedRelation: "seller_bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      
      seller_settlement_audit: {
        Row: {
          audit_id: string
          settlement_id: string
          changed_by: string
          old_status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          new_status: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          old_data: Json | null
          new_data: Json | null
          change_reason: string | null
          changed_at: string | null
        }
        Insert: {
          audit_id?: string
          settlement_id: string
          changed_by: string
          old_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          new_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          old_data?: Json | null
          new_data?: Json | null
          change_reason?: string | null
          changed_at?: string | null
        }
        Update: {
          audit_id?: string
          settlement_id?: string
          changed_by?: string
          old_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          new_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'rejected' | null
          old_data?: Json | null
          new_data?: Json | null
          change_reason?: string | null
          changed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_settlement_audit_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "seller_settlement_payments"
            referencedColumns: ["settlement_id"]
          },
          {
            foreignKeyName: "seller_settlement_audit_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
  }
}
```

---

## Data Flow & Calculation Logic

### In Redeem.tsx Component

Update the `loadRedeemData` function to incorporate settlement payments:

```typescript
// Calculate total earnings from order_items
const { data: orderItems, error: orderError } = await supabase
  .from("order_items")
  .select(...)
  .eq("seller_id", id)
  .in("orders.status", ["completed", "delivered"]);

// Fetch completed settlement payments
const { data: settlements, error: settlementError } = await supabase
  .from("seller_settlement_payments")
  .select("*")
  .eq("seller_id", id)
  .eq("status", "completed")
  .order("processed_at", { ascending: false });

if (settlementError) {
  console.error("Error fetching settlements:", settlementError);
}

// Calculate total transferred amount
const totalTransferred = (settlements || []).reduce(
  (sum, settlement) => sum + settlement.settlement_amount,
  0
);

// Calculate pending amount
const pendingBalance = totalRevenue - totalTransferred;

// Available (only transferred amounts are fully settled)
const availableBalance = pendingBalance * 0.8; // 80% of pending
const holdingBalance = pendingBalance * 0.2;   // 20% holding
```

---

## Settlement Status Workflow

```
pending → processing → completed ✓
            ↓
          failed → pending (for retry) or rejected
```

### Status Descriptions

| Status | Description | Timestamp |
|--------|-------------|-----------|
| **pending** | Settlement initiated, ready to be processed | `initiated_at` |
| **processing** | Payment is being processed through payment gateway/bank | `processed_at` (start) |
| **completed** | Payment successfully transferred to seller's bank | `processed_at` (final) |
| **failed** | Payment attempt failed; requires investigation | `failed_at` |
| **rejected** | Settlement request was rejected; not proceeding | `initiated_at` + note |

---

## Key Relationships

```
seller_settlement_payments
├── seller_id → sellers.id
├── initiated_by → auth.users.id (admin/system)
├── processed_by → auth.users.id (admin/system)
└── bank_account_used → seller_bank_accounts.id

seller_settlement_audit
└── settlement_id → seller_settlement_payments.settlement_id
    └── changed_by → auth.users.id
```

---

## Example Queries

### Get all settlements for a seller
```sql
SELECT * FROM seller_settlement_payments
WHERE seller_id = 'seller-uuid'
ORDER BY processed_at DESC;
```

### Calculate total transferred amount
```sql
SELECT 
  seller_id,
  SUM(settlement_amount) as total_transferred,
  COUNT(*) as settlement_count,
  MAX(processed_at) as last_settlement_date
FROM seller_settlement_payments
WHERE seller_id = 'seller-uuid' AND status = 'completed'
GROUP BY seller_id;
```

### Get pending settlements ready to process
```sql
SELECT * FROM seller_settlement_payments
WHERE status = 'pending'
ORDER BY initiated_at ASC;
```

### Get settlement history with audit trail
```sql
SELECT 
  sp.*,
  sa.old_status,
  sa.new_status,
  sa.change_reason,
  sa.changed_at
FROM seller_settlement_payments sp
LEFT JOIN seller_settlement_audit sa ON sp.settlement_id = sa.settlement_id
WHERE sp.seller_id = 'seller-uuid'
ORDER BY sp.initiated_at DESC, sa.changed_at DESC;
```

---

## Metadata Structure

The `metadata` jsonb field can store:

```json
{
  "commission_percentage": 2,
  "gst_percentage": 18,
  "gross_earnings": 10000,
  "commission_amount": 200,
  "gst_amount": 36,
  "net_amount": 9764,
  "orders_included": 15,
  "settlement_reason": "weekly_payout",
  "source_system": "automated_settlement",
  "batch_id": "batch-2024-11-15-001"
}
```

---

## UI Components Needed

1. **Seller Dashboard (Redeem Page)**
   - Show "Total Transferred" card alongside existing earnings
   - Update pending amount calculation
   - Display settlement history/timeline

2. **Admin Settlement Management**
   - Create settlement button (after selecting seller)
   - Bulk settlement creation
   - Settlement status tracking
   - Failure handling and retry options

3. **Settlement Details View**
   - View settlement details
   - See audit trail
   - Edit notes
   - Approve/reject/process actions

---

## Benefits of This Design

✅ Complete audit trail of all transfers
✅ Status tracking for transparency
✅ Multiple admin roles (initiated, approved, processed)
✅ Failed payment handling with reasons
✅ Flexible metadata for future enhancements
✅ Proper foreign key relationships
✅ Indexed for fast queries
✅ Easy calculation of transferred vs. pending
✅ Bank account tracking for settlement
✅ Period-based settlements (weekly, monthly, etc.)
