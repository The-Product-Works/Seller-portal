-- Create messages table for admin-seller communication
CREATE TABLE public.messages (
  message_id uuid NOT NULL DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  subject text NULL,
  message_text text NOT NULL,
  message_type text NULL DEFAULT 'direct'::text,
  related_order_id uuid NULL,
  related_listing_id uuid NULL,
  is_read boolean NULL DEFAULT false,
  created_at timestamp without time zone NULL DEFAULT now(),
  updated_at timestamp without time zone NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (message_id),
  CONSTRAINT messages_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id),
  CONSTRAINT messages_related_listing_id_fkey FOREIGN KEY (related_listing_id) REFERENCES seller_product_listings(listing_id),
  CONSTRAINT messages_related_order_id_fkey FOREIGN KEY (related_order_id) REFERENCES orders(order_id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id),
  CONSTRAINT messages_message_type_check CHECK (
    (
      message_type = ANY (
        ARRAY[
          'direct'::text,
          'order_related'::text,
          'product_related'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages USING btree (sender_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON public.messages USING btree (receiver_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages USING btree (created_at) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_related_order ON public.messages USING btree (related_order_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_messages_related_listing ON public.messages USING btree (related_listing_id) TABLESPACE pg_default;

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view messages they sent or received" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can insert messages they send" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update messages they sent or received" ON messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);