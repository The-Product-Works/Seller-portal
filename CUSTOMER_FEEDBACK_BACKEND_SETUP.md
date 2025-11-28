# Customer Feedback Backend Integration Setup

## Overview
This setup connects the Customer Feedback page to the backend database with three main functionalities:

1. **Messages Table**: For direct admin-seller communication
2. **Seller Admin Questions Table**: For Q&A functionality
3. **Product Reviews**: Already connected (uses existing table)

## Database Tables Created

### 1. Messages Table
- **Purpose**: Direct communication between sellers and admins
- **Fields**: sender_id, receiver_id, subject, message_text, message_type, etc.
- **Migration**: `20251128000001_create_messages_table.sql`

### 2. Seller Admin Questions Table
- **Purpose**: Q&A system for sellers to ask admins questions
- **Fields**: seller_id, question_text, admin_response, status, etc.
- **Migration**: `20251128000002_create_seller_admin_questions_table.sql`

### 3. Product Reviews (Existing)
- **Already Connected**: Uses existing `product_reviews` table
- **Functionality**: Shows reviews for seller's products with filtering and analytics

## How to Run Migrations

1. **Run the migrations**:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or run SQL directly in Supabase Dashboard > SQL Editor
   ```

2. **Verify tables exist**:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('messages', 'seller_admin_questions', 'product_reviews');
   ```

## Admin User Setup

The system automatically finds admin users by querying the `user_roles` and `roles` tables:

```sql
-- Check if you have admin users
SELECT ur.user_id, u.email, r.role_name, up.full_name
FROM user_roles ur
JOIN roles r ON ur.role_id = r.role_id
JOIN users u ON ur.user_id = u.id
LEFT JOIN user_profiles up ON ur.user_id = up.user_id
WHERE r.role_name = 'admin';
```

If no admin users exist, you need to:
1. Create an admin user in the `users` table
2. Assign the 'admin' role in `user_roles` table
3. Add profile information in `user_profiles` table

## Features Implemented

### ✅ Customer Reviews
- Loads reviews from `product_reviews` table for seller's listings
- Filters by rating, status, product
- Shows review analytics and trends
- Displays review images

### ✅ Q&A with Admin
- **Ask Questions**: Inserts into `seller_admin_questions` table
- **View History**: Loads questions and admin responses
- **Product-specific**: Can link questions to specific products
- **Status Tracking**: pending/answered/closed

### ✅ Contact Admin
- **Direct Messages**: Inserts into `messages` table
- **Admin Details**: Shows admin name, email, phone from database
- **Subject & Message**: Structured communication

### ✅ Admin Details Display
- **Dynamic Loading**: Queries admin user details from database
- **Contact Info**: Shows name, email (clickable), phone (clickable)
- **Fallback**: Uses mock data if no admin found

## Testing the Integration

1. **Run migrations** and verify tables exist
2. **Check admin user** exists with proper role
3. **Test Q&A**: Ask a question → should appear in database
4. **Test Messages**: Send message to admin → should appear in database
5. **Test Reviews**: Should load existing reviews for your products

## Database Schema Summary

```sql
-- Messages for direct communication
messages (
  message_id uuid PRIMARY KEY,
  sender_id uuid REFERENCES users(id),
  receiver_id uuid REFERENCES users(id),
  subject text,
  message_text text NOT NULL,
  message_type text DEFAULT 'direct',
  created_at timestamp DEFAULT now()
)

-- Q&A system
seller_admin_questions (
  question_id uuid PRIMARY KEY,
  seller_id uuid REFERENCES sellers(id),
  listing_id uuid REFERENCES seller_product_listings(listing_id),
  question_text text NOT NULL,
  admin_response text,
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now()
)

-- Reviews (existing table)
product_reviews (
  review_id uuid PRIMARY KEY,
  listing_id uuid REFERENCES seller_product_listings(listing_id),
  buyer_id uuid REFERENCES users(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  status text DEFAULT 'pending',
  created_at timestamp DEFAULT now()
)
```

## Next Steps

1. **Run migrations** to create the tables
2. **Set up admin user** with proper role and contact details
3. **Test all functionalities** in the Customer Feedback page
4. **Admin Dashboard**: Create admin interface to respond to questions and messages
5. **Notifications**: Add email/SMS notifications for new messages/questions

The Customer Feedback page is now fully connected to the backend! 🎉