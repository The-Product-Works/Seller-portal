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
        ]
      }
      product_images: {
        Row: {
          image_id: string
          product_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          image_id?: string
          product_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          image_id?: string
          product_id?: string
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
          listing_id: string | null
          question_id: string
          question_text: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          is_active?: boolean | null
          listing_id?: string | null
          question_id?: string
          question_text: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          is_active?: boolean | null
          listing_id?: string | null
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
          product_id: string
          seller_id: string
          status: Database["public"]["Enums"]["product_status"] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          base_price: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          product_id?: string
          seller_id: string
          status?: Database["public"]["Enums"]["product_status"] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          product_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["product_status"] | null
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
        ]
      }
      seller_product_listings: {
        Row: {
          base_price: number
          created_at: string | null
          discount_percentage: number | null
          discounted_price: number | null
          global_product_id: string
          health_score: number | null
          is_verified: boolean | null
          listing_id: string
          published_at: string | null
          rating: number | null
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
          created_at?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          global_product_id: string
          health_score?: number | null
          is_verified?: boolean | null
          listing_id?: string
          published_at?: string | null
          rating?: number | null
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
          created_at?: string | null
          discount_percentage?: number | null
          discounted_price?: number | null
          global_product_id?: string
          health_score?: number | null
          is_verified?: boolean | null
          listing_id?: string
          published_at?: string | null
          rating?: number | null
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
      [_ in never]: never
    }
    Functions: {
      calculate_bmi: {
        Args: { height_cm: number; weight_kg: number }
        Returns: number
      }
      is_admin: { Args: never; Returns: boolean }
      setup_buyer_account: { Args: { user_id: string }; Returns: Json }
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
