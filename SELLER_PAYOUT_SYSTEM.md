# Seller Payout System - Complete Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [System Flow](#system-flow)
4. [Table Details & Rationale](#table-details--rationale)
5. [Business Logic](#business-logic)
6. [Examples & Scenarios](#examples--scenarios)
7. [Admin Workflow](#admin-workflow)
8. [Edge Cases](#edge-cases)

---

## 🎯 System Overview

### **Purpose**
A comprehensive seller payout tracking system that:
- Automatically calculates monthly payouts for sellers
- Tracks Razorpay fees proportionally across multi-seller orders
- Implements 3-order hold period for new orders
- Handles refunds by deducting both refund amount AND original transaction fees
- Maintains accurate seller balances
- Provides complete audit trail
- Enables manual admin-controlled payment processing

### **Key Features**
✅ Automated payout generation on 28th of every month  
✅ Proportional Razorpay fee allocation for multi-seller orders  
✅ 3-order hold period (recent 3 orders paid next month)  
✅ Refund handling with fee recovery  
✅ Manual admin approval & payment workflow  
✅ Complete transaction history  
✅ Balance tracking (available vs pending)  

---

## 🗄️ Database Schema

### **Architecture Diagram**

```
┌─────────────────┐
│    sellers      │
│  (existing)     │
└────────┬────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐         ┌──────────────────┐
│seller_balances  │◄────────┤seller_balance_   │
│                 │  1:M    │  transactions    │
└────────┬────────┘         └──────────────────┘
         │
         │ 1:M
         ▼
┌─────────────────┐         ┌──────────────────┐
│seller_payouts   │◄────────┤payout_approval_  │
│                 │  1:M    │      logs        │
└────────┬────────┘         └──────────────────┘
         │
         │ 1:M
         ▼
┌─────────────────┐
│seller_payout_   │
│     items       │
└─────────────────┘
         │
         │ M:1
         ▼
┌─────────────────┐
│   order_items   │
│   (existing)    │
└─────────────────┘
```

---

## � SQL Migration Script

### **Complete Database Setup**

```sql
-- =====================================================
-- SELLER PAYOUT SYSTEM
-- Manual admin-managed payout tracking system
-- =====================================================

-- 1. SELLER PAYOUTS TABLE
-- Main table for tracking monthly payouts to sellers
CREATE TABLE seller_payouts (
  payout_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Payout Period
  payout_month INTEGER NOT NULL CHECK (payout_month BETWEEN 1 AND 12),
  payout_year INTEGER NOT NULL CHECK (payout_year >= 2024),
  payout_date DATE NOT NULL,
  
  -- Amount Breakdown
  gross_sales DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (gross_sales >= 0),
  razorpay_fees DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (razorpay_fees >= 0),
  refund_deductions DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (refund_deductions >= 0),
  previous_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  
  -- Status Management
  status VARCHAR(50) NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'approved', 'paid', 'rejected', 'on_hold')),
  
  -- Admin Actions
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  paid_by UUID REFERENCES users(id),
  paid_at TIMESTAMP,
  
  -- Payment Details (Manual entry by admin)
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  payment_notes TEXT,
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one payout per seller per month
  CONSTRAINT unique_seller_month_year UNIQUE(seller_id, payout_month, payout_year)
);

-- Indexes for seller_payouts
CREATE INDEX idx_seller_payouts_seller_id ON seller_payouts(seller_id);
CREATE INDEX idx_seller_payouts_status ON seller_payouts(status);
CREATE INDEX idx_seller_payouts_date ON seller_payouts(payout_date);
CREATE INDEX idx_seller_payouts_period ON seller_payouts(payout_year DESC, payout_month DESC);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_seller_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seller_payouts_updated_at
  BEFORE UPDATE ON seller_payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_payouts_updated_at();

-- =====================================================

-- 2. SELLER PAYOUT ITEMS TABLE
-- Individual order items included in each payout
CREATE TABLE seller_payout_items (
  payout_item_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id UUID REFERENCES seller_payouts(payout_id) ON DELETE CASCADE,
  
  -- Order References
  order_id UUID NOT NULL REFERENCES orders(order_id),
  order_item_id UUID NOT NULL REFERENCES order_items(order_item_id),
  payment_id UUID REFERENCES payments(payment_id),
  
  -- Order Details
  order_date TIMESTAMP NOT NULL,
  item_subtotal DECIMAL(10, 2) NOT NULL CHECK (item_subtotal >= 0),
  
  -- Razorpay Fee Allocation (proportional to seller's share)
  allocated_razorpay_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (allocated_razorpay_fee >= 0),
  allocated_razorpay_tax DECIMAL(10, 2) NOT NULL DEFAULT 0 CHECK (allocated_razorpay_tax >= 0),
  
  -- Refund Information
  refund_id UUID REFERENCES order_refunds(refund_id),
  is_refunded BOOLEAN DEFAULT FALSE,
  refund_amount DECIMAL(10, 2) DEFAULT 0 CHECK (refund_amount >= 0),
  
  -- Settlement Status
  is_settled BOOLEAN DEFAULT FALSE,
  settlement_hold_until DATE NOT NULL, -- 28th of payout month
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_payout_items
CREATE INDEX idx_payout_items_payout_id ON seller_payout_items(payout_id);
CREATE INDEX idx_payout_items_order_item ON seller_payout_items(order_item_id);
CREATE INDEX idx_payout_items_order_id ON seller_payout_items(order_id);
CREATE INDEX idx_payout_items_settlement ON seller_payout_items(is_settled, settlement_hold_until);
CREATE INDEX idx_payout_items_refunded ON seller_payout_items(is_refunded);

-- =====================================================

-- 3. SELLER BALANCES TABLE
-- Running balance for each seller
CREATE TABLE seller_balances (
  balance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL UNIQUE REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Balance Breakdown
  available_balance DECIMAL(10, 2) NOT NULL DEFAULT 0, -- Can be withdrawn
  pending_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,   -- In hold period (3 orders)
  total_earned DECIMAL(10, 2) NOT NULL DEFAULT 0,      -- Lifetime earnings
  total_paid_out DECIMAL(10, 2) NOT NULL DEFAULT 0,    -- Lifetime payouts
  total_refunded DECIMAL(10, 2) NOT NULL DEFAULT 0,    -- Lifetime refunds
  
  -- Last Payout Info
  last_payout_date DATE,
  last_payout_amount DECIMAL(10, 2) DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for seller_balances
CREATE INDEX idx_seller_balances_seller ON seller_balances(seller_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_seller_balances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seller_balances_updated_at
  BEFORE UPDATE ON seller_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_seller_balances_updated_at();

-- =====================================================

-- 4. SELLER BALANCE TRANSACTIONS TABLE
-- Complete audit trail of all balance changes
CREATE TABLE seller_balance_transactions (
  transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
  
  -- Transaction Type
  type VARCHAR(50) NOT NULL 
    CHECK (type IN ('order', 'refund', 'payout', 'fee_deduction', 'adjustment')),
  
  -- Amount & Balance
  amount DECIMAL(10, 2) NOT NULL,
  balance_before DECIMAL(10, 2) NOT NULL,
  balance_after DECIMAL(10, 2) NOT NULL,
  
  -- Related References
  related_order_id UUID REFERENCES orders(order_id),
  related_order_item_id UUID REFERENCES order_items(order_item_id),
  related_payout_id UUID REFERENCES seller_payouts(payout_id),
  related_refund_id UUID REFERENCES order_refunds(refund_id),
  
  -- Details
  description TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for seller_balance_transactions
CREATE INDEX idx_balance_txn_seller ON seller_balance_transactions(seller_id);
CREATE INDEX idx_balance_txn_type ON seller_balance_transactions(type);
CREATE INDEX idx_balance_txn_created ON seller_balance_transactions(created_at DESC);
CREATE INDEX idx_balance_txn_order ON seller_balance_transactions(related_order_id) WHERE related_order_id IS NOT NULL;
CREATE INDEX idx_balance_txn_payout ON seller_balance_transactions(related_payout_id) WHERE related_payout_id IS NOT NULL;

-- =====================================================

-- 5. PAYOUT APPROVAL LOGS TABLE
-- Track all admin actions on payouts
CREATE TABLE payout_approval_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_id UUID NOT NULL REFERENCES seller_payouts(payout_id) ON DELETE CASCADE,
  
  -- Action Details
  action VARCHAR(50) NOT NULL 
    CHECK (action IN ('approved', 'paid', 'rejected', 'put_on_hold', 'released_from_hold')),
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT NOW(),
  
  -- Status Change
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  notes TEXT,
  
  -- Payment Info (for 'paid' action)
  payment_method VARCHAR(100),
  payment_reference VARCHAR(255),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for payout_approval_logs
CREATE INDEX idx_approval_logs_payout ON payout_approval_logs(payout_id);
CREATE INDEX idx_approval_logs_admin ON payout_approval_logs(performed_by);
CREATE INDEX idx_approval_logs_action ON payout_approval_logs(action);
CREATE INDEX idx_approval_logs_created ON payout_approval_logs(created_at DESC);

-- =====================================================

-- 6. HELPER VIEWS
-- View for pending payouts with seller details
CREATE OR REPLACE VIEW v_pending_payouts AS
SELECT 
  sp.payout_id,
  sp.payout_month,
  sp.payout_year,
  sp.payout_date,
  sp.gross_sales,
  sp.razorpay_fees,
  sp.refund_deductions,
  sp.net_amount,
  sp.status,
  sp.created_at,
  s.id as seller_id,
  s.business_name,
  s.email       AS contact_email,
  s.phone       AS contact_phone,
  sb.available_balance,
  sb.pending_balance,
  COUNT(spi.payout_item_id) as order_count
FROM seller_payouts sp
JOIN sellers s ON sp.seller_id = s.id
LEFT JOIN seller_balances sb ON s.id = sb.seller_id
LEFT JOIN seller_payout_items spi ON sp.payout_id = spi.payout_id
WHERE sp.status = 'pending'
GROUP BY sp.payout_id, s.id, sb.available_balance, sb.pending_balance;

-- View for seller payout summary
CREATE OR REPLACE VIEW v_seller_payout_summary AS
SELECT 
  s.id as seller_id,
  s.business_name,
  sb.available_balance,
  sb.pending_balance,
  sb.total_earned,
  sb.total_paid_out,
  sb.total_refunded,
  sb.last_payout_date,
  sb.last_payout_amount,
  COUNT(DISTINCT sp.payout_id) as total_payouts,
  COUNT(DISTINCT CASE WHEN sp.status = 'pending' THEN sp.payout_id END) as pending_payouts,
  COUNT(DISTINCT CASE WHEN sp.status = 'approved' THEN sp.payout_id END) as approved_payouts,
  COUNT(DISTINCT CASE WHEN sp.status = 'paid' THEN sp.payout_id END) as paid_payouts
FROM sellers s
LEFT JOIN seller_balances sb ON s.id = sb.seller_id
LEFT JOIN seller_payouts sp ON s.id = sp.seller_id
GROUP BY s.id, sb.available_balance, sb.pending_balance, sb.total_earned, 
         sb.total_paid_out, sb.total_refunded, sb.last_payout_date, sb.last_payout_amount;

-- =====================================================

-- 7. ROW LEVEL SECURITY (RLS) - COMMENTED OUT
-- Uncomment and adjust based on your auth setup

-- -- Enable RLS on all tables
-- ALTER TABLE seller_payouts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seller_payout_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seller_balances ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE seller_balance_transactions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payout_approval_logs ENABLE ROW LEVEL SECURITY;

-- -- Admin can do everything
-- CREATE POLICY "Admins can manage all payouts" ON seller_payouts
--   FOR ALL TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- CREATE POLICY "Admins can manage all payout items" ON seller_payout_items
--   FOR ALL TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- CREATE POLICY "Admins can manage all balances" ON seller_balances
--   FOR ALL TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- CREATE POLICY "Admins can view all transactions" ON seller_balance_transactions
--   FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- CREATE POLICY "Admins can view all logs" ON payout_approval_logs
--   FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE users.id = auth.uid()
--       AND users.role = 'admin'
--     )
--   );

-- -- Sellers can view their own data
-- CREATE POLICY "Sellers can view own payouts" ON seller_payouts
--   FOR SELECT TO authenticated
--   USING (
--     seller_id IN (
--       SELECT id FROM sellers
--       WHERE user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Sellers can view own payout items" ON seller_payout_items
--   FOR SELECT TO authenticated
--   USING (
--     EXISTS (
--       SELECT 1 FROM seller_payouts sp
--       JOIN sellers s ON sp.seller_id = s.id
--       WHERE sp.payout_id = seller_payout_items.payout_id
--       AND s.user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Sellers can view own balance" ON seller_balances
--   FOR SELECT TO authenticated
--   USING (
--     seller_id IN (
--       SELECT id FROM sellers
--       WHERE user_id = auth.uid()
--     )
--   );

-- CREATE POLICY "Sellers can view own transactions" ON seller_balance_transactions
--   FOR SELECT TO authenticated
--   USING (
--     seller_id IN (
--       SELECT id FROM sellers
--       WHERE user_id = auth.uid()
--     )
--   );

-- =====================================================

-- 8. TABLE COMMENTS
COMMENT ON TABLE seller_payouts IS 'Main table for tracking monthly seller payouts. Generated on 28th of each month.';
COMMENT ON TABLE seller_payout_items IS 'Individual order items included in each payout with proportional fee allocation.';
COMMENT ON TABLE seller_balances IS 'Running balance for each seller with available and pending amounts.';
COMMENT ON TABLE seller_balance_transactions IS 'Complete audit trail of all balance changes for sellers.';
COMMENT ON TABLE payout_approval_logs IS 'Log of all admin actions on payouts (approve, reject, paid, etc).';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
```

### **Important Notes:**

1. **Foreign Key References:**
   - `approved_by` and `paid_by` reference `users(id)` - adjust if your user table has a different name
   - Adjust `sellers.email` and `sellers.phone` column names in views if they differ in your schema

2. **Row Level Security (RLS):**
   - Currently commented out
   - Uncomment and customize based on your authentication system
   - Adjust `auth.uid()` calls if using a different auth provider

3. **Views:**
   - Two helper views created for quick access to common queries
   - `v_pending_payouts`: Shows all pending payouts with seller details
   - `v_seller_payout_summary`: Aggregated payout statistics per seller

4. **To Run This Migration:**
   ```bash
   # Save to a file
   psql your_database < seller_payout_migration.sql
   
   # Or in Supabase SQL Editor:
   # Copy and paste the entire SQL script
   ```

---

## �📊 Table Details & Rationale

### **1. `seller_payouts` - Main Payout Records**

**Purpose**: Central table storing one payout record per seller per month.

#### **Columns Explained:**

| Column | Type | Why We Need It |
|--------|------|----------------|
| `payout_id` | UUID | Unique identifier for each payout |
| `seller_id` | UUID | Links to seller - who is getting paid |
| `payout_month` | INTEGER (1-12) | Which month's earnings (e.g., November = 11) |
| `payout_year` | INTEGER | Which year (e.g., 2025) |
| `payout_date` | DATE | When payout is/was made (usually 28th) |
| `gross_sales` | DECIMAL | Total sales before any deductions |
| `razorpay_fees` | DECIMAL | Total Razorpay transaction fees to deduct |
| `razorpay_tax` | DECIMAL (included in fees) | GST on Razorpay fees |
| `refund_deductions` | DECIMAL | Amount deducted due to refunds (includes original fees) |
| `previous_balance` | DECIMAL | Carry-forward balance from previous months |
| `net_amount` | DECIMAL | **Final amount to pay** = gross_sales - fees - refunds + previous_balance |
| `status` | VARCHAR | Tracks payout state: `pending` → `approved` → `paid` |
| `approved_by` | UUID | Which admin approved (accountability) |
| `approved_at` | TIMESTAMP | When approved |
| `paid_by` | UUID | Which admin marked as paid |
| `paid_at` | TIMESTAMP | When payment was made |
| `payment_method` | VARCHAR | How paid (Bank Transfer, UPI, Cheque) |
| `payment_reference` | VARCHAR | Transaction ID/UTR/Cheque number |
| `payment_notes` | TEXT | Admin can add payment details |
| `admin_notes` | TEXT | Internal notes for admins |
| `rejection_reason` | TEXT | If rejected, why? |

**Why Monthly Records?**
- Easy to track "November 2025 payout for Seller X"
- One payout = one payment transaction
- Matches accounting periods
- Unique constraint ensures no duplicate payouts for same seller+month

**Example Record:**
```sql
{
  payout_id: "uuid-123",
  seller_id: "seller-abc",
  payout_month: 11,
  payout_year: 2025,
  payout_date: "2025-11-28",
  gross_sales: 50000.00,
  razorpay_fees: 1416.00,  -- (1200 fee + 216 tax)
  refund_deductions: 3354.00,  -- (3000 refund + 354 fees from refunded orders)
  previous_balance: 0.00,
  net_amount: 45230.00,  -- 50000 - 1416 - 3354
  status: "pending"
}
```

---

### **2. `seller_payout_items` - Individual Order Details**

**Purpose**: Breaks down each payout into individual order items. Links payout to actual orders.

#### **Columns Explained:**

| Column | Type | Why We Need It |
|--------|------|----------------|
| `payout_item_id` | UUID | Unique identifier |
| `payout_id` | UUID | Which payout this belongs to (NULL until settled) |
| `order_id` | UUID | Which order this is from |
| `order_item_id` | UUID | Specific item in the order |
| `payment_id` | UUID | Links to payment record |
| `order_date` | TIMESTAMP | When order was placed |
| `item_subtotal` | DECIMAL | Seller's earning from this item |
| `allocated_razorpay_fee` | DECIMAL | **THIS IS KEY** - Proportional fee for this item |
| `allocated_razorpay_tax` | DECIMAL | GST portion of the fee |
| `refund_id` | UUID | If refunded, link to refund record |
| `is_refunded` | BOOLEAN | Quick check if item was refunded |
| `refund_amount` | DECIMAL | How much was refunded |
| `is_settled` | BOOLEAN | Has this been included in a payout? |
| `settlement_hold_until` | DATE | When this becomes eligible for payout |

**Why `allocated_razorpay_fee` is Critical:**

**Scenario**: Customer orders from 3 sellers in one cart:
```
Order Total: ₹10,000
- Seller A: ₹5,000 (50%)
- Seller B: ₹3,000 (30%)
- Seller C: ₹2,000 (20%)

Razorpay charges ₹240 total fee on ₹10,000

How to split the fee?
- Seller A pays: ₹240 × 50% = ₹120
- Seller B pays: ₹240 × 30% = ₹72
- Seller C pays: ₹240 × 20% = ₹48
```

**Calculation Formula:**
```typescript
allocated_razorpay_fee = (item_subtotal / total_order_amount) × total_razorpay_fee
```

**Why `settlement_hold_until`?**

Implements the 3-order hold rule:
```
Seller's 1st order (Nov 1): settlement_hold_until = Dec 28 (next month + 1)
Seller's 2nd order (Nov 5): settlement_hold_until = Dec 28
Seller's 3rd order (Nov 10): settlement_hold_until = Dec 28
Seller's 4th order (Nov 15): settlement_hold_until = Nov 28 (current month)
```

**Example Record:**
```sql
{
  payout_item_id: "uuid-456",
  payout_id: "uuid-123",  -- Links to above payout
  order_id: "order-001",
  order_item_id: "item-001",
  order_date: "2025-11-03",
  item_subtotal: 4500.00,
  allocated_razorpay_fee: 108.00,  -- 4500/50000 × 1200
  allocated_razorpay_tax: 19.44,   -- 18% of 108
  is_refunded: false,
  settlement_hold_until: "2025-11-28",
  is_settled: true
}
```

---

### **3. `seller_balances` - Running Balance Tracker**

**Purpose**: Maintains real-time balance for each seller. One record per seller.

#### **Columns Explained:**

| Column | Type | Why We Need It |
|--------|------|----------------|
| `balance_id` | UUID | Unique identifier |
| `seller_id` | UUID | One-to-one with seller |
| `available_balance` | DECIMAL | **Money ready to withdraw** |
| `pending_balance` | DECIMAL | **Money in 3-order hold period** |
| `total_earned` | DECIMAL | Lifetime earnings (historical) |
| `total_paid_out` | DECIMAL | Lifetime payouts (historical) |
| `total_refunded` | DECIMAL | Lifetime refunds (historical) |
| `last_payout_date` | DATE | When was last payment made |
| `last_payout_amount` | DECIMAL | How much was last payment |

**Why Two Types of Balance?**

```
┌─────────────────────────────────────┐
│  Seller Balance Dashboard           │
├─────────────────────────────────────┤
│  Available: ₹45,230                 │  ← Can be withdrawn on 28th
│  Pending:   ₹8,950                  │  ← Held for 3-order rule
│  ───────────────────                │
│  Total:     ₹54,180                 │
└─────────────────────────────────────┘
```

**Balance Movement Example:**
```
Nov 1:  Order #1 delivered
        pending_balance += ₹4,392
        (held because it's 1st order)

Nov 5:  Order #2 delivered
        pending_balance += ₹2,245
        (held because it's 2nd order)

Nov 10: Order #3 delivered
        pending_balance += ₹1,757
        (held because it's 3rd order)

Nov 15: Order #4 delivered
        available_balance += ₹3,123
        (4th order, no hold, goes to available)

Nov 28: Payout made (₹45,230)
        available_balance -= ₹45,230
        total_paid_out += ₹45,230
```

**Example Record:**
```sql
{
  seller_id: "seller-abc",
  available_balance: 45230.00,  -- Ready for payout
  pending_balance: 8950.00,     -- In hold period
  total_earned: 245000.00,      -- All-time earnings
  total_paid_out: 199770.00,    -- All-time payouts
  total_refunded: 5200.00,      -- All-time refunds
  last_payout_date: "2025-10-28",
  last_payout_amount: 38500.00
}
```

---

### **4. `seller_balance_transactions` - Audit Trail**

**Purpose**: Complete immutable log of every balance change. For auditing and dispute resolution.

#### **Columns Explained:**

| Column | Type | Why We Need It |
|--------|------|----------------|
| `transaction_id` | UUID | Unique identifier |
| `seller_id` | UUID | Which seller |
| `type` | VARCHAR | Type: `order`, `refund`, `payout`, `adjustment` |
| `amount` | DECIMAL | Change amount (positive or negative) |
| `balance_before` | DECIMAL | Balance snapshot before transaction |
| `balance_after` | DECIMAL | Balance snapshot after transaction |
| `related_order_id` | UUID | If related to order |
| `related_order_item_id` | UUID | Specific item |
| `related_payout_id` | UUID | If part of payout |
| `related_refund_id` | UUID | If refund transaction |
| `description` | TEXT | Human-readable description |
| `metadata` | JSONB | Extra data in JSON |

**Why This Matters:**

```sql
-- Seller disputes: "I should have ₹50,000, why do I have ₹45,230?"

SELECT * FROM seller_balance_transactions 
WHERE seller_id = 'seller-abc' 
ORDER BY created_at DESC;

Result:
1. Nov 12: Refund -₹3,354 (Order #1003 refunded + fees)
2. Nov 10: Order +₹3,123 (Order #1004)
3. Nov 8:  Order +₹1,757 (Order #1003) [Later refunded]
4. Nov 5:  Order +₹2,245 (Order #1002)
...

Every transaction tracked = Full transparency
```

**Example Records:**
```sql
-- Order completed
{
  type: "order",
  amount: +4392.00,
  balance_before: 40838.00,
  balance_after: 45230.00,
  related_order_item_id: "item-001",
  description: "Order #ORD-1001"
}

-- Refund issued
{
  type: "refund",
  amount: -3354.00,  -- Negative!
  balance_before: 48584.00,
  balance_after: 45230.00,
  related_refund_id: "refund-001",
  description: "Refund for order item (including Razorpay fees)"
}

-- Payout made
{
  type: "payout",
  amount: -45230.00,
  balance_before: 45230.00,
  balance_after: 0.00,
  related_payout_id: "payout-123",
  description: "Payout for 11/2025"
}
```

---

### **5. `payout_approval_logs` - Admin Action History**

**Purpose**: Track what admins did and when. Essential for accountability.

#### **Columns Explained:**

| Column | Type | Why We Need It |
|--------|------|----------------|
| `log_id` | UUID | Unique identifier |
| `payout_id` | UUID | Which payout was affected |
| `action` | VARCHAR | `approved`, `paid`, `rejected`, `put_on_hold` |
| `performed_by` | UUID | Which admin did this |
| `performed_at` | TIMESTAMP | When |
| `previous_status` | VARCHAR | Status before action |
| `new_status` | VARCHAR | Status after action |
| `notes` | TEXT | Admin's notes |
| `payment_method` | VARCHAR | For 'paid' action |
| `payment_reference` | VARCHAR | Transaction ID |

**Why Log Everything?**

```
Scenario: Seller claims "I wasn't paid on 28th"

SELECT * FROM payout_approval_logs 
WHERE payout_id = 'payout-123';

Result:
1. Nov 28, 10:00 AM - Generated (System)
2. Nov 29, 2:00 PM  - Approved (Admin: John)
3. Nov 30, 4:30 PM  - Paid (Admin: Sarah)
   Method: Bank Transfer
   Reference: UTR123456789

Proof: Payout was approved and paid with transaction ID
```

**Example Records:**
```sql
-- Approval
{
  payout_id: "payout-123",
  action: "approved",
  performed_by: "admin-john",
  previous_status: "pending",
  new_status: "approved",
  notes: "All verified, ready for payment"
}

-- Payment
{
  payout_id: "payout-123",
  action: "paid",
  performed_by: "admin-sarah",
  previous_status: "approved",
  new_status: "paid",
  payment_method: "Bank Transfer",
  payment_reference: "UTR123456789",
  notes: "Paid via HDFC NEFT"
}
```

---

## 🔄 System Flow

### **Complete Lifecycle Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELLER PAYOUT LIFECYCLE                      │
└─────────────────────────────────────────────────────────────────┘

 ┌──────────────────────────────────────────────────────────────┐
 │ PHASE 1: ORDER COMPLETION                                    │
 └──────────────────────────────────────────────────────────────┘
 
 Customer places order → Payment successful → Items delivered
                              ↓
                    ┌─────────────────────┐
                    │ recordSellerEarning │
                    └─────────┬───────────┘
                              ↓
                    1. Check: Is this seller's 1st/2nd/3rd order?
                       └─ Yes → Hold until next month
                       └─ No  → Available for current month
                              ↓
                    2. Calculate proportional Razorpay fees
                       Order total: ₹10,000
                       Seller's item: ₹5,000 (50%)
                       Total fee: ₹240
                       Seller pays: ₹120
                              ↓
                    3. Create entry in seller_payout_items
                       - item_subtotal: ₹5,000
                       - allocated_razorpay_fee: ₹120
                       - settlement_hold_until: Nov 28 or Dec 28
                       - is_settled: FALSE
                              ↓
                    4. Update seller_balances
                       IF (in hold period):
                         pending_balance += (5000 - 120) = ₹4,880
                       ELSE:
                         available_balance += ₹4,880
                              ↓
                    5. Record in seller_balance_transactions
                       type: "order"
                       amount: +₹4,880

 ┌──────────────────────────────────────────────────────────────┐
 │ PHASE 2: REFUND HANDLING (If customer refunds)              │
 └──────────────────────────────────────────────────────────────┘
 
 Customer requests refund → Admin approves → Refund processed
                              ↓
                    ┌─────────────────┐
                    │  handleRefund   │
                    └────────┬────────┘
                             ↓
                    1. Find the payout_item record
                       order_item_id: "item-001"
                              ↓
                    2. Mark as refunded
                       UPDATE seller_payout_items
                       SET is_refunded = TRUE,
                           refund_amount = ₹5,000
                              ↓
                    3. Calculate total deduction
                       Refund amount: ₹5,000
                       + Original Razorpay fee: ₹120
                       + Original Razorpay tax: ₹21.60
                       ─────────────────────────
                       Total to deduct: ₹5,141.60
                              ↓
                       WHY? Because Razorpay doesn't refund fees!
                       Seller must bear the cost of the failed transaction.
                              ↓
                    4. Update seller_balances
                       available_balance -= ₹5,141.60
                       total_refunded += ₹5,141.60
                              ↓
                    5. Record transaction
                       type: "refund"
                       amount: -₹5,141.60

 ┌──────────────────────────────────────────────────────────────┐
 │ PHASE 3: MONTHLY PAYOUT GENERATION (28th of every month)    │
 └──────────────────────────────────────────────────────────────┘
 
 28th arrives → Cron job triggers → generateMonthlyPayouts()
                              ↓
                    1. Get all sellers
                       WHERE verification_status = 'verified'
                              ↓
                    2. For each seller:
                       Get all payout items where:
                       - is_settled = FALSE
                       - settlement_hold_until <= TODAY
                              ↓
                    3. Calculate amounts:
                       
                       Gross Sales:
                       SUM(item_subtotal) WHERE is_refunded = FALSE
                       = ₹50,000
                       
                       Razorpay Fees:
                       SUM(allocated_razorpay_fee + allocated_razorpay_tax)
                       = ₹1,416
                       
                       Refund Deductions:
                       SUM(refund_amount + fees) WHERE is_refunded = TRUE
                       = ₹3,354
                       
                       Net Amount:
                       50,000 - 1,416 - 3,354 = ₹45,230
                              ↓
                    4. Create seller_payouts record
                       {
                         seller_id: "seller-abc",
                         payout_month: 11,
                         payout_year: 2025,
                         gross_sales: 50000,
                         razorpay_fees: 1416,
                         refund_deductions: 3354,
                         net_amount: 45230,
                         status: "pending"
                       }
                              ↓
                    5. Link items to payout
                       UPDATE seller_payout_items
                       SET payout_id = 'payout-123',
                           is_settled = TRUE
                       WHERE <eligible items>
                              ↓
                    6. Move balance from pending to available
                       (For items that were in hold period)
                       pending_balance → available_balance
                              ↓
                    7. Send notification to admin
                       "12 payouts generated and ready for review"

 ┌──────────────────────────────────────────────────────────────┐
 │ PHASE 4: ADMIN REVIEW & APPROVAL                             │
 └──────────────────────────────────────────────────────────────┘
 
 Admin logs in → Views pending payouts → Reviews details
                              ↓
                    Admin checks:
                    ✓ Seller verified
                    ✓ Bank details correct
                    ✓ Calculation accurate
                    ✓ No disputes
                              ↓
                    Admin clicks "Approve"
                              ↓
                    ┌─────────────────┐
                    │  approvePayout  │
                    └────────┬────────┘
                             ↓
                    1. Update seller_payouts
                       status: "pending" → "approved"
                       approved_by: admin_id
                       approved_at: NOW()
                              ↓
                    2. Log the action
                       INSERT INTO payout_approval_logs
                       action: "approved"
                              ↓
                    3. Send email to seller
                       "Your payout of ₹45,230 is approved"

 ┌──────────────────────────────────────────────────────────────┐
 │ PHASE 5: MANUAL PAYMENT                                      │
 └──────────────────────────────────────────────────────────────┘
 
 Admin goes to bank → Makes transfer → Returns to panel
                              ↓
                    Admin clicks "Mark as Paid"
                              ↓
                    Enters:
                    - Payment method: Bank Transfer
                    - Reference: UTR123456789
                    - Date: Today
                    - Notes: "Paid via HDFC NEFT"
                              ↓
                    ┌────────────────────┐
                    │ markPayoutAsPaid   │
                    └─────────┬──────────┘
                              ↓
                    1. Validate: status must be "approved"
                              ↓
                    2. Update seller_payouts
                       status: "approved" → "paid"
                       paid_by: admin_id
                       paid_at: NOW()
                       payment_method: "Bank Transfer"
                       payment_reference: "UTR123456789"
                              ↓
                    3. Update seller_balances
                       available_balance -= ₹45,230
                       total_paid_out += ₹45,230
                       last_payout_date: TODAY
                       last_payout_amount: ₹45,230
                              ↓
                    4. Record transaction
                       type: "payout"
                       amount: -₹45,230
                       description: "Payout for 11/2025"
                              ↓
                    5. Log the action
                       INSERT INTO payout_approval_logs
                       action: "paid"
                       payment_method: "Bank Transfer"
                       payment_reference: "UTR123456789"
                              ↓
                    6. Send confirmation email to seller
                       "Payment of ₹45,230 completed"
                       "Reference: UTR123456789"
                              ↓
                    7. Generate invoice/receipt (optional)

 ┌──────────────────────────────────────────────────────────────┐
 │ COMPLETE ✅                                                  │
 └──────────────────────────────────────────────────────────────┘
```

---

## 💼 Business Logic

### **1. Proportional Fee Allocation**

**Problem:** When customer orders from multiple sellers in one transaction, how to split Razorpay fees?

**Solution:**
```typescript
function allocateRazorpayFees(payment, orderItems) {
  const totalOrderAmount = payment.amount; // ₹10,000
  const totalFee = payment.razorpay_fee;   // ₹240
  const totalTax = payment.razorpay_tax;   // ₹43.20
  
  return orderItems.map(item => {
    const ratio = item.subtotal / totalOrderAmount;
    
    return {
      seller_id: item.seller_id,
      item_subtotal: item.subtotal,
      allocated_fee: totalFee * ratio,
      allocated_tax: totalTax * ratio,
      net_earning: item.subtotal - (totalFee * ratio) - (totalTax * ratio)
    };
  });
}
```

**Example:**
```
Order: ₹10,000 (Razorpay fee: ₹240)

Seller A: ₹6,000 (60%)
- Fee: ₹240 × 60% = ₹144
- Net: ₹6,000 - ₹144 = ₹5,856

Seller B: ₹2,500 (25%)
- Fee: ₹240 × 25% = ₹60
- Net: ₹2,500 - ₹60 = ₹2,440

Seller C: ₹1,500 (15%)
- Fee: ₹240 × 15% = ₹36
- Net: ₹1,500 - ₹36 = ₹1,464

Total fees: ₹144 + ₹60 + ₹36 = ₹240 ✓
```

---

### **2. 3-Order Hold Period**

**Problem:** Protect against immediate refunds from new sellers.

**Solution:**
```typescript
async function calculateSettlementDate(sellerId, orderDate) {
  // Count completed orders for this seller
  const { count } = await supabase
    .from('order_items')
    .select('*', { count: 'exact', head: true })
    .eq('seller_id', sellerId)
    .in('status', ['delivered', 'completed']);
  
  const settlementDate = new Date(orderDate);
  
  if (count < 3) {
    // First 3 orders: hold until next month
    settlementDate.setMonth(settlementDate.getMonth() + 2);
  } else {
    // 4th order onwards: pay same cycle
    settlementDate.setMonth(settlementDate.getMonth() + 1);
  }
  
  settlementDate.setDate(28); // Always 28th
  
  return settlementDate;
}
```

**Example Timeline:**
```
New Seller Joins: Nov 1, 2025

Order 1 (Nov 3):  settlement_hold_until = Dec 28, 2025
Order 2 (Nov 7):  settlement_hold_until = Dec 28, 2025
Order 3 (Nov 12): settlement_hold_until = Dec 28, 2025
Order 4 (Nov 18): settlement_hold_until = Nov 28, 2025 ← Immediate cycle
Order 5 (Nov 25): settlement_hold_until = Nov 28, 2025

Nov 28 Payout: Only Order 4 & 5 included (₹8,000)
Dec 28 Payout: Order 1, 2, 3 + new orders (₹30,000)
```

**Why?**
- If seller sells fake products and gets refunds, we haven't paid them yet
- Gives time to verify seller legitimacy
- Standard practice in marketplaces

---

### **3. Refund Fee Recovery**

**Problem:** When customer gets refund, Razorpay keeps the transaction fee. Who bears this cost?

**Answer:** The seller.

**Implementation:**
```typescript
async function handleRefund(refundId) {
  const { data: refund } = await getRefundDetails(refundId);
  const { data: payoutItem } = await getPayoutItem(refund.order_item_id);
  
  // CRITICAL: Deduct both refund AND original fees
  const totalDeduction = 
    refund.amount +                           // Refund to customer
    payoutItem.allocated_razorpay_fee +       // Original fee
    payoutItem.allocated_razorpay_tax;        // Original tax
  
  await deductFromSellerBalance(seller_id, totalDeduction);
}
```

**Real Example:**
```
Customer buys item for ₹5,000
Razorpay fee: ₹120 (2.4%)
Seller receives: ₹4,880

Customer refunds ₹5,000
Razorpay refunds ₹5,000 to customer
Razorpay KEEPS the ₹120 fee

Who pays? Seller!

Deduction from seller:
₹5,000 (refund) + ₹120 (fee) = ₹5,120

Seller's final loss: ₹120
```

**Why this matters:**
```
If we don't deduct fees on refunds:
1. Customer pays ₹5,000
2. Razorpay takes ₹120
3. Seller gets ₹4,880
4. Customer refunds
5. Razorpay refunds ₹5,000 to customer
6. Razorpay keeps ₹120
7. We refund ₹5,000 to customer from our pocket
8. We lose ₹120!

Correct approach:
- Track the ₹120 fee from step 2
- When refund happens, deduct ₹5,120 from seller
- We refund ₹5,000 to customer
- Seller bears the ₹120 cost (fair, as item was faulty)
```

---

### **4. Balance Calculation**

**Formula:**
```
Available Balance = 
  Previous Available Balance
  + New Orders (net of fees)
  - Refunds (including original fees)
  - Payouts Made

Pending Balance = 
  Orders in 3-order hold period
  (Will move to Available after hold expires)

Total Balance = Available + Pending
```

**Example Calculation:**
```sql
-- Starting balance
available_balance: ₹40,000
pending_balance: ₹8,000

-- New order (4th order, no hold)
+ ₹5,000 (item) - ₹120 (fee) = +₹4,880
available_balance: ₹44,880

-- New order (2nd order for new seller, in hold)
+ ₹3,000 (item) - ₹72 (fee) = +₹2,928
pending_balance: ₹10,928

-- Refund
- ₹5,120 (refund + original fee)
available_balance: ₹39,760

-- Payout on 28th
- ₹39,760
available_balance: ₹0

-- After 28th, move from pending
available_balance: ₹0 + ₹10,928 = ₹10,928
pending_balance: ₹0
```

---

## 🎬 Examples & Scenarios

### **Scenario 1: Simple Month with No Complications**

```
Seller: ABC Store
Month: November 2025

Orders:
1. Nov 5:  ₹4,500 - ₹108 fee = ₹4,392 ✓
2. Nov 10: ₹3,200 - ₹77 fee = ₹3,123 ✓
3. Nov 15: ₹2,800 - ₹67 fee = ₹2,733 ✓
4. Nov 20: ₹5,100 - ₹122 fee = ₹4,978 ✓
5. Nov 25: ₹3,400 - ₹82 fee = ₹3,318 ✓

Total Orders: 5
Gross Sales: ₹19,000
Razorpay Fees: ₹456
Net Amount: ₹18,544

Nov 28 Payout:
Status: Pending → Approved → Paid
Amount: ₹18,544
```

---

### **Scenario 2: With Refunds**

```
Seller: XYZ Shop
Month: November 2025

Orders:
1. Nov 3:  ₹5,000 - ₹120 fee = ₹4,880 ✓
2. Nov 8:  ₹3,000 - ₹72 fee = ₹2,928 ✓ [REFUNDED on Nov 12]
3. Nov 14: ₹4,200 - ₹101 fee = ₹4,099 ✓
4. Nov 22: ₹2,500 - ₹60 fee = ₹2,440 ✓

Refund Breakdown (Order 2):
- Customer refunded: ₹3,000
- Original fee: ₹72
- Total deduction: ₹3,072

Payout Calculation:
Gross Sales: ₹14,700 (₹5,000 + ₹4,200 + ₹2,500)
Razorpay Fees: ₹281 (₹120 + ₹101 + ₹60)
Refund Deductions: ₹3,072 (₹3,000 + ₹72)

Net Amount: ₹14,700 - ₹281 - ₹3,072 = ₹11,347

Why seller lost money on refund:
- Earned from order 2: +₹2,928
- Deducted on refund: -₹3,072
- Net loss: -₹144 (the fees are lost!)
```

---

### **Scenario 3: New Seller with 3-Order Hold**

```
Seller: New Shop (Just joined)
Month: November 2025

Order 1 (Nov 5): ₹2,000 - ₹48 fee = ₹1,952
→ settlement_hold_until = Dec 28
→ Goes to: pending_balance

Order 2 (Nov 10): ₹3,500 - ₹84 fee = ₹3,416
→ settlement_hold_until = Dec 28
→ Goes to: pending_balance

Order 3 (Nov 15): ₹2,800 - ₹67 fee = ₹2,733
→ settlement_hold_until = Dec 28
→ Goes to: pending_balance

Order 4 (Nov 20): ₹4,200 - ₹101 fee = ₹4,099
→ settlement_hold_until = Nov 28 (immediate!)
→ Goes to: available_balance

Order 5 (Nov 25): ₹3,000 - ₹72 fee = ₹2,928
→ settlement_hold_until = Nov 28
→ Goes to: available_balance

Nov 28 Payout:
Available: ₹4,099 + ₹2,928 = ₹7,027
Pending: ₹1,952 + ₹3,416 + ₹2,733 = ₹8,101

Seller receives: ₹7,027
Held for next month: ₹8,101

Dec 28 Payout:
Previous held amount released: ₹8,101
+ New November orders
= Larger payout
```

---

### **Scenario 4: Multi-Seller Order**

```
Customer Order Total: ₹15,000
Razorpay Fee: ₹360 (2.4%)
Razorpay Tax: ₹64.80 (18% of fee)

Cart Breakdown:
- Seller A: 2 items = ₹8,000 (53.33%)
- Seller B: 1 item = ₹4,500 (30%)
- Seller C: 1 item = ₹2,500 (16.67%)

Fee Allocation:
- Seller A: ₹360 × 53.33% = ₹192 + ₹34.56 tax = ₹226.56
- Seller B: ₹360 × 30% = ₹108 + ₹19.44 tax = ₹127.44
- Seller C: ₹360 × 16.67% = ₹60 + ₹10.80 tax = ₹70.80

Net Earnings:
- Seller A: ₹8,000 - ₹226.56 = ₹7,773.44
- Seller B: ₹4,500 - ₹127.44 = ₹4,372.56
- Seller C: ₹2,500 - ₹70.80 = ₹2,429.20

Total: ₹14,575.20
(₹15,000 - ₹424.80 fees = ₹14,575.20 ✓)

Each seller's payout_item record:
{
  seller_a_item: {
    item_subtotal: 8000,
    allocated_razorpay_fee: 192,
    allocated_razorpay_tax: 34.56
  },
  seller_b_item: {
    item_subtotal: 4500,
    allocated_razorpay_fee: 108,
    allocated_razorpay_tax: 19.44
  },
  seller_c_item: {
    item_subtotal: 2500,
    allocated_razorpay_fee: 60,
    allocated_razorpay_tax: 10.80
  }
}
```

---

## 👨‍💼 Admin Workflow

### **Monthly Routine (28th of Every Month)**

```
┌─────────────────────────────────────────┐
│ 28th Morning - 12:00 AM                 │
├─────────────────────────────────────────┤
│ 1. System auto-generates payouts        │
│    - Status: PENDING                    │
│    - Admin notified via email           │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ 28th Morning - 10:00 AM                 │
├─────────────────────────────────────────┤
│ 2. Admin logs into dashboard            │
│    - Sees: "12 Payouts Pending"         │
│    - Total amount: ₹4,50,000            │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Review Each Payout                       │
├─────────────────────────────────────────┤
│ For Each Seller:                         │
│ ✓ Check seller verification             │
│ ✓ Review order items                    │
│ ✓ Verify calculations                   │
│ ✓ Check for disputes                    │
│ ✓ Validate bank details                 │
│                                         │
│ Decision:                               │
│ → Approve (most cases)                  │
│ → Reject (if issues found)              │
│ → Hold (if investigation needed)        │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Bulk Approve                             │
├─────────────────────────────────────────┤
│ Select all verified sellers             │
│ Click "Approve Selected (10)"           │
│ Status: PENDING → APPROVED              │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Make Bank Transfers                      │
├─────────────────────────────────────────┤
│ Go to bank portal/UPI                   │
│ Transfer money to each seller           │
│ Note down UTR/Transaction IDs           │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Mark as Paid in System                   │
├─────────────────────────────────────────┤
│ For each payout:                         │
│ 1. Click "Mark as Paid"                 │
│ 2. Enter:                               │
│    - Payment method: Bank Transfer      │
│    - Reference: UTR123456789            │
│    - Date: 28/11/2025                   │
│    - Notes: Via HDFC NEFT               │
│ 3. Upload proof (optional)              │
│ 4. Confirm                              │
│                                         │
│ Status: APPROVED → PAID                 │
│ Seller notified via email               │
└─────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Complete ✅                              │
├─────────────────────────────────────────┤
│ All payouts processed                   │
│ Sellers paid                            │
│ Records maintained                      │
│ Ready for next month                    │
└─────────────────────────────────────────┘
```

---

## ⚠️ Edge Cases

### **1. Partial Refunds**

```sql
Problem: Customer refunds only 1 item from multi-item order

Solution:
- Track refunds at order_item level
- Deduct only that item's amount + proportional fee
- Other items remain in payout

Example:
Order has 2 items from same seller:
- Item 1: ₹3,000 (fee: ₹72)
- Item 2: ₹2,000 (fee: ₹48)

Customer refunds Item 1:
- Deduct: ₹3,000 + ₹72 = ₹3,072
- Item 2 remains: ₹2,000 - ₹48 = ₹1,952

Net payout: ₹1,952
```

---

### **2. Negative Balance**

```sql
Scenario: Seller has more refunds than earnings

Example:
Month starts: Balance = ₹5,000
Order 1: +₹3,000 (Balance: ₹8,000)
Order 2: +₹2,500 (Balance: ₹10,500)
Refund for old order: -₹12,000 (Balance: -₹1,500)

Solution:
1. Allow negative balance
2. Deduct from next month's payout
3. If consistently negative, flag seller
4. Admin can investigate and decide:
   - Request seller to pay back
   - Deduct from future earnings
   - Block seller if fraudulent
```

---

### **3. Seller Deleted After Orders**

```sql
Problem: Seller account deleted but has pending payouts

Solution:
- Don't allow deletion if:
  - Available balance > 0
  - Pending payouts exist
  - Unsettled orders exist

Soft delete approach:
- Mark as inactive
- Complete all pending payouts
- Then allow full deletion
```

---

### **4. Payout on 28th Falls on Holiday/Sunday**

```sql
Problem: Can't process bank transfers on holidays

Solution:
- Admin can manually adjust payout_date
- System tracks intended date vs actual date
- Transparency in logs
```

---

### **5. Disputed Orders**

```sql
Problem: Order under dispute when payout is due

Solution:
1. Put specific payout on hold
   Status: PENDING → ON_HOLD
2. Hold only disputed orders
3. Pay rest of the amount
4. After dispute resolved:
   - Include in next month's payout
   - Or create adjustment entry
```

---

### **6. Commission Changes**

```sql
Problem: Platform commission changes mid-month

Solution:
- Store commission % at order_item level
- Each payout_item has its own commission
- Historical accuracy maintained

Example:
Nov 1-15: Commission 10%
Nov 16-30: Commission 12%

Order on Nov 10: Uses 10%
Order on Nov 20: Uses 12%

Payout calculates each correctly
```

---

## 📌 Key Takeaways

### **Why This Architecture?**

1. **Accuracy**: Every rupee tracked
2. **Transparency**: Complete audit trail
3. **Fairness**: Proportional fee distribution
4. **Safety**: 3-order hold protects platform
5. **Flexibility**: Admin can handle edge cases
6. **Scalability**: Works for 10 or 10,000 sellers

### **Critical Points:**

✅ Never pay sellers immediately (3-order hold)  
✅ Always deduct Razorpay fees on refunds  
✅ Track every balance change  
✅ Log every admin action  
✅ Maintain both available and pending balances  
✅ Calculate fees proportionally for multi-seller orders  

### **Common Mistakes to Avoid:**

❌ Paying sellers before order completion  
❌ Not deducting fees on refunds  
❌ Using total order fee instead of proportional  
❌ Not tracking transaction history  
❌ Allowing negative balance without monitoring  
❌ Processing payouts automatically without review  

---

## 🎓 Summary

This system provides:
- **Financial Accuracy**: Every transaction tracked
- **Risk Mitigation**: Hold periods and fee recovery
- **Admin Control**: Manual approval workflow
- **Seller Transparency**: Clear balance visibility
- **Audit Compliance**: Complete history
- **Scalability**: Handles growth efficiently

The combination of automated calculations with manual admin approval gives you the best of both worlds: efficiency and control.

---

**Next Steps:**
1. Run SQL migration
2. Implement order completion hook
3. Set up monthly cron job
4. Build admin UI
5. Create seller dashboard
6. Test with sample data

---

*Last Updated: November 19, 2025*
*Version: 1.0*
