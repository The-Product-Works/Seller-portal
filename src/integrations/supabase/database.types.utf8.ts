export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_id: string
          city: string
          country: string
          created_at: string | null
          is_active: boolean | null
          is_default: boolean | null
          landmark: string | null
          line1: string
          line2: string | null
          name: string
          phone: string
          postal_code: string
          state: string
          type: Database["public"]["Enums"]["address_type"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          address_id?: string
          city: string
          country?: string
          created_at?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          landmark?: string | null
          line1: string
          line2?: string | null
          name: string
          phone: string
          postal_code: string
          state: string
          type?: Database["public"]["Enums"]["address_type"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          address_id?: string
          city?: string
          country?: string
          created_at?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          landmark?: string | null
          line1?: string
          line2?: string | null
          name?: string
          phone?: string
          postal_code?: string
          state?: string
          type?: Database["public"]["Enums"]["address_type"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      allergens: {
        Row: {
          allergen_id: string
          common_in: string | null
          created_at: string | null
          description: string | null
          name: string
        }
        Insert: {
          allergen_id?: string
          common_in?: string | null
          created_at?: string | null
          description?: string | null
          name: string
        }
        Update: {
          allergen_id?: string
          common_in?: string | null
          created_at?: string | null
          description?: string | null
          name?: string
        }
        Relationships: []
      }
      answer_votes: {
        Row: {
          answer_id: string
          created_at: string | null
          user_id: string
          vote_id: string
          vote_type: string
        }
        Insert: {
          answer_id: string
          created_at?: string | null
          user_id: string
          vote_id?: string
          vote_type: string
        }
        Update: {
          answer_id?: string
          created_at?: string | null
          user_id?: string
          vote_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_votes_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "product_answers"
            referencedColumns: ["answer_id"]
          },
          {
            foreignKeyName: "answer_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          attribute_id: string
          data_type: string | null
          name: string
        }
        Insert: {
          attribute_id?: string
          data_type?: string | null
          name: string
        }
        Update: {
          attribute_id?: string
          data_type?: string | null
          name?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: number
          new_data: Json | null
          old_data: Json | null
          performed_by: string | null
          seller_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          seller_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          performed_by?: string | null
          seller_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string | null
          is_active: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          slug: string
          updated_at: string | null
          website: string | null
        }
        Insert: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      bundle_items: {
        Row: {
          bundle_id: string
          bundle_item_id: string
          listing_id: string
          quantity: number
        }
        Insert: {
          bundle_id: string
          bundle_item_id?: string
          listing_id: string
          quantity: number
        }
        Update: {
          bundle_id?: string
          bundle_item_id?: string
          listing_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "bundles"
            referencedColumns: ["bundle_id"]
          },
          {
            foreignKeyName: "bundle_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      bundles: {
        Row: {
          base_price: number
          bundle_id: string
          bundle_name: string
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          discounted_price: number | null
          published_at: string | null
          seller_id: string
          slug: string | null
          status: string | null
          thumbnail_url: string | null
          total_items: number | null
          total_stock_quantity: number | null
          updated_at: string | null
        }
        Insert: {
          base_price: number
          bundle_id?: string
          bundle_name: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          published_at?: string | null
          seller_id: string
          slug?: string | null
          status?: string | null
          thumbnail_url?: string | null
          total_items?: number | null
          total_stock_quantity?: number | null
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          bundle_id?: string
          bundle_name?: string
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          published_at?: string | null
          seller_id?: string
          slug?: string | null
          status?: string | null
          thumbnail_url?: string | null
          total_items?: number | null
          total_stock_quantity?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bundles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "bundles_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      buyer_activity: {
        Row: {
          activity_id: string
          browser: string | null
          created_at: string | null
          device: Database["public"]["Enums"]["device_type"] | null
          event_metadata: Json | null
          event_type: string
          ip_address: unknown
          os: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_id?: string
          browser?: string | null
          created_at?: string | null
          device?: Database["public"]["Enums"]["device_type"] | null
          event_metadata?: Json | null
          event_type: string
          ip_address?: unknown
          os?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_id?: string
          browser?: string | null
          created_at?: string | null
          device?: Database["public"]["Enums"]["device_type"] | null
          event_metadata?: Json | null
          event_type?: string
          ip_address?: unknown
          os?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_allergies: {
        Row: {
          allergen_id: string
          buyer_allergy_id: string
          created_at: string | null
          notes: string | null
          severity: Database["public"]["Enums"]["severity"] | null
          user_id: string
        }
        Insert: {
          allergen_id: string
          buyer_allergy_id?: string
          created_at?: string | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["severity"] | null
          user_id: string
        }
        Update: {
          allergen_id?: string
          buyer_allergy_id?: string
          created_at?: string | null
          notes?: string | null
          severity?: Database["public"]["Enums"]["severity"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_allergies_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["allergen_id"]
          },
          {
            foreignKeyName: "buyer_allergies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_goals: {
        Row: {
          created_at: string | null
          goal_description: string | null
          goal_id: string
          goal_name: string
          icon: string | null
          is_active: boolean | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          goal_description?: string | null
          goal_id?: string
          goal_name: string
          icon?: string | null
          is_active?: boolean | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          goal_description?: string | null
          goal_id?: string
          goal_name?: string
          icon?: string | null
          is_active?: boolean | null
          sort_order?: number | null
        }
        Relationships: []
      }
      buyer_searches: {
        Row: {
          created_at: string
          filters: Json | null
          ip_address: unknown
          query_text: string
          results_count: number | null
          search_id: string
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          ip_address?: unknown
          query_text: string
          results_count?: number | null
          search_id?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          ip_address?: unknown
          query_text?: string
          results_count?: number | null
          search_id?: string
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_discounts: {
        Row: {
          applied_at: string | null
          code: string | null
          discount_id: string
          discount_type: string | null
          discount_value: number | null
        }
        Insert: {
          applied_at?: string | null
          code?: string | null
          discount_id?: string
          discount_type?: string | null
          discount_value?: number | null
        }
        Update: {
          applied_at?: string | null
          code?: string | null
          discount_id?: string
          discount_type?: string | null
          discount_value?: number | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string | null
          cart_id: string
          cart_item_id: string
          listing_id: string
          price_per_unit: number
          quantity: number
          seller_id: string
          subtotal: number | null
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          added_at?: string | null
          cart_id: string
          cart_item_id?: string
          listing_id: string
          price_per_unit: number
          quantity: number
          seller_id: string
          subtotal?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          added_at?: string | null
          cart_id?: string
          cart_item_id?: string
          listing_id?: string
          price_per_unit?: number
          quantity?: number
          seller_id?: string
          subtotal?: number | null
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["cart_id"]
          },
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "cart_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      carts: {
        Row: {
          buyer_id: string
          cart_id: string
          created_at: string | null
          status: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          cart_id?: string
          created_at?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          cart_id?: string
          created_at?: string | null
          status?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "carts_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          name: string
          parent_id: string | null
          slug: string | null
        }
        Insert: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          name: string
          parent_id?: string | null
          slug?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          name?: string
          parent_id?: string | null
          slug?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      category_attributes: {
        Row: {
          attribute_id: string
          category_id: string
        }
        Insert: {
          attribute_id: string
          category_id: string
        }
        Update: {
          attribute_id?: string
          category_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_attributes_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["attribute_id"]
          },
          {
            foreignKeyName: "category_attributes_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          created_at: string
          description: string
          dispute_id: string
          evidence_urls: string[] | null
          global_product_id: string | null
          is_archived: boolean
          listing_id: string | null
          related_order_id: string | null
          related_order_item_id: string | null
          reporter_id: string
          reporter_role: string
          severity: string
          status: string
          subject: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          description: string
          dispute_id?: string
          evidence_urls?: string[] | null
          global_product_id?: string | null
          is_archived?: boolean
          listing_id?: string | null
          related_order_id?: string | null
          related_order_item_id?: string | null
          reporter_id: string
          reporter_role: string
          severity?: string
          status?: string
          subject: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string
          dispute_id?: string
          evidence_urls?: string[] | null
          global_product_id?: string | null
          is_archived?: boolean
          listing_id?: string | null
          related_order_id?: string | null
          related_order_item_id?: string | null
          reporter_id?: string
          reporter_role?: string
          severity?: string
          status?: string
          subject?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          alert_type: string
          created_at: string
          metadata: Json | null
          notification_id: string
          notification_type: string
          recipient_email: string
          recipient_id: string | null
          recipient_type: string
          related_entity_id: string | null
          related_order_id: string | null
          related_product_id: string | null
          related_seller_id: string | null
          sent_at: string
          status: string
          subject: string
          tracking_id: string | null
          transaction_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string
          metadata?: Json | null
          notification_id?: string
          notification_type?: string
          recipient_email: string
          recipient_id?: string | null
          recipient_type: string
          related_entity_id?: string | null
          related_order_id?: string | null
          related_product_id?: string | null
          related_seller_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          tracking_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string
          metadata?: Json | null
          notification_id?: string
          notification_type?: string
          recipient_email?: string
          recipient_id?: string | null
          recipient_type?: string
          related_entity_id?: string | null
          related_order_id?: string | null
          related_product_id?: string | null
          related_seller_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          tracking_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
        ]
      }
      global_products: {
        Row: {
          avg_health_score: number | null
          avg_rating_across_sellers: number | null
          brand_id: string | null
          category_id: string | null
          created_at: string | null
          global_product_id: string
          highest_price: number | null
          is_active: boolean | null
          lowest_price: number | null
          product_name: string
          slug: string
          total_listings_count: number | null
          total_reviews_across_sellers: number | null
          updated_at: string | null
        }
        Insert: {
          avg_health_score?: number | null
          avg_rating_across_sellers?: number | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          global_product_id?: string
          highest_price?: number | null
          is_active?: boolean | null
          lowest_price?: number | null
          product_name: string
          slug: string
          total_listings_count?: number | null
          total_reviews_across_sellers?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_health_score?: number | null
          avg_rating_across_sellers?: number | null
          brand_id?: string | null
          category_id?: string | null
          created_at?: string | null
          global_product_id?: string
          highest_price?: number | null
          is_active?: boolean | null
          lowest_price?: number | null
          product_name?: string
          slug?: string
          total_listings_count?: number | null
          total_reviews_across_sellers?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["brand_id"]
          },
          {
            foreignKeyName: "global_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
        ]
      }
      homepage_featured_products: {
        Row: {
          active: boolean
          created_at: string | null
          display_order: number
          id: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_featured_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "global_products"
            referencedColumns: ["global_product_id"]
          },
        ]
      }
      homepage_rolling_products: {
        Row: {
          active: boolean
          created_at: string | null
          display_order: number
          id: string
          product_id: string
          rotation_speed: number | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          product_id: string
          rotation_speed?: number | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string | null
          display_order?: number
          id?: string
          product_id?: string
          rotation_speed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homepage_rolling_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "global_products"
            referencedColumns: ["global_product_id"]
          },
        ]
      }
      inventory: {
        Row: {
          inventory_id: string
          quantity: number | null
          reserved: number | null
          updated_at: string | null
          variant_id: string
        }
        Insert: {
          inventory_id?: string
          quantity?: number | null
          reserved?: number | null
          updated_at?: string | null
          variant_id: string
        }
        Update: {
          inventory_id?: string
          quantity?: number | null
          reserved?: number | null
          updated_at?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: true
            referencedRelation: "product_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      listing_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          image_id: string
          image_url: string
          is_primary: boolean | null
          listing_id: string
          sort_order: number | null
          variant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          image_id?: string
          image_url: string
          is_primary?: boolean | null
          listing_id: string
          sort_order?: number | null
          variant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          image_id?: string
          image_url?: string
          is_primary?: boolean | null
          listing_id?: string
          sort_order?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "listing_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      listing_variants: {
        Row: {
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          flavor: string | null
          health_score: number | null
          image_url: string | null
          is_available: boolean | null
          listing_id: string
          manufacture_date: string | null
          nutritional_info: Json | null
          original_price: number | null
          price: number
          reserved_quantity: number | null
          serving_count: number | null
          size: string | null
          sku: string
          stock_quantity: number | null
          updated_at: string | null
          variant_id: string
          variant_name: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          flavor?: string | null
          health_score?: number | null
          image_url?: string | null
          is_available?: boolean | null
          listing_id: string
          manufacture_date?: string | null
          nutritional_info?: Json | null
          original_price?: number | null
          price: number
          reserved_quantity?: number | null
          serving_count?: number | null
          size?: string | null
          sku: string
          stock_quantity?: number | null
          updated_at?: string | null
          variant_id?: string
          variant_name?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          flavor?: string | null
          health_score?: number | null
          image_url?: string | null
          is_available?: boolean | null
          listing_id?: string
          manufacture_date?: string | null
          nutritional_info?: Json | null
          original_price?: number | null
          price?: number
          reserved_quantity?: number | null
          serving_count?: number | null
          size?: string | null
          sku?: string
          stock_quantity?: number | null
          updated_at?: string | null
          variant_id?: string
          variant_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_variants_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          receiver_id: string | null
          related_bundle_id: string | null
          related_seller_id: string | null
          sender_id: string | null
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          receiver_id?: string | null
          related_bundle_id?: string | null
          related_seller_id?: string | null
          sender_id?: string | null
          title?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          receiver_id?: string | null
          related_bundle_id?: string | null
          related_seller_id?: string | null
          sender_id?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_seller_id_fkey"
            columns: ["related_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_seller_id_fkey"
            columns: ["related_seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "notifications_related_seller_id_fkey"
            columns: ["related_seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_cancellations: {
        Row: {
          cancellation_id: string
          cancelled_at: string | null
          cancelled_by: string
          cancelled_by_role: string
          order_item_id: string
          reason: string | null
          refund_status: string | null
        }
        Insert: {
          cancellation_id?: string
          cancelled_at?: string | null
          cancelled_by: string
          cancelled_by_role: string
          order_item_id: string
          reason?: string | null
          refund_status?: string | null
        }
        Update: {
          cancellation_id?: string
          cancelled_at?: string | null
          cancelled_by?: string
          cancelled_by_role?: string
          order_item_id?: string
          reason?: string | null
          refund_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_cancellations_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_cancellations_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          listing_id: string
          order_id: string
          order_item_id: string
          price_per_unit: number
          quantity: number
          seller_id: string
          status: string | null
          subtotal: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          listing_id: string
          order_id: string
          order_item_id?: string
          price_per_unit: number
          quantity: number
          seller_id: string
          status?: string | null
          subtotal?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          listing_id?: string
          order_id?: string
          order_item_id?: string
          price_per_unit?: number
          quantity?: number
          seller_id?: string
          status?: string | null
          subtotal?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      order_refunds: {
        Row: {
          amount: number
          method: string | null
          order_item_id: string
          payment_id: string | null
          processed_at: string | null
          processed_by: string | null
          razorpay_refund_id: string | null
          refund_id: string
          return_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          method?: string | null
          order_item_id: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_refund_id?: string | null
          refund_id?: string
          return_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          method?: string | null
          order_item_id?: string
          payment_id?: string | null
          processed_at?: string | null
          processed_by?: string | null
          razorpay_refund_id?: string | null
          refund_id?: string
          return_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_refunds_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "order_refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "order_returns"
            referencedColumns: ["return_id"]
          },
        ]
      }
      order_returns: {
        Row: {
          buyer_id: string
          initiated_at: string | null
          notes: string | null
          order_item_id: string | null
          reason: string
          return_id: string
          return_type: string | null
          seller_id: string
          status: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          buyer_id: string
          initiated_at?: string | null
          notes?: string | null
          order_item_id?: string | null
          reason: string
          return_id?: string
          return_type?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          buyer_id?: string
          initiated_at?: string | null
          notes?: string | null
          order_item_id?: string | null
          reason?: string
          return_id?: string
          return_type?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_returns_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_order_item_fk"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_returns_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_returns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_returns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "order_returns_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_status: string | null
          old_status: string | null
          order_item_id: string
          remarks: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_item_id: string
          remarks?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_status?: string | null
          old_status?: string | null
          order_item_id?: string
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      order_tracking: {
        Row: {
          location: string | null
          notes: string | null
          order_item_id: string
          status: string
          tracking_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          location?: string | null
          notes?: string | null
          order_item_id: string
          status: string
          tracking_id?: string
          updated_at?: string | null
          url: string
        }
        Update: {
          location?: string | null
          notes?: string | null
          order_item_id?: string
          status?: string
          tracking_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_tracking_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          buyer_id: string
          cart_id: string | null
          created_at: string | null
          discount_amount: number | null
          final_amount: number | null
          order_id: string
          payment_id: string
          payment_status: string | null
          shipping_cost: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          address_id?: string | null
          buyer_id: string
          cart_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          order_id?: string
          payment_id: string
          payment_status?: string | null
          shipping_cost?: number | null
          total_amount: number
          updated_at?: string | null
        }
        Update: {
          address_id?: string | null
          buyer_id?: string
          cart_id?: string | null
          created_at?: string | null
          discount_amount?: number | null
          final_amount?: number | null
          order_id?: string
          payment_id?: string
          payment_status?: string | null
          shipping_cost?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["address_id"]
          },
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["cart_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          bank_rrn: string | null
          buyer_id: string
          created_at: string | null
          customer_details: Json | null
          invoice_id: string | null
          method: string | null
          order_id: string
          paid_at: string | null
          payer_account_type: string | null
          payment_gateway: string | null
          payment_id: string
          razorpay_fee: number | null
          razorpay_order_id: string | null
          razorpay_payment_id: string
          razorpay_tax: number | null
          seller_id: string
          status: string | null
          transaction_ref: string | null
        }
        Insert: {
          amount: number
          bank_rrn?: string | null
          buyer_id: string
          created_at?: string | null
          customer_details?: Json | null
          invoice_id?: string | null
          method?: string | null
          order_id: string
          paid_at?: string | null
          payer_account_type?: string | null
          payment_gateway?: string | null
          payment_id?: string
          razorpay_fee?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id: string
          razorpay_tax?: number | null
          seller_id: string
          status?: string | null
          transaction_ref?: string | null
        }
        Update: {
          amount?: number
          bank_rrn?: string | null
          buyer_id?: string
          created_at?: string | null
          customer_details?: Json | null
          invoice_id?: string | null
          method?: string | null
          order_id?: string
          paid_at?: string | null
          payer_account_type?: string | null
          payment_gateway?: string | null
          payment_id?: string
          razorpay_fee?: number | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string
          razorpay_tax?: number | null
          seller_id?: string
          status?: string | null
          transaction_ref?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "payments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      payout_approval_logs: {
        Row: {
          action: string
          created_at: string | null
          log_id: string
          new_status: string | null
          notes: string | null
          payment_method: string | null
          payment_reference: string | null
          payout_id: string
          performed_at: string | null
          performed_by: string
          previous_status: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          log_id?: string
          new_status?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_id: string
          performed_at?: string | null
          performed_by: string
          previous_status?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          log_id?: string
          new_status?: string | null
          notes?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payout_id?: string
          performed_at?: string | null
          performed_by?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payout_approval_logs_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "seller_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "payout_approval_logs_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "payout_approval_logs_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_allergens: {
        Row: {
          allergen_id: string | null
          created_at: string | null
          id: string
          listing_id: string | null
        }
        Insert: {
          allergen_id?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
        }
        Update: {
          allergen_id?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_allergens_allergen_id_fkey"
            columns: ["allergen_id"]
            isOneToOne: false
            referencedRelation: "allergens"
            referencedColumns: ["allergen_id"]
          },
          {
            foreignKeyName: "product_allergens_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      product_answers: {
        Row: {
          answer_id: string
          answer_text: string
          answerer_id: string | null
          created_at: string | null
          helpful_count: number | null
          is_active: boolean | null
          is_verified_seller: boolean | null
          not_helpful_count: number | null
          question_id: string
          seller_id: string | null
        }
        Insert: {
          answer_id?: string
          answer_text: string
          answerer_id?: string | null
          created_at?: string | null
          helpful_count?: number | null
          is_active?: boolean | null
          is_verified_seller?: boolean | null
          not_helpful_count?: number | null
          question_id: string
          seller_id?: string | null
        }
        Update: {
          answer_id?: string
          answer_text?: string
          answerer_id?: string | null
          created_at?: string | null
          helpful_count?: number | null
          is_active?: boolean | null
          is_verified_seller?: boolean | null
          not_helpful_count?: number | null
          question_id?: string
          seller_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "product_questions"
            referencedColumns: ["question_id"]
          },
          {
            foreignKeyName: "product_answers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_answers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "product_answers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      product_certificates: {
        Row: {
          certificate: string
          created_at: string | null
          id: string
          product_id: string | null
        }
        Insert: {
          certificate: string
          created_at?: string | null
          id?: string
          product_id?: string | null
        }
        Update: {
          certificate?: string
          created_at?: string | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_certificates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_images: {
        Row: {
          image_id: string
          product_id: string
          seller_id: string | null
          sort_order: number | null
          url: string
        }
        Insert: {
          image_id?: string
          product_id: string
          seller_id?: string | null
          sort_order?: number | null
          url: string
        }
        Update: {
          image_id?: string
          product_id?: string
          seller_id?: string | null
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_questions: {
        Row: {
          buyer_id: string
          created_at: string | null
          is_active: boolean | null
          listing_id: string
          question_id: string
          question_text: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          is_active?: boolean | null
          listing_id: string
          question_id?: string
          question_text: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          is_active?: boolean | null
          listing_id?: string
          question_id?: string
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          buyer_id: string
          created_at: string | null
          helpful_count: number | null
          is_verified_purchase: boolean | null
          listing_id: string
          moderation_notes: string | null
          not_helpful_count: number | null
          order_id: string | null
          rating: number
          review_id: string
          review_text: string | null
          review_title: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          helpful_count?: number | null
          is_verified_purchase?: boolean | null
          listing_id: string
          moderation_notes?: string | null
          not_helpful_count?: number | null
          order_id?: string | null
          rating: number
          review_id?: string
          review_text?: string | null
          review_title?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          helpful_count?: number | null
          is_verified_purchase?: boolean | null
          listing_id?: string
          moderation_notes?: string | null
          not_helpful_count?: number | null
          order_id?: string | null
          rating?: number
          review_id?: string
          review_text?: string | null
          review_title?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
        ]
      }
      product_transparency: {
        Row: {
          certifications_summary: string | null
          clinical_data: string | null
          created_at: string | null
          ethical_sourcing: string | null
          ingredient_source: string | null
          listing_id: string | null
          manufacturing_info: string | null
          quality_assurance: string | null
          sustainability_info: string | null
          test_date: string | null
          test_report_number: string | null
          test_report_url: string | null
          testing_info: string | null
          testing_lab: string | null
          third_party_tested: boolean | null
          transparency_id: string
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          certifications_summary?: string | null
          clinical_data?: string | null
          created_at?: string | null
          ethical_sourcing?: string | null
          ingredient_source?: string | null
          listing_id?: string | null
          manufacturing_info?: string | null
          quality_assurance?: string | null
          sustainability_info?: string | null
          test_date?: string | null
          test_report_number?: string | null
          test_report_url?: string | null
          testing_info?: string | null
          testing_lab?: string | null
          third_party_tested?: boolean | null
          transparency_id?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          certifications_summary?: string | null
          clinical_data?: string | null
          created_at?: string | null
          ethical_sourcing?: string | null
          ingredient_source?: string | null
          listing_id?: string | null
          manufacturing_info?: string | null
          quality_assurance?: string | null
          sustainability_info?: string | null
          test_date?: string | null
          test_report_number?: string | null
          test_report_url?: string | null
          testing_info?: string | null
          testing_lab?: string | null
          third_party_tested?: boolean | null
          transparency_id?: string
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_transparency_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "product_transparency_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "listing_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string | null
          price: number
          product_id: string
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          price: number
          product_id: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          variant_id?: string
        }
        Update: {
          created_at?: string | null
          price?: number
          product_id?: string
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["product_id"]
          },
        ]
      }
      product_views: {
        Row: {
          global_product_id: string | null
          ip_address: unknown
          listing_id: string | null
          metadata: Json | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          view_id: string
          viewed_at: string | null
        }
        Insert: {
          global_product_id?: string | null
          ip_address?: unknown
          listing_id?: string | null
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          view_id?: string
          viewed_at?: string | null
        }
        Update: {
          global_product_id?: string | null
          ip_address?: unknown
          listing_id?: string | null
          metadata?: Json | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          view_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_global_product_id_fkey"
            columns: ["global_product_id"]
            isOneToOne: false
            referencedRelation: "global_products"
            referencedColumns: ["global_product_id"]
          },
          {
            foreignKeyName: "product_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "product_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string | null
          description: string | null
          image_url: string | null
          product_id: string
          seller_id: string
          status: Database["public"]["Enums"]["product_status"] | null
          stock_quantity: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          product_id?: string
          seller_id: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_quantity?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          image_url?: string | null
          product_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["product_status"] | null
          stock_quantity?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      return_quality_checks: {
        Row: {
          checked_at: string | null
          performed_by: string | null
          qc_id: string
          remarks: string | null
          result: string | null
          return_id: string
        }
        Insert: {
          checked_at?: string | null
          performed_by?: string | null
          qc_id?: string
          remarks?: string | null
          result?: string | null
          return_id: string
        }
        Update: {
          checked_at?: string | null
          performed_by?: string | null
          qc_id?: string
          remarks?: string | null
          result?: string | null
          return_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_quality_checks_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_quality_checks_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "return_quality_checks_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "return_quality_checks_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "order_returns"
            referencedColumns: ["return_id"]
          },
        ]
      }
      return_tracking: {
        Row: {
          location: string | null
          notes: string | null
          return_id: string
          return_tracking_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          location?: string | null
          notes?: string | null
          return_id: string
          return_tracking_id?: string
          status: string
          updated_at?: string | null
        }
        Update: {
          location?: string | null
          notes?: string | null
          return_id?: string
          return_tracking_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_tracking_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "order_returns"
            referencedColumns: ["return_id"]
          },
        ]
      }
      review_images: {
        Row: {
          created_at: string | null
          image_url: string
          review_id: string
          review_image_id: string
        }
        Insert: {
          created_at?: string | null
          image_url: string
          review_id: string
          review_image_id?: string
        }
        Update: {
          created_at?: string | null
          image_url?: string
          review_id?: string
          review_image_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_images_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["review_id"]
          },
        ]
      }
      review_votes: {
        Row: {
          created_at: string | null
          review_id: string
          user_id: string
          vote_id: string
          vote_type: string
        }
        Insert: {
          created_at?: string | null
          review_id: string
          user_id: string
          vote_id?: string
          vote_type: string
        }
        Update: {
          created_at?: string | null
          review_id?: string
          user_id?: string
          vote_id?: string
          vote_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "product_reviews"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "review_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          role_id: string
          role_name: string
        }
        Insert: {
          role_id?: string
          role_name: string
        }
        Update: {
          role_id?: string
          role_name?: string
        }
        Relationships: []
      }
      seller_balance_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string | null
          description: string | null
          metadata: Json | null
          related_order_id: string | null
          related_order_item_id: string | null
          related_payout_id: string | null
          related_refund_id: string | null
          seller_id: string
          transaction_id: string
          type: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string | null
          description?: string | null
          metadata?: Json | null
          related_order_id?: string | null
          related_order_item_id?: string | null
          related_payout_id?: string | null
          related_refund_id?: string | null
          seller_id: string
          transaction_id?: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string | null
          description?: string | null
          metadata?: Json | null
          related_order_id?: string | null
          related_order_item_id?: string | null
          related_payout_id?: string | null
          related_refund_id?: string | null
          seller_id?: string
          transaction_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_balance_transactions_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_related_order_item_id_fkey"
            columns: ["related_order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_related_payout_id_fkey"
            columns: ["related_payout_id"]
            isOneToOne: false
            referencedRelation: "seller_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_related_payout_id_fkey"
            columns: ["related_payout_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_related_refund_id_fkey"
            columns: ["related_refund_id"]
            isOneToOne: false
            referencedRelation: "order_refunds"
            referencedColumns: ["refund_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_related_refund_id_fkey"
            columns: ["related_refund_id"]
            isOneToOne: false
            referencedRelation: "seller_refund_details"
            referencedColumns: ["refund_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_balance_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_balances: {
        Row: {
          available_balance: number
          balance_id: string
          last_payout_amount: number | null
          last_payout_date: string | null
          pending_balance: number
          seller_id: string
          total_earned: number
          total_paid_out: number
          total_refunded: number
          updated_at: string | null
        }
        Insert: {
          available_balance?: number
          balance_id?: string
          last_payout_amount?: number | null
          last_payout_date?: string | null
          pending_balance?: number
          seller_id: string
          total_earned?: number
          total_paid_out?: number
          total_refunded?: number
          updated_at?: string | null
        }
        Update: {
          available_balance?: number
          balance_id?: string
          last_payout_amount?: number | null
          last_payout_date?: string | null
          pending_balance?: number
          seller_id?: string
          total_earned?: number
          total_paid_out?: number
          total_refunded?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_balances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_bank_accounts: {
        Row: {
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          bank_name: string | null
          created_at: string | null
          id: string
          ifsc_code: string | null
          is_primary: boolean | null
          razorpay_fund_account_id: string | null
          seller_id: string | null
          verification_status: string | null
        }
        Insert: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          is_primary?: boolean | null
          razorpay_fund_account_id?: string | null
          seller_id?: string | null
          verification_status?: string | null
        }
        Update: {
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string
          ifsc_code?: string | null
          is_primary?: boolean | null
          razorpay_fund_account_id?: string | null
          seller_id?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_bank_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_bank_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_bank_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_documents: {
        Row: {
          doc_type: string | null
          file_name: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          ocr_extracted_data: Json | null
          seller_id: string | null
          storage_path: string | null
          uploaded_at: string | null
          verification_confidence: number | null
        }
        Insert: {
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          ocr_extracted_data?: Json | null
          seller_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          verification_confidence?: number | null
        }
        Update: {
          doc_type?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          ocr_extracted_data?: Json | null
          seller_id?: string | null
          storage_path?: string | null
          uploaded_at?: string | null
          verification_confidence?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_documents_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_payout_items: {
        Row: {
          allocated_razorpay_fee: number
          allocated_razorpay_tax: number
          created_at: string | null
          is_refunded: boolean | null
          is_settled: boolean | null
          item_subtotal: number
          order_date: string
          order_id: string
          order_item_id: string
          payment_id: string | null
          payout_id: string | null
          payout_item_id: string
          refund_amount: number | null
          refund_id: string | null
          settlement_hold_until: string
        }
        Insert: {
          allocated_razorpay_fee?: number
          allocated_razorpay_tax?: number
          created_at?: string | null
          is_refunded?: boolean | null
          is_settled?: boolean | null
          item_subtotal: number
          order_date: string
          order_id: string
          order_item_id: string
          payment_id?: string | null
          payout_id?: string | null
          payout_item_id?: string
          refund_amount?: number | null
          refund_id?: string | null
          settlement_hold_until: string
        }
        Update: {
          allocated_razorpay_fee?: number
          allocated_razorpay_tax?: number
          created_at?: string | null
          is_refunded?: boolean | null
          is_settled?: boolean | null
          item_subtotal?: number
          order_date?: string
          order_id?: string
          order_item_id?: string
          payment_id?: string | null
          payout_id?: string | null
          payout_item_id?: string
          refund_amount?: number | null
          refund_id?: string | null
          settlement_hold_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_payout_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "seller_payout_items_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "seller_payout_items_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "seller_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "seller_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "seller_payout_items_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["payout_id"]
          },
          {
            foreignKeyName: "seller_payout_items_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "order_refunds"
            referencedColumns: ["refund_id"]
          },
          {
            foreignKeyName: "seller_payout_items_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "seller_refund_details"
            referencedColumns: ["refund_id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          balance_adjustment: number | null
          balance_notes: string | null
          created_at: string | null
          gross_sales: number
          net_amount: number
          paid_at: string | null
          paid_by: string | null
          payment_method: string | null
          payment_notes: string | null
          payment_reference: string | null
          payout_date: string
          payout_id: string
          payout_month: number
          payout_year: number
          previous_balance: number
          razorpay_fees: number
          refund_deductions: number
          rejection_reason: string | null
          seller_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_adjustment?: number | null
          balance_notes?: string | null
          created_at?: string | null
          gross_sales?: number
          net_amount?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payout_date: string
          payout_id?: string
          payout_month: number
          payout_year: number
          previous_balance?: number
          razorpay_fees?: number
          refund_deductions?: number
          rejection_reason?: string | null
          seller_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          balance_adjustment?: number | null
          balance_notes?: string | null
          created_at?: string | null
          gross_sales?: number
          net_amount?: number
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: string | null
          payment_notes?: string | null
          payment_reference?: string | null
          payout_date?: string
          payout_id?: string
          payout_month?: number
          payout_year?: number
          previous_balance?: number
          razorpay_fees?: number
          refund_deductions?: number
          rejection_reason?: string | null
          seller_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_product_listings: {
        Row: {
          base_price: number
          business_name: string | null
          created_at: string | null
          discount_percentage: number | null
          discounted_price: number | null
          global_product_id: string
          health_score: number | null
          is_verified: boolean | null
          listing_id: string
          published_at: string | null
          rating: number | null
          return_days: number | null
          return_policy: string | null
          review_count: number | null
          seller_certifications: Json | null
          seller_description: string | null
          seller_id: string
          seller_ingredients: string | null
          seller_title: string | null
          shelf_life_months: number | null
          shipping_info: string | null
          slug: string
          status: string | null
          total_stock_quantity: number | null
          updated_at: string | null
          verification_notes: string | null
        }
        Insert: {
          base_price: number
          business_name?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          global_product_id: string
          health_score?: number | null
          is_verified?: boolean | null
          listing_id?: string
          published_at?: string | null
          rating?: number | null
          return_days?: number | null
          return_policy?: string | null
          review_count?: number | null
          seller_certifications?: Json | null
          seller_description?: string | null
          seller_id: string
          seller_ingredients?: string | null
          seller_title?: string | null
          shelf_life_months?: number | null
          shipping_info?: string | null
          slug: string
          status?: string | null
          total_stock_quantity?: number | null
          updated_at?: string | null
          verification_notes?: string | null
        }
        Update: {
          base_price?: number
          business_name?: string | null
          created_at?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          global_product_id?: string
          health_score?: number | null
          is_verified?: boolean | null
          listing_id?: string
          published_at?: string | null
          rating?: number | null
          return_days?: number | null
          return_policy?: string | null
          review_count?: number | null
          seller_certifications?: Json | null
          seller_description?: string | null
          seller_id?: string
          seller_ingredients?: string | null
          seller_title?: string | null
          shelf_life_months?: number | null
          shipping_info?: string | null
          slug?: string
          status?: string | null
          total_stock_quantity?: number | null
          updated_at?: string | null
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_product_listings_global_product_id_fkey"
            columns: ["global_product_id"]
            isOneToOne: false
            referencedRelation: "global_products"
            referencedColumns: ["global_product_id"]
          },
          {
            foreignKeyName: "seller_product_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_product_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_product_listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      seller_verifications: {
        Row: {
          confidence: number | null
          details: Json | null
          id: string
          provider: string | null
          seller_id: string | null
          status: string | null
          step: string | null
          verified_at: string | null
        }
        Insert: {
          confidence?: number | null
          details?: Json | null
          id?: string
          provider?: string | null
          seller_id?: string | null
          status?: string | null
          step?: string | null
          verified_at?: string | null
        }
        Update: {
          confidence?: number | null
          details?: Json | null
          id?: string
          provider?: string | null
          seller_id?: string | null
          status?: string | null
          step?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "seller_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
        ]
      }
      sellers: {
        Row: {
          aadhaar: string | null
          aadhaar_verified: boolean | null
          account_holder_name: string | null
          account_number: string | null
          account_type: string | null
          account_verified: boolean | null
          address_line1: string | null
          address_line2: string | null
          bank_name: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string | null
          face_match_score: number | null
          gstin: string | null
          gstin_verified: boolean | null
          id: string
          ifsc_code: string | null
          is_individual: boolean
          name: string | null
          onboarding_status: string | null
          onboarding_step: number | null
          pan: string | null
          pan_verified: boolean | null
          phone: string | null
          pincode: string | null
          razorpay_account_status: string | null
          razorpay_contact_id: string | null
          razorpay_fund_account_id: string | null
          state: string | null
          updated_at: string | null
          user_id: string | null
          verification_result: Json | null
          verification_status: string | null
        }
        Insert: {
          aadhaar?: string | null
          aadhaar_verified?: boolean | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          account_verified?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          bank_name?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          face_match_score?: number | null
          gstin?: string | null
          gstin_verified?: boolean | null
          id?: string
          ifsc_code?: string | null
          is_individual?: boolean
          name?: string | null
          onboarding_status?: string | null
          onboarding_step?: number | null
          pan?: string | null
          pan_verified?: boolean | null
          phone?: string | null
          pincode?: string | null
          razorpay_account_status?: string | null
          razorpay_contact_id?: string | null
          razorpay_fund_account_id?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_result?: Json | null
          verification_status?: string | null
        }
        Update: {
          aadhaar?: string | null
          aadhaar_verified?: boolean | null
          account_holder_name?: string | null
          account_number?: string | null
          account_type?: string | null
          account_verified?: boolean | null
          address_line1?: string | null
          address_line2?: string | null
          bank_name?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          face_match_score?: number | null
          gstin?: string | null
          gstin_verified?: boolean | null
          id?: string
          ifsc_code?: string | null
          is_individual?: boolean
          name?: string | null
          onboarding_status?: string | null
          onboarding_step?: number | null
          pan?: string | null
          pan_verified?: boolean | null
          phone?: string | null
          pincode?: string | null
          razorpay_account_status?: string | null
          razorpay_contact_id?: string | null
          razorpay_fund_account_id?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_result?: Json | null
          verification_status?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          activity_level: Database["public"]["Enums"]["activity_level"] | null
          bmi: number | null
          country: string | null
          created_at: string | null
          date_of_birth: string | null
          diet_preference: Database["public"]["Enums"]["diet_preference"] | null
          fitness_goal_id: string | null
          full_name: string | null
          gender: string | null
          height_cm: number | null
          preferred_currency: string | null
          profile_completed: boolean | null
          profile_id: string
          profile_picture_url: string | null
          updated_at: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          bmi?: number | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          diet_preference?:
            | Database["public"]["Enums"]["diet_preference"]
            | null
          fitness_goal_id?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          preferred_currency?: string | null
          profile_completed?: boolean | null
          profile_id?: string
          profile_picture_url?: string | null
          updated_at?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          activity_level?: Database["public"]["Enums"]["activity_level"] | null
          bmi?: number | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          diet_preference?:
            | Database["public"]["Enums"]["diet_preference"]
            | null
          fitness_goal_id?: string | null
          full_name?: string | null
          gender?: string | null
          height_cm?: number | null
          preferred_currency?: string | null
          profile_completed?: boolean | null
          profile_id?: string
          profile_picture_url?: string | null
          updated_at?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_fitness_goal_id_fkey"
            columns: ["fitness_goal_id"]
            isOneToOne: false
            referencedRelation: "buyer_goals"
            referencedColumns: ["goal_id"]
          },
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["role_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip_address: unknown
          is_verified: boolean | null
          last_activity_at: string | null
          last_login_at: string | null
          password_hash: string | null
          phone: string | null
          signup_source: string | null
          status: Database["public"]["Enums"]["user_status"] | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip_address?: unknown
          is_verified?: boolean | null
          last_activity_at?: string | null
          last_login_at?: string | null
          password_hash?: string | null
          phone?: string | null
          signup_source?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip_address?: unknown
          is_verified?: boolean | null
          last_activity_at?: string | null
          last_login_at?: string | null
          password_hash?: string | null
          phone?: string | null
          signup_source?: string | null
          status?: Database["public"]["Enums"]["user_status"] | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      variant_attribute_values: {
        Row: {
          attribute_id: string
          value_bool: boolean | null
          value_number: number | null
          value_text: string | null
          variant_id: string
        }
        Insert: {
          attribute_id: string
          value_bool?: boolean | null
          value_number?: number | null
          value_text?: string | null
          variant_id: string
        }
        Update: {
          attribute_id?: string
          value_bool?: boolean | null
          value_number?: number | null
          value_text?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["attribute_id"]
          },
          {
            foreignKeyName: "variant_attribute_values_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["variant_id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          global_product_id: string
          listing_id: string | null
          user_id: string
          wishlist_id: string
        }
        Insert: {
          created_at?: string | null
          global_product_id: string
          listing_id?: string | null
          user_id: string
          wishlist_id?: string
        }
        Update: {
          created_at?: string | null
          global_product_id?: string
          listing_id?: string | null
          user_id?: string
          wishlist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_global_product_id_fkey"
            columns: ["global_product_id"]
            isOneToOne: false
            referencedRelation: "global_products"
            referencedColumns: ["global_product_id"]
          },
          {
            foreignKeyName: "wishlists_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "seller_product_listings"
            referencedColumns: ["listing_id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      seller_refund_details: {
        Row: {
          allocated_razorpay_fee: number | null
          allocated_razorpay_tax: number | null
          item_subtotal: number | null
          method: string | null
          order_id: string | null
          order_item_id: string | null
          payment_id: string | null
          processed_at: string | null
          processed_by: string | null
          refund_amount: number | null
          refund_id: string | null
          refund_status: string | null
          refund_type: string | null
          return_id: string | null
          seller_email: string | null
          seller_id: string | null
          seller_name: string | null
          total_seller_deduction: number | null
          was_already_paid: boolean | null
          was_in_payout: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_pending_payouts"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "order_items_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "v_seller_payout_summary"
            referencedColumns: ["seller_id"]
          },
          {
            foreignKeyName: "order_refunds_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["order_item_id"]
          },
          {
            foreignKeyName: "order_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["payment_id"]
          },
          {
            foreignKeyName: "order_refunds_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_refunds_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "order_returns"
            referencedColumns: ["return_id"]
          },
        ]
      }
      v_pending_payouts: {
        Row: {
          available_balance: number | null
          business_name: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          gross_sales: number | null
          net_amount: number | null
          order_count: number | null
          payout_date: string | null
          payout_id: string | null
          payout_month: number | null
          payout_year: number | null
          pending_balance: number | null
          razorpay_fees: number | null
          refund_deductions: number | null
          seller_id: string | null
          status: string | null
        }
        Relationships: []
      }
      v_seller_payout_summary: {
        Row: {
          approved_payouts: number | null
          available_balance: number | null
          business_name: string | null
          last_payout_amount: number | null
          last_payout_date: string | null
          paid_payouts: number | null
          pending_balance: number | null
          pending_payouts: number | null
          seller_id: string | null
          total_earned: number | null
          total_paid_out: number | null
          total_payouts: number | null
          total_refunded: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_bmi: {
        Args: { height_cm: number; weight_kg: number }
        Returns: number
      }
      delete_seller_cascade: { Args: { sellerid: string }; Returns: undefined }
      get_seller_refund_summary: {
        Args: { p_seller_id: string }
        Returns: {
          cancellation_amount: number
          cancellation_count: number
          pending_refund_amount: number
          pending_refund_count: number
          return_amount: number
          return_count: number
          total_refund_amount: number
          total_refund_count: number
        }[]
      }
      increment_listing_variant_stock: {
        Args: { amount: number; vid: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      setup_buyer_account: { Args: { user_id: string }; Returns: Json }
      update_seller_balance: {
        Args: {
          p_payout_delta?: number
          p_refund_delta?: number
          p_sales_delta?: number
          p_seller_id: string
        }
        Returns: number
      }
    }
    Enums: {
      activity_level:
        | "sedentary"
        | "lightly_active"
        | "moderately_active"
        | "very_active"
        | "extremely_active"
      address_type: "shipping" | "billing" | "both"
      device_type: "mobile" | "tablet" | "desktop" | "other"
      diet_preference:
        | "none"
        | "vegetarian"
        | "vegan"
        | "lactose_free"
        | "gluten_free"
        | "keto"
        | "paleo"
      product_status: "active" | "inactive" | "archived"
      severity: "mild" | "moderate" | "severe"
      user_status: "active" | "inactive" | "banned"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_level: [
        "sedentary",
        "lightly_active",
        "moderately_active",
        "very_active",
        "extremely_active",
      ],
      address_type: ["shipping", "billing", "both"],
      device_type: ["mobile", "tablet", "desktop", "other"],
      diet_preference: [
        "none",
        "vegetarian",
        "vegan",
        "lactose_free",
        "gluten_free",
        "keto",
        "paleo",
      ],
      product_status: ["active", "inactive", "archived"],
      severity: ["mild", "moderate", "severe"],
      user_status: ["active", "inactive", "banned"],
    },
  },
} as const
