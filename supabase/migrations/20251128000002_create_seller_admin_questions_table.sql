-- Create seller_admin_questions table for Q&A functionality
CREATE TABLE public.seller_admin_questions (
  question_id uuid NOT NULL DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  listing_id uuid NULL,
  question_text text NOT NULL,
  admin_response text NULL,
  status text NULL DEFAULT 'pending'::text,
  created_at timestamp without time zone NULL DEFAULT now(),
  answered_at timestamp without time zone NULL,
  answered_by uuid NULL,
  CONSTRAINT seller_admin_questions_pkey PRIMARY KEY (question_id),
  CONSTRAINT seller_admin_questions_answered_by_fkey FOREIGN KEY (answered_by) REFERENCES users(id),
  CONSTRAINT seller_admin_questions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES seller_product_listings(listing_id),
  CONSTRAINT seller_admin_questions_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES sellers(id),
  CONSTRAINT seller_admin_questions_status_check CHECK (
    (
      status = ANY (
        ARRAY['pending'::text, 'answered'::text, 'closed'::text]
      )
    )
  )
) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE seller_admin_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Sellers can view their own questions" ON seller_admin_questions
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM sellers WHERE id = seller_id
  ));

CREATE POLICY "Sellers can insert their own questions" ON seller_admin_questions
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM sellers WHERE id = seller_id
  ));

CREATE POLICY "Admins can view all questions" ON seller_admin_questions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update questions" ON seller_admin_questions
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for answered_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_answered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'answered' AND NEW.status = 'answered' THEN
    NEW.answered_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_answered_at
  BEFORE UPDATE ON seller_admin_questions
  FOR EACH ROW
  EXECUTE FUNCTION update_answered_at();