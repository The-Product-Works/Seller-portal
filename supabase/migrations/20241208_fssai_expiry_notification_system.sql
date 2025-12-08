-- =====================================================
-- FSSAI Expiry Notification System (Corrected)
-- =====================================================
-- Notifies sellers when their FSSAI licenses (KYC or product-level) are approaching expiry
-- =====================================================

-- Step 1: Create notifications table
CREATE TABLE IF NOT EXISTS public.fssai_expiry_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('seller_kyc_fssai', 'product_fssai')),
    
    -- Seller KYC FSSAI
    kyc_fssai_number VARCHAR(50),
    kyc_fssai_expiry_date DATE,
    
    -- Product Variant FSSAI
    listing_id UUID REFERENCES public.global_products(global_product_id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.listing_variants(variant_id) ON DELETE CASCADE,
    product_name VARCHAR(255),
    variant_name VARCHAR(255),
    variant_fssai_number VARCHAR(50),
    variant_fssai_expiry_date DATE,
    
    -- Notification details
    days_until_expiry INTEGER NOT NULL,
    notification_status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (notification_status IN ('pending', 'acknowledged', 'renewed', 'dismissed')),
    notification_message TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' 
        CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    renewed_at TIMESTAMPTZ,
    
    -- Prevent duplicate notifications
    UNIQUE(seller_id, notification_type, kyc_fssai_number, variant_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fssai_notifications_seller ON public.fssai_expiry_notifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_fssai_notifications_status ON public.fssai_expiry_notifications(notification_status);
CREATE INDEX IF NOT EXISTS idx_fssai_notifications_created ON public.fssai_expiry_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_fssai_notifications_variant ON public.fssai_expiry_notifications(variant_id);

-- Enable Row Level Security
ALTER TABLE public.fssai_expiry_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Sellers can view own FSSAI notifications"
ON public.fssai_expiry_notifications
FOR SELECT
USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

CREATE POLICY "Sellers can update own FSSAI notifications"
ON public.fssai_expiry_notifications
FOR UPDATE
USING (seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()));

-- =====================================================
-- Function 1: Check Seller KYC FSSAI Expiry
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_seller_kyc_fssai_expiry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_count INTEGER := 0;
    seller_record RECORD;
    days_until_expiry INTEGER;
    notification_msg TEXT;
    notification_priority VARCHAR(20);
BEGIN
    FOR seller_record IN 
        SELECT id AS seller_id, fssai_license_number, fssai_license_expiry_date, business_name
        FROM public.sellers
        WHERE fssai_license_expiry_date IS NOT NULL
          AND fssai_license_number IS NOT NULL
          AND fssai_license_expiry_date >= CURRENT_DATE
    LOOP
        days_until_expiry := (seller_record.fssai_license_expiry_date - CURRENT_DATE);
        IF days_until_expiry <= 30 THEN
            -- Set priority
            notification_priority := CASE
                WHEN days_until_expiry <= 7 THEN 'critical'
                WHEN days_until_expiry <= 15 THEN 'high'
                ELSE 'medium'
            END;

            -- Create message
            notification_msg := CASE
                WHEN days_until_expiry = 0 THEN format('🚨 URGENT: Your FSSAI license (%s) expires TODAY! Renew immediately.', seller_record.fssai_license_number)
                WHEN days_until_expiry = 1 THEN format('⚠️ CRITICAL: Your FSSAI license (%s) expires TOMORROW! Renew now.', seller_record.fssai_license_number)
                WHEN days_until_expiry <= 7 THEN format('⚠️ URGENT: Your FSSAI license (%s) expires in %s days. Please renew immediately.', seller_record.fssai_license_number, days_until_expiry)
                WHEN days_until_expiry <= 15 THEN format('⚠️ Your FSSAI license (%s) expires in %s days. Please renew soon.', seller_record.fssai_license_number, days_until_expiry)
                ELSE format('ℹ️ Reminder: Your FSSAI license (%s) expires in %s days. Plan your renewal.', seller_record.fssai_license_number, days_until_expiry)
            END;

            -- Insert or update
            INSERT INTO public.fssai_expiry_notifications (
                seller_id, notification_type, kyc_fssai_number, kyc_fssai_expiry_date,
                days_until_expiry, notification_message, priority, notification_status
            )
            VALUES (
                seller_record.seller_id, 'seller_kyc_fssai', seller_record.fssai_license_number, seller_record.fssai_license_expiry_date,
                days_until_expiry, notification_msg, notification_priority, 'pending'
            )
            ON CONFLICT (seller_id, notification_type, kyc_fssai_number, variant_id)
            DO UPDATE SET
                days_until_expiry = EXCLUDED.days_until_expiry,
                notification_message = EXCLUDED.notification_message,
                priority = EXCLUDED.priority,
                created_at = NOW()
            WHERE fssai_expiry_notifications.notification_status = 'pending';

            notification_count := notification_count + 1;
        END IF;
    END LOOP;

    RETURN notification_count;
END;
$$;

-- =====================================================
-- Function 2: Check Product Variant FSSAI Expiry
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_product_fssai_expiry()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_count INTEGER := 0;
    variant_record RECORD;
    days_until_expiry INTEGER;
    notification_msg TEXT;
    notification_priority VARCHAR(20);
BEGIN
    FOR variant_record IN
        SELECT lv.variant_id, lv.listing_id, spl.seller_id, lv.fssai_number, lv.fssai_expiry_date,
               lv.variant_name, gp.product_name
        FROM public.listing_variants lv
        JOIN public.seller_product_listings spl ON lv.listing_id = spl.listing_id
        JOIN public.global_products gp ON spl.global_product_id = gp.global_product_id
        WHERE lv.fssai_expiry_date IS NOT NULL
          AND lv.fssai_number IS NOT NULL
          AND lv.fssai_expiry_date >= CURRENT_DATE
    LOOP
        days_until_expiry := (variant_record.fssai_expiry_date - CURRENT_DATE);
        IF days_until_expiry <= 30 THEN
            notification_priority := CASE
                WHEN days_until_expiry <= 7 THEN 'critical'
                WHEN days_until_expiry <= 15 THEN 'high'
                ELSE 'medium'
            END;

            notification_msg := CASE
                WHEN days_until_expiry = 0 THEN format('🚨 URGENT: FSSAI license for "%s - %s" (License: %s) expires TODAY!', variant_record.product_name, variant_record.variant_name, variant_record.fssai_number)
                WHEN days_until_expiry = 1 THEN format('⚠️ CRITICAL: FSSAI license for "%s - %s" (License: %s) expires TOMORROW!', variant_record.product_name, variant_record.variant_name, variant_record.fssai_number)
                WHEN days_until_expiry <= 7 THEN format('⚠️ URGENT: FSSAI license for "%s - %s" (License: %s) expires in %s days.', variant_record.product_name, variant_record.variant_name, variant_record.fssai_number, days_until_expiry)
                WHEN days_until_expiry <= 15 THEN format('⚠️ FSSAI license for "%s - %s" (License: %s) expires in %s days.', variant_record.product_name, variant_record.variant_name, variant_record.fssai_number, days_until_expiry)
                ELSE format('ℹ️ Reminder: FSSAI license for "%s - %s" (License: %s) expires in %s days.', variant_record.product_name, variant_record.variant_name, variant_record.fssai_number, days_until_expiry)
            END;

            INSERT INTO public.fssai_expiry_notifications (
                seller_id, notification_type, listing_id, variant_id,
                product_name, variant_name, variant_fssai_number, variant_fssai_expiry_date,
                days_until_expiry, notification_message, priority, notification_status
            )
            VALUES (
                variant_record.seller_id, 'product_fssai', variant_record.listing_id, variant_record.variant_id,
                variant_record.product_name, variant_record.variant_name, variant_record.fssai_number, variant_record.fssai_expiry_date,
                days_until_expiry, notification_msg, notification_priority, 'pending'
            )
            ON CONFLICT (seller_id, notification_type, kyc_fssai_number, variant_id)
            DO UPDATE SET
                days_until_expiry = EXCLUDED.days_until_expiry,
                notification_message = EXCLUDED.notification_message,
                priority = EXCLUDED.priority,
                product_name = EXCLUDED.product_name,
                variant_name = EXCLUDED.variant_name,
                created_at = NOW()
            WHERE fssai_expiry_notifications.notification_status = 'pending';

            notification_count := notification_count + 1;
        END IF;
    END LOOP;

    RETURN notification_count;
END;
$$;

-- =====================================================
-- Function 3: Run All FSSAI Expiry Checks
-- =====================================================
CREATE OR REPLACE FUNCTION public.check_all_fssai_expiry()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    kyc_notifications INTEGER;
    product_notifications INTEGER;
    result JSON;
BEGIN
    kyc_notifications := public.check_seller_kyc_fssai_expiry();
    product_notifications := public.check_product_fssai_expiry();

    result := json_build_object(
        'success', true,
        'kyc_fssai_notifications', kyc_notifications,
        'product_fssai_notifications', product_notifications,
        'total_notifications', kyc_notifications + product_notifications,
        'checked_at', NOW()
    );

    RETURN result;
END;
$$;

-- =====================================================
-- Function 4: Get Seller's Active FSSAI Notifications
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_seller_fssai_notifications(
    p_seller_id UUID DEFAULT NULL,
    p_status VARCHAR DEFAULT 'pending'
)
RETURNS TABLE (
    id UUID,
    notification_type VARCHAR,
    notification_message TEXT,
    priority VARCHAR,
    days_until_expiry INTEGER,
    created_at TIMESTAMPTZ,
    product_name VARCHAR,
    variant_name VARCHAR,
    kyc_fssai_number VARCHAR,
    variant_fssai_number VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id, n.notification_type, n.notification_message, n.priority, n.days_until_expiry,
        n.created_at, n.product_name, n.variant_name, n.kyc_fssai_number, n.variant_fssai_number
    FROM public.fssai_expiry_notifications n
    WHERE (p_seller_id IS NULL OR n.seller_id = p_seller_id)
      AND (p_status IS NULL OR n.notification_status = p_status)
    ORDER BY CASE n.priority
                 WHEN 'critical' THEN 1
                 WHEN 'high' THEN 2
                 WHEN 'medium' THEN 3
                 WHEN 'low' THEN 4
             END,
             n.days_until_expiry ASC,
             n.created_at DESC;
END;
$$;

-- =====================================================
-- Function 5: Acknowledge/Dismiss Notification
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_fssai_notification_status(
    p_notification_id UUID,
    p_new_status VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_rows INTEGER;
BEGIN
    UPDATE public.fssai_expiry_notifications
    SET 
        notification_status = p_new_status,
        acknowledged_at = CASE WHEN p_new_status = 'acknowledged' THEN NOW() ELSE acknowledged_at END,
        renewed_at = CASE WHEN p_new_status = 'renewed' THEN NOW() ELSE renewed_at END
    WHERE id = p_notification_id
      AND seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid());

    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    RETURN updated_rows > 0;
END;
$$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION public.check_seller_kyc_fssai_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_product_fssai_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_all_fssai_expiry() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_seller_fssai_notifications(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_fssai_notification_status(UUID, VARCHAR) TO authenticated;

-- =====================================================
-- Initial check (run once)
-- =====================================================
SELECT public.check_all_fssai_expiry();
