-- =====================================================
-- FSSAI Notification System Diagnostic
-- =====================================================
-- Run this to diagnose why notifications aren't showing
-- =====================================================

-- Step 1: Check if table exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'fssai_expiry_notifications'
        ) 
        THEN '✅ Table EXISTS' 
        ELSE '❌ Table MISSING - Run FIX_FSSAI_NOTIFICATIONS.sql'
    END as table_status;

-- Step 2: Check if functions exist
SELECT 
    routine_name,
    '✅ EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name LIKE '%fssai%'
ORDER BY routine_name;

-- Step 3: Check seller FSSAI data
SELECT 
    id as seller_id,
    business_name,
    fssai_license_number,
    fssai_license_expiry_date,
    (fssai_license_expiry_date - CURRENT_DATE) as days_until_expiry,
    CASE 
        WHEN fssai_license_number IS NULL OR fssai_license_number = 'NA' THEN '❌ No FSSAI number'
        WHEN fssai_license_expiry_date IS NULL THEN '❌ No expiry date'
        WHEN (fssai_license_expiry_date - CURRENT_DATE) > 30 THEN '⏰ Expires in more than 30 days'
        WHEN (fssai_license_expiry_date - CURRENT_DATE) BETWEEN 0 AND 30 THEN '⚠️ SHOULD TRIGGER NOTIFICATION'
        WHEN (fssai_license_expiry_date - CURRENT_DATE) < 0 THEN '🚨 EXPIRED'
        ELSE 'Unknown'
    END as notification_status
FROM public.sellers
WHERE user_id = auth.uid()
LIMIT 5;

-- Step 4: Check product variant FSSAI data
SELECT 
    lv.variant_id,
    gp.product_name,
    lv.variant_name,
    lv.fssai_number,
    lv.fssai_expiry_date,
    (lv.fssai_expiry_date - CURRENT_DATE) as days_until_expiry,
    CASE 
        WHEN lv.fssai_number IS NULL THEN '❌ No FSSAI number'
        WHEN lv.fssai_expiry_date IS NULL THEN '❌ No expiry date'
        WHEN (lv.fssai_expiry_date - CURRENT_DATE) > 30 THEN '⏰ Expires in more than 30 days'
        WHEN (lv.fssai_expiry_date - CURRENT_DATE) BETWEEN 0 AND 30 THEN '⚠️ SHOULD TRIGGER NOTIFICATION'
        WHEN (lv.fssai_expiry_date - CURRENT_DATE) < 0 THEN '🚨 EXPIRED'
        ELSE 'Unknown'
    END as notification_status
FROM public.listing_variants lv
JOIN public.seller_product_listings spl ON lv.listing_id = spl.listing_id
JOIN public.global_products gp ON spl.global_product_id = gp.global_product_id
JOIN public.sellers s ON spl.seller_id = s.id
WHERE s.user_id = auth.uid()
LIMIT 10;

-- Step 5: Check existing notifications
SELECT 
    COUNT(*) as total_notifications,
    SUM(CASE WHEN notification_status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN notification_status = 'acknowledged' THEN 1 ELSE 0 END) as acknowledged,
    SUM(CASE WHEN notification_status = 'dismissed' THEN 1 ELSE 0 END) as dismissed,
    SUM(CASE WHEN notification_type = 'seller_kyc_fssai' THEN 1 ELSE 0 END) as kyc_notifications,
    SUM(CASE WHEN notification_type = 'product_fssai' THEN 1 ELSE 0 END) as product_notifications
FROM public.fssai_expiry_notifications n
JOIN public.sellers s ON n.seller_id = s.id
WHERE s.user_id = auth.uid();

-- Step 6: Show actual notifications
SELECT 
    id,
    notification_type,
    notification_message,
    priority,
    days_until_expiry,
    notification_status,
    created_at,
    product_name,
    variant_name,
    kyc_fssai_number,
    variant_fssai_number
FROM public.fssai_expiry_notifications n
JOIN public.sellers s ON n.seller_id = s.id
WHERE s.user_id = auth.uid()
ORDER BY 
    CASE priority
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
    END,
    days_until_expiry ASC;

-- Step 7: Test RPC function call
SELECT * FROM public.get_seller_fssai_notifications(
    (SELECT id FROM public.sellers WHERE user_id = auth.uid() LIMIT 1),
    'pending'
);

-- =====================================================
-- MANUAL FIX: Create test notification
-- =====================================================
-- If you want to test, run this:
/*
INSERT INTO public.fssai_expiry_notifications (
    seller_id,
    notification_type,
    kyc_fssai_number,
    kyc_fssai_expiry_date,
    days_until_expiry,
    notification_message,
    priority,
    notification_status
)
SELECT 
    id,
    'seller_kyc_fssai',
    fssai_license_number,
    CURRENT_DATE + 7,
    7,
    '⚠️ TEST: Your FSSAI license expires in 7 days!',
    'critical',
    'pending'
FROM public.sellers
WHERE user_id = auth.uid()
LIMIT 1;
*/
