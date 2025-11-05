-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.addresses (
  address_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL DEFAULT 'both'::address_type,
  name character varying NOT NULL,
  phone character varying NOT NULL,
  line1 character varying NOT NULL,
  line2 character varying,
  city character varying NOT NULL,
  state character varying NOT NULL,
  postal_code character varying NOT NULL,
  country character varying NOT NULL DEFAULT 'IN'::character varying,
  landmark character varying,
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT addresses_pkey PRIMARY KEY (address_id),
  CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.allergens (
  allergen_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  common_in text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT allergens_pkey PRIMARY KEY (allergen_id)
);
CREATE TABLE public.answer_votes (
  vote_id uuid NOT NULL DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['helpful'::character varying::text, 'not_helpful'::character varying::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT answer_votes_pkey PRIMARY KEY (vote_id),
  CONSTRAINT answer_votes_answer_id_fkey FOREIGN KEY (answer_id) REFERENCES public.product_answers(answer_id),
  CONSTRAINT answer_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.attributes (
  attribute_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  data_type character varying,
  CONSTRAINT attributes_pkey PRIMARY KEY (attribute_id)
);
CREATE TABLE public.audit_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  seller_id uuid,
  action text,
  performed_by uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.brands (
  brand_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  slug character varying NOT NULL UNIQUE,
  logo_url character varying,
  description text,
  website character varying,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (brand_id)
);
CREATE TABLE public.buyer_activity (
  activity_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type character varying NOT NULL,
  event_metadata jsonb,
  session_id uuid,
  device USER-DEFINED,
  browser character varying,
  os character varying,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buyer_activity_pkey PRIMARY KEY (activity_id),
  CONSTRAINT buyer_activity_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.buyer_allergies (
  buyer_allergy_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  allergen_id uuid NOT NULL,
  severity USER-DEFINED DEFAULT 'moderate'::severity,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buyer_allergies_pkey PRIMARY KEY (buyer_allergy_id),
  CONSTRAINT buyer_allergies_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT buyer_allergies_allergen_id_fkey FOREIGN KEY (allergen_id) REFERENCES public.allergens(allergen_id)
);
CREATE TABLE public.buyer_goals (
  goal_id uuid NOT NULL DEFAULT gen_random_uuid(),
  goal_name character varying NOT NULL UNIQUE,
  goal_description text,
  icon character varying,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT buyer_goals_pkey PRIMARY KEY (goal_id)
);
CREATE TABLE public.cart_discounts (
  discount_id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  code text,
  discount_type text CHECK (discount_type = ANY (ARRAY['percentage'::text, 'flat'::text])),
  discount_value numeric,
  applied_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_discounts_pkey PRIMARY KEY (discount_id),
  CONSTRAINT cart_discounts_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(cart_id)
);
CREATE TABLE public.cart_items (
  cart_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  variant_id uuid,
  seller_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL,
  subtotal numeric DEFAULT ((quantity)::numeric * price_per_unit),
  added_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (cart_item_id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(cart_id),
  CONSTRAINT cart_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT cart_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.listing_variants(variant_id),
  CONSTRAINT cart_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.carts (
  cart_id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'converted'::text, 'abandoned'::text])),
  total_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (cart_id),
  CONSTRAINT carts_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id)
);
CREATE TABLE public.categories (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  parent_id uuid,
  name character varying NOT NULL UNIQUE,
  slug character varying UNIQUE,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (category_id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.category_attributes (
  category_id uuid NOT NULL,
  attribute_id uuid NOT NULL,
  CONSTRAINT category_attributes_pkey PRIMARY KEY (category_id, attribute_id),
  CONSTRAINT category_attributes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id),
  CONSTRAINT category_attributes_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(attribute_id)
);
CREATE TABLE public.global_products (
  global_product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  brand_id uuid,
  product_name character varying NOT NULL,
  slug character varying NOT NULL UNIQUE,
  category_id uuid,
  total_listings_count integer DEFAULT 0,
  avg_rating_across_sellers numeric DEFAULT 0.0,
  total_reviews_across_sellers integer DEFAULT 0,
  lowest_price numeric,
  highest_price numeric,
  avg_health_score numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT global_products_pkey PRIMARY KEY (global_product_id),
  CONSTRAINT global_products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(brand_id),
  CONSTRAINT global_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.inventory (
  inventory_id uuid NOT NULL DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL UNIQUE,
  quantity integer DEFAULT 0,
  reserved integer DEFAULT 0,
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (inventory_id),
  CONSTRAINT inventory_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id)
);
CREATE TABLE public.listing_images (
  image_id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  variant_id uuid,
  image_url character varying NOT NULL,
  alt_text character varying,
  is_primary boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT listing_images_pkey PRIMARY KEY (image_id),
  CONSTRAINT listing_images_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT listing_images_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.listing_variants(variant_id)
);
CREATE TABLE public.listing_variants (
  variant_id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  sku character varying NOT NULL UNIQUE,
  variant_name character varying,
  size character varying,
  flavor character varying,
  serving_count integer,
  price numeric NOT NULL,
  original_price numeric,
  stock_quantity integer DEFAULT 0,
  reserved_quantity integer DEFAULT 0,
  manufacture_date date,
  batch_number character varying,
  expiry_date date,
  health_score integer CHECK (health_score >= 0 AND health_score <= 100),
  nutritional_info jsonb,
  is_available boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  image_url text,
  CONSTRAINT listing_variants_pkey PRIMARY KEY (variant_id),
  CONSTRAINT listing_variants_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid,
  receiver_id uuid,
  related_seller_id uuid,
  type text NOT NULL,
  title text,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id),
  CONSTRAINT notifications_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id),
  CONSTRAINT notifications_related_seller_id_fkey FOREIGN KEY (related_seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.order_cancellations (
  cancellation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  cancelled_by uuid NOT NULL,
  cancelled_by_role text NOT NULL CHECK (cancelled_by_role = ANY (ARRAY['buyer'::text, 'seller'::text, 'admin'::text])),
  reason text,
  refund_status text DEFAULT 'pending'::text CHECK (refund_status = ANY (ARRAY['pending'::text, 'processed'::text, 'failed'::text])),
  cancelled_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_cancellations_pkey PRIMARY KEY (cancellation_id),
  CONSTRAINT order_cancellations_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_cancellations_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id)
);
CREATE TABLE public.order_items (
  order_item_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  listing_id uuid NOT NULL,
  variant_id uuid,
  seller_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price_per_unit numeric NOT NULL,
  subtotal numeric DEFAULT ((quantity)::numeric * price_per_unit),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'packed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'returned'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (order_item_id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT order_items_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.listing_variants(variant_id),
  CONSTRAINT order_items_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.order_refunds (
  refund_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  processed_by uuid,
  amount numeric NOT NULL,
  method text CHECK (method = ANY (ARRAY['original'::text, 'wallet'::text, 'manual'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text])),
  processed_at timestamp with time zone DEFAULT now(),
  return_id uuid,
  payment_id uuid,
  CONSTRAINT order_refunds_pkey PRIMARY KEY (refund_id),
  CONSTRAINT order_refunds_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_refunds_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.users(id),
  CONSTRAINT order_refunds_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(return_id),
  CONSTRAINT order_refunds_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(payment_id)
);
CREATE TABLE public.order_returns (
  return_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  reason text NOT NULL,
  return_type text DEFAULT 'refund'::text CHECK (return_type = ANY (ARRAY['replacement'::text, 'refund'::text])),
  status text NOT NULL DEFAULT 'initiated'::text CHECK (status = ANY (ARRAY['initiated'::text, 'seller_review'::text, 'pickup_scheduled'::text, 'picked_up'::text, 'quality_check'::text, 'approved'::text, 'rejected'::text, 'refunded'::text, 'completed'::text])),
  initiated_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  notes text,
  CONSTRAINT order_returns_pkey PRIMARY KEY (return_id),
  CONSTRAINT order_returns_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_returns_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id),
  CONSTRAINT order_returns_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT order_returns_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT order_returns_order_item_fk FOREIGN KEY (order_item_id) REFERENCES public.order_items(order_item_id)
);
CREATE TABLE public.order_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  changed_by uuid,
  old_status text,
  new_status text,
  remarks text,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_status_history_pkey PRIMARY KEY (id),
  CONSTRAINT order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id)
);
CREATE TABLE public.order_tracking (
  tracking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  status text NOT NULL,
  url text NOT NULL,
  location text,
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_tracking_pkey PRIMARY KEY (tracking_id),
  CONSTRAINT order_tracking_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id)
);
CREATE TABLE public.orders (
  order_id uuid NOT NULL DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  address_id uuid,
  cart_id uuid,
  payment_id uuid,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'packed'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'returned'::text, 'refunded'::text])),
  total_amount numeric NOT NULL,
  shipping_cost numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  final_amount numeric DEFAULT ((total_amount + shipping_cost) - discount_amount),
  payment_status text DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'failed'::text, 'refunded'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (order_id),
  CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id),
  CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(address_id),
  CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(cart_id)
);
CREATE TABLE public.payments (
  payment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  method text CHECK (method = ANY (ARRAY['upi'::text, 'card'::text, 'wallet'::text, 'cod'::text, 'razorpay'::text])),
  amount numeric NOT NULL,
  status text DEFAULT 'initiated'::text CHECK (status = ANY (ARRAY['initiated'::text, 'success'::text, 'failed'::text, 'refunded'::text])),
  transaction_ref text,
  payment_gateway text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  razorpay_payment_id text NOT NULL,
  CONSTRAINT payments_pkey PRIMARY KEY (payment_id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT payments_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id),
  CONSTRAINT payments_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.product_allergens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid,
  allergen_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_allergens_pkey PRIMARY KEY (id),
  CONSTRAINT product_allergens_allergen_id_fkey FOREIGN KEY (allergen_id) REFERENCES public.allergens(allergen_id),
  CONSTRAINT product_allergens_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id)
);
CREATE TABLE public.product_answers (
  answer_id uuid NOT NULL DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL,
  answerer_id uuid,
  seller_id uuid,
  answer_text text NOT NULL,
  is_verified_seller boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  not_helpful_count integer DEFAULT 0,
  CONSTRAINT product_answers_pkey PRIMARY KEY (answer_id),
  CONSTRAINT product_answers_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.product_questions(question_id),
  CONSTRAINT product_answers_answerer_id_fkey FOREIGN KEY (answerer_id) REFERENCES public.users(id),
  CONSTRAINT product_answers_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.product_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid,
  certificate text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_certificates_pkey PRIMARY KEY (id),
  CONSTRAINT product_certificates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.product_images (
  image_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  url text NOT NULL,
  sort_order integer DEFAULT 0,
  seller_id uuid,
  CONSTRAINT product_images_pkey PRIMARY KEY (image_id),
  CONSTRAINT product_images_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id),
  CONSTRAINT product_images_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id)
);
CREATE TABLE public.product_questions (
  question_id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  question_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_questions_pkey PRIMARY KEY (question_id),
  CONSTRAINT product_questions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT product_questions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id)
);
CREATE TABLE public.product_reviews (
  review_id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  order_id uuid,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_title character varying,
  review_text text,
  is_verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  not_helpful_count integer DEFAULT 0,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying]::text[])),
  moderation_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_reviews_pkey PRIMARY KEY (review_id),
  CONSTRAINT product_reviews_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT product_reviews_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.users(id)
);
CREATE TABLE public.product_transparency (
  transparency_id uuid NOT NULL DEFAULT gen_random_uuid(),
  listing_id uuid,
  variant_id uuid,
  clinical_data text,
  ingredient_source text,
  manufacturing_info text,
  testing_info text,
  quality_assurance text,
  third_party_tested boolean DEFAULT false,
  testing_lab character varying,
  test_date date,
  test_report_url character varying,
  test_report_number character varying,
  certifications_summary text,
  sustainability_info text,
  ethical_sourcing text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT product_transparency_pkey PRIMARY KEY (transparency_id),
  CONSTRAINT product_transparency_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT product_transparency_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.listing_variants(variant_id)
);
CREATE TABLE public.product_variants (
  variant_id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  sku character varying UNIQUE,
  price numeric NOT NULL,
  status USER-DEFINED DEFAULT 'active'::product_status,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT product_variants_pkey PRIMARY KEY (variant_id),
  CONSTRAINT product_variants_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(product_id)
);
CREATE TABLE public.product_views (
  view_id uuid NOT NULL DEFAULT gen_random_uuid(),
  global_product_id uuid,
  listing_id uuid,
  user_id uuid,
  session_id character varying,
  viewed_at timestamp without time zone DEFAULT now(),
  ip_address inet,
  user_agent text,
  referrer text,
  CONSTRAINT product_views_pkey PRIMARY KEY (view_id),
  CONSTRAINT product_views_global_product_id_fkey FOREIGN KEY (global_product_id) REFERENCES public.global_products(global_product_id),
  CONSTRAINT product_views_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id),
  CONSTRAINT product_views_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.products (
  product_id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  category_id uuid,
  title character varying NOT NULL,
  description text,
  base_price numeric NOT NULL,
  status USER-DEFINED DEFAULT 'active'::product_status,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  stock_quantity integer DEFAULT 0,
  image_url text,
  CONSTRAINT products_pkey PRIMARY KEY (product_id),
  CONSTRAINT products_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.users(id),
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.return_quality_checks (
  qc_id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL,
  performed_by uuid,
  result text CHECK (result = ANY (ARRAY['passed'::text, 'failed'::text])),
  remarks text,
  checked_at timestamp with time zone DEFAULT now(),
  CONSTRAINT return_quality_checks_pkey PRIMARY KEY (qc_id),
  CONSTRAINT return_quality_checks_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(return_id),
  CONSTRAINT return_quality_checks_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.sellers(id)
);
CREATE TABLE public.return_tracking (
  return_tracking_id uuid NOT NULL DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL,
  status text NOT NULL,
  location text,
  notes text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT return_tracking_pkey PRIMARY KEY (return_tracking_id),
  CONSTRAINT return_tracking_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.order_returns(return_id)
);
CREATE TABLE public.review_images (
  review_image_id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  image_url character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT review_images_pkey PRIMARY KEY (review_image_id),
  CONSTRAINT review_images_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.product_reviews(review_id)
);
CREATE TABLE public.review_votes (
  vote_id uuid NOT NULL DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type = ANY (ARRAY['helpful'::character varying::text, 'not_helpful'::character varying::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT review_votes_pkey PRIMARY KEY (vote_id),
  CONSTRAINT review_votes_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.product_reviews(review_id),
  CONSTRAINT review_votes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.roles (
  role_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role_name character varying NOT NULL UNIQUE,
  CONSTRAINT roles_pkey PRIMARY KEY (role_id)
);
CREATE TABLE public.seller_bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid,
  account_holder_name text,
  account_number text,
  ifsc_code character varying,
  bank_name text,
  account_type text DEFAULT 'savings'::text CHECK (account_type = ANY (ARRAY['savings'::text, 'current'::text])),
  is_primary boolean DEFAULT true,
  verification_status text DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['pending'::text, 'verified'::text, 'failed'::text])),
  razorpay_fund_account_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_bank_accounts_pkey PRIMARY KEY (id),
  CONSTRAINT seller_bank_accounts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid,
  doc_type text CHECK (doc_type = ANY (ARRAY['pan'::text, 'aadhaar'::text, 'selfie'::text, 'cancel_cheque'::text, 'gst_certificate'::text])),
  storage_path text,
  file_name text,
  file_size bigint,
  mime_type text,
  ocr_extracted_data jsonb,
  verification_confidence numeric,
  uploaded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_documents_pkey PRIMARY KEY (id),
  CONSTRAINT seller_documents_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_product_listings (
  listing_id uuid NOT NULL DEFAULT gen_random_uuid(),
  global_product_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  seller_title character varying,
  seller_description text,
  seller_ingredients text,
  health_score integer CHECK (health_score >= 0 AND health_score <= 100),
  base_price numeric NOT NULL,
  discounted_price numeric,
  discount_percentage numeric CHECK (discount_percentage >= 0::numeric AND discount_percentage <= 100::numeric),
  total_stock_quantity integer DEFAULT 0,
  shelf_life_months integer,
  seller_certifications jsonb,
  return_policy text,
  shipping_info text,
  rating numeric DEFAULT 0.0 CHECK (rating >= 0::numeric AND rating <= 5::numeric),
  review_count integer DEFAULT 0,
  status character varying DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'active'::character varying, 'inactive'::character varying, 'suspended'::character varying]::text[])),
  is_verified boolean DEFAULT false,
  verification_notes text,
  slug character varying NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  published_at timestamp with time zone,
  business_name text,
  return_days numeric CHECK (return_days > 0::numeric),
  CONSTRAINT seller_product_listings_pkey PRIMARY KEY (listing_id),
  CONSTRAINT seller_product_listings_global_product_id_fkey FOREIGN KEY (global_product_id) REFERENCES public.global_products(global_product_id),
  CONSTRAINT seller_product_listings_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.seller_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid,
  step text CHECK (step = ANY (ARRAY['pan_check'::text, 'aadhaar_check'::text, 'gstin_check'::text, 'face_match'::text, 'bank_check'::text, 'final_review'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])),
  confidence numeric,
  provider text,
  details jsonb,
  verified_at timestamp with time zone DEFAULT now(),
  CONSTRAINT seller_verifications_pkey PRIMARY KEY (id),
  CONSTRAINT seller_verifications_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id)
);
CREATE TABLE public.sellers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  is_individual boolean NOT NULL DEFAULT true,
  business_name text,
  business_type text CHECK (business_type IS NULL OR (business_type = ANY (ARRAY['proprietorship'::text, 'partnership'::text, 'private_ltd'::text, 'public_ltd'::text, 'llp'::text, 'trust'::text, 'ngo'::text, 'individual'::text, 'other'::text]))),
  pan character varying,
  aadhaar character varying,
  gstin character varying,
  name text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  pincode character varying,
  country text DEFAULT 'India'::text,
  pan_verified boolean DEFAULT false,
  aadhaar_verified boolean DEFAULT false,
  gstin_verified boolean DEFAULT false,
  face_match_score numeric,
  verification_status text CHECK (verification_status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'verified'::text, 'failed'::text])),
  verification_result jsonb,
  razorpay_contact_id text,
  razorpay_fund_account_id text,
  razorpay_account_status text DEFAULT 'not_created'::text,
  account_holder_name text,
  account_number text,
  ifsc_code character varying,
  bank_name text,
  account_verified boolean DEFAULT false,
  account_type text DEFAULT 'savings'::text CHECK (account_type = ANY (ARRAY['savings'::text, 'current'::text])),
  onboarding_step integer DEFAULT 1,
  onboarding_status text DEFAULT 'started'::text CHECK (onboarding_status = ANY (ARRAY['started'::text, 'in_review'::text, 'approved'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sellers_pkey PRIMARY KEY (id),
  CONSTRAINT sellers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_profiles (
  profile_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name character varying,
  date_of_birth date,
  gender character varying,
  country character varying,
  profile_picture_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  height_cm numeric,
  weight_kg numeric,
  bmi numeric,
  activity_level USER-DEFINED,
  diet_preference USER-DEFINED,
  fitness_goal_id uuid,
  preferred_currency character varying DEFAULT 'INR'::character varying,
  profile_completed boolean DEFAULT false,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (profile_id),
  CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_profiles_fitness_goal_id_fkey FOREIGN KEY (fitness_goal_id) REFERENCES public.buyer_goals(goal_id)
);
CREATE TABLE public.user_roles (
  user_id uuid NOT NULL,
  role_id uuid NOT NULL,
  assigned_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  phone character varying,
  password_hash text,
  status USER-DEFINED DEFAULT 'active'::user_status,
  is_verified boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  last_login_at timestamp without time zone,
  last_activity_at timestamp without time zone,
  signup_source character varying,
  user_agent text,
  ip_address inet,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.variant_attribute_values (
  variant_id uuid NOT NULL,
  attribute_id uuid NOT NULL,
  value_text character varying,
  value_number numeric,
  value_bool boolean,
  CONSTRAINT variant_attribute_values_pkey PRIMARY KEY (variant_id, attribute_id),
  CONSTRAINT variant_attribute_values_variant_id_fkey FOREIGN KEY (variant_id) REFERENCES public.product_variants(variant_id),
  CONSTRAINT variant_attribute_values_attribute_id_fkey FOREIGN KEY (attribute_id) REFERENCES public.attributes(attribute_id)
);
CREATE TABLE public.wishlists (
  wishlist_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  global_product_id uuid NOT NULL,
  listing_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT wishlists_pkey PRIMARY KEY (wishlist_id),
  CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT wishlists_global_product_id_fkey FOREIGN KEY (global_product_id) REFERENCES public.global_products(global_product_id),
  CONSTRAINT wishlists_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.seller_product_listings(listing_id)
);