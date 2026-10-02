export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      bills: {
        Row: {
          branch_id: string;
          closed_at: string | null;
          created_at: string;
          id: string;
          restaurant_id: string;
          status: Database["public"]["Enums"]["bill_status"];
          table_session_id: string;
          total_amount: number;
        };
        Insert: {
          branch_id: string;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["bill_status"];
          table_session_id: string;
          total_amount?: number;
        };
        Update: {
          branch_id?: string;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["bill_status"];
          table_session_id?: string;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "bills_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_branch_restaurant_fk";
            columns: ["branch_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "bills_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bills_session_branch_fk";
            columns: ["table_session_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "branch_id"];
          },
          {
            foreignKeyName: "bills_table_session_id_fkey";
            columns: ["table_session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      branches: {
        Row: {
          address: string | null;
          city: string | null;
          closes_at: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          opens_at: string | null;
          restaurant_id: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          closes_at?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          opens_at?: string | null;
          restaurant_id: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          closes_at?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          opens_at?: string | null;
          restaurant_id?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "branches_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      combo_items: {
        Row: {
          combo_id: string;
          id: string;
          item_id: string;
          quantity: number;
        };
        Insert: {
          combo_id: string;
          id?: string;
          item_id: string;
          quantity?: number;
        };
        Update: {
          combo_id?: string;
          id?: string;
          item_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "combo_items_combo_id_fkey";
            columns: ["combo_id"];
            isOneToOne: false;
            referencedRelation: "combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "combo_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      combos: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          price: number;
          restaurant_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          price: number;
          restaurant_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          price?: number;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "combos_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          offer_id: string | null;
          restaurant_id: string;
          times_used: number;
          usage_limit: number | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          offer_id?: string | null;
          restaurant_id: string;
          times_used?: number;
          usage_limit?: number | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          offer_id?: string | null;
          restaurant_id?: string;
          times_used?: number;
          usage_limit?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "coupons_offer_id_fkey";
            columns: ["offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupons_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          name: string | null;
          phone: string | null;
          restaurant_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          restaurant_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          name?: string | null;
          phone?: string | null;
          restaurant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback: {
        Row: {
          comment: string | null;
          created_at: string;
          experience_rating: number | null;
          food_rating: number | null;
          id: string;
          order_id: string | null;
          restaurant_id: string;
          service_rating: number | null;
        };
        Insert: {
          comment?: string | null;
          created_at?: string;
          experience_rating?: number | null;
          food_rating?: number | null;
          id?: string;
          order_id?: string | null;
          restaurant_id: string;
          service_rating?: number | null;
        };
        Update: {
          comment?: string | null;
          created_at?: string;
          experience_rating?: number | null;
          food_rating?: number | null;
          id?: string;
          order_id?: string | null;
          restaurant_id?: string;
          service_rating?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_order_restaurant_fk";
            columns: ["order_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "feedback_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      loyalty_points: {
        Row: {
          customer_id: string;
          id: string;
          points: number;
          restaurant_id: string;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          id?: string;
          points?: number;
          restaurant_id: string;
          updated_at?: string;
        };
        Update: {
          customer_id?: string;
          id?: string;
          points?: number;
          restaurant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "loyalty_points_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "loyalty_points_customer_restaurant_fk";
            columns: ["customer_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "loyalty_points_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_addons: {
        Row: {
          id: string;
          item_id: string;
          name: string;
          price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          item_id: string;
          name: string;
          price: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          item_id?: string;
          name?: string;
          price?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_addons_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          restaurant_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          restaurant_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          restaurant_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          base_price: number;
          category_id: string;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_available: boolean;
          is_bestseller: boolean;
          is_recommended: boolean;
          is_veg: boolean;
          name: string;
          restaurant_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          base_price: number;
          category_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_bestseller?: boolean;
          is_recommended?: boolean;
          is_veg?: boolean;
          name: string;
          restaurant_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          base_price?: number;
          category_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_available?: boolean;
          is_bestseller?: boolean;
          is_recommended?: boolean;
          is_veg?: boolean;
          name?: string;
          restaurant_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_category_restaurant_fk";
            columns: ["category_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "menu_categories";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_variants: {
        Row: {
          id: string;
          is_default: boolean;
          item_id: string;
          name: string;
          price: number;
          sort_order: number;
        };
        Insert: {
          id?: string;
          is_default?: boolean;
          item_id: string;
          name: string;
          price: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          is_default?: boolean;
          item_id?: string;
          name?: string;
          price?: number;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "menu_variants_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          branch_id: string | null;
          created_at: string;
          event: Database["public"]["Enums"]["notification_event"];
          id: string;
          read_at: string | null;
          reference_id: string | null;
          restaurant_id: string;
          title: string;
        };
        Insert: {
          body?: string | null;
          branch_id?: string | null;
          created_at?: string;
          event: Database["public"]["Enums"]["notification_event"];
          id?: string;
          read_at?: string | null;
          reference_id?: string | null;
          restaurant_id: string;
          title: string;
        };
        Update: {
          body?: string | null;
          branch_id?: string | null;
          created_at?: string;
          event?: Database["public"]["Enums"]["notification_event"];
          id?: string;
          read_at?: string | null;
          reference_id?: string | null;
          restaurant_id?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_branch_restaurant_fk";
            columns: ["branch_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "notifications_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      offers: {
        Row: {
          category_ids: string[] | null;
          created_at: string;
          days_of_week: number[] | null;
          ends_at: string | null;
          ends_on: string | null;
          flat_value: number | null;
          id: string;
          is_active: boolean;
          item_ids: string[] | null;
          max_discount_value: number | null;
          min_order_value: number | null;
          name: string;
          percentage_value: number | null;
          restaurant_id: string;
          starts_at: string | null;
          starts_on: string | null;
          type: Database["public"]["Enums"]["offer_type"];
          updated_at: string;
        };
        Insert: {
          category_ids?: string[] | null;
          created_at?: string;
          days_of_week?: number[] | null;
          ends_at?: string | null;
          ends_on?: string | null;
          flat_value?: number | null;
          id?: string;
          is_active?: boolean;
          item_ids?: string[] | null;
          max_discount_value?: number | null;
          min_order_value?: number | null;
          name: string;
          percentage_value?: number | null;
          restaurant_id: string;
          starts_at?: string | null;
          starts_on?: string | null;
          type: Database["public"]["Enums"]["offer_type"];
          updated_at?: string;
        };
        Update: {
          category_ids?: string[] | null;
          created_at?: string;
          days_of_week?: number[] | null;
          ends_at?: string | null;
          ends_on?: string | null;
          flat_value?: number | null;
          id?: string;
          is_active?: boolean;
          item_ids?: string[] | null;
          max_discount_value?: number | null;
          min_order_value?: number | null;
          name?: string;
          percentage_value?: number | null;
          restaurant_id?: string;
          starts_at?: string | null;
          starts_on?: string | null;
          type?: Database["public"]["Enums"]["offer_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "offers_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          addon_selection: NonNullable<Json>;
          created_at: string;
          id: string;
          item_id: string;
          item_name: string;
          order_id: string;
          quantity: number;
          special_instructions: string | null;
          unit_price: number;
          variant_id: string | null;
          variant_name: string | null;
        };
        Insert: {
          addon_selection?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          item_id: string;
          item_name: string;
          order_id: string;
          quantity?: number;
          special_instructions?: string | null;
          unit_price: number;
          variant_id?: string | null;
          variant_name?: string | null;
        };
        Update: {
          addon_selection?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          item_id?: string;
          item_name?: string;
          order_id?: string;
          quantity?: number;
          special_instructions?: string | null;
          unit_price?: number;
          variant_id?: string | null;
          variant_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "menu_variants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_item_fk";
            columns: ["variant_id", "item_id"];
            isOneToOne: false;
            referencedRelation: "menu_variants";
            referencedColumns: ["id", "item_id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          changed_by_staff_id: string | null;
          created_at: string;
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          changed_by?: string | null;
          changed_by_staff_id?: string | null;
          created_at?: string;
          id?: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          changed_by?: string | null;
          changed_by_staff_id?: string | null;
          created_at?: string;
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_staff_id_fkey";
            columns: ["changed_by_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          branch_id: string;
          coupon_id: string | null;
          created_at: string;
          customer_id: string | null;
          discount_amount: number;
          id: string;
          order_number: number;
          restaurant_id: string;
          service_charge_amount: number;
          special_instructions: string | null;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          table_session_id: string | null;
          tax_amount: number;
          total_amount: number;
          updated_at: string;
        };
        Insert: {
          branch_id: string;
          coupon_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          discount_amount?: number;
          id?: string;
          order_number?: never;
          restaurant_id: string;
          service_charge_amount?: number;
          special_instructions?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          table_session_id?: string | null;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Update: {
          branch_id?: string;
          coupon_id?: string | null;
          created_at?: string;
          customer_id?: string | null;
          discount_amount?: number;
          id?: string;
          order_number?: never;
          restaurant_id?: string;
          service_charge_amount?: number;
          special_instructions?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          table_session_id?: string | null;
          tax_amount?: number;
          total_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_branch_restaurant_fk";
            columns: ["branch_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_coupon_restaurant_fk";
            columns: ["coupon_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_customer_restaurant_fk";
            columns: ["customer_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "orders_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_session_branch_fk";
            columns: ["table_session_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id", "branch_id"];
          },
          {
            foreignKeyName: "orders_table_session_id_fkey";
            columns: ["table_session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          bill_id: string | null;
          created_at: string;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id: string | null;
          recorded_by: string | null;
          recorded_by_staff_id: string | null;
          restaurant_id: string;
          status: Database["public"]["Enums"]["payment_status"];
        };
        Insert: {
          amount: number;
          bill_id?: string | null;
          created_at?: string;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          order_id?: string | null;
          recorded_by?: string | null;
          recorded_by_staff_id?: string | null;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Update: {
          amount?: number;
          bill_id?: string | null;
          created_at?: string;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          order_id?: string | null;
          recorded_by?: string | null;
          recorded_by_staff_id?: string | null;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["payment_status"];
        };
        Relationships: [
          {
            foreignKeyName: "payments_bill_id_fkey";
            columns: ["bill_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_bill_restaurant_fk";
            columns: ["bill_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "bills";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_order_restaurant_fk";
            columns: ["order_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "payments_recorded_by_staff_id_fkey";
            columns: ["recorded_by_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payments_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: {
          created_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      qr_codes: {
        Row: {
          branch_id: string | null;
          created_at: string;
          id: string;
          label: string;
          restaurant_id: string;
          table_id: string | null;
          target_url: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          restaurant_id: string;
          table_id?: string | null;
          target_url: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          restaurant_id?: string;
          table_id?: string | null;
          target_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "qr_codes_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_codes_branch_restaurant_fk";
            columns: ["branch_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "qr_codes_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "qr_codes_table_branch_fk";
            columns: ["table_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id", "branch_id"];
          },
          {
            foreignKeyName: "qr_codes_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_members: {
        Row: {
          created_at: string;
          id: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["restaurant_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_members_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_tables: {
        Row: {
          assigned_staff_id: string | null;
          branch_id: string;
          created_at: string;
          id: string;
          label: string;
          status: Database["public"]["Enums"]["table_status"];
          updated_at: string;
        };
        Insert: {
          assigned_staff_id?: string | null;
          branch_id: string;
          created_at?: string;
          id?: string;
          label: string;
          status?: Database["public"]["Enums"]["table_status"];
          updated_at?: string;
        };
        Update: {
          assigned_staff_id?: string | null;
          branch_id?: string;
          created_at?: string;
          id?: string;
          label?: string;
          status?: Database["public"]["Enums"]["table_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_tables_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurant_themes: {
        Row: {
          font_family: string | null;
          primary_color: string | null;
          restaurant_id: string;
          secondary_color: string | null;
          template_id: string | null;
          updated_at: string;
        };
        Insert: {
          font_family?: string | null;
          primary_color?: string | null;
          restaurant_id: string;
          secondary_color?: string | null;
          template_id?: string | null;
          updated_at?: string;
        };
        Update: {
          font_family?: string | null;
          primary_color?: string | null;
          restaurant_id?: string;
          secondary_color?: string | null;
          template_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "restaurant_themes_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: true;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "restaurant_themes_template_id_fkey";
            columns: ["template_id"];
            isOneToOne: false;
            referencedRelation: "templates";
            referencedColumns: ["id"];
          },
        ];
      };
      restaurants: {
        Row: {
          cover_image_url: string | null;
          created_at: string;
          cuisine_type: string | null;
          description: string | null;
          id: string;
          instagram: string | null;
          logo_url: string | null;
          name: string;
          owner_id: string;
          phone: string | null;
          service_charge_percent: number;
          slug: string;
          status: Database["public"]["Enums"]["restaurant_status"];
          tax_percent: number;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          cover_image_url?: string | null;
          created_at?: string;
          cuisine_type?: string | null;
          description?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          name: string;
          owner_id: string;
          phone?: string | null;
          service_charge_percent?: number;
          slug: string;
          status?: Database["public"]["Enums"]["restaurant_status"];
          tax_percent?: number;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          cover_image_url?: string | null;
          created_at?: string;
          cuisine_type?: string | null;
          description?: string | null;
          id?: string;
          instagram?: string | null;
          logo_url?: string | null;
          name?: string;
          owner_id?: string;
          phone?: string | null;
          service_charge_percent?: number;
          slug?: string;
          status?: Database["public"]["Enums"]["restaurant_status"];
          tax_percent?: number;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          branch_id: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          phone: string | null;
          pin_hash: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          updated_at: string;
        };
        Insert: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          phone?: string | null;
          pin_hash: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          updated_at?: string;
        };
        Update: {
          branch_id?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          phone?: string | null;
          pin_hash?: string;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["restaurant_role"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "staff_branch_restaurant_fk";
            columns: ["branch_id", "restaurant_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id", "restaurant_id"];
          },
          {
            foreignKeyName: "staff_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_devices: {
        Row: {
          created_at: string;
          id: string;
          push_subscription: NonNullable<Json>;
          staff_id: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          push_subscription: NonNullable<Json>;
          staff_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          push_subscription?: NonNullable<Json>;
          staff_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_devices_staff_id_fkey";
            columns: ["staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_login_attempts: {
        Row: {
          created_at: string;
          id: string;
          ip: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          succeeded: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip: string;
          restaurant_id: string;
          role: Database["public"]["Enums"]["restaurant_role"];
          succeeded?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip?: string;
          restaurant_id?: string;
          role?: Database["public"]["Enums"]["restaurant_role"];
          succeeded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "staff_login_attempts_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_plans: {
        Row: {
          features: NonNullable<Json>;
          id: string;
          max_branches: number | null;
          max_staff: number | null;
          monthly_price: number;
          name: string;
          tier: Database["public"]["Enums"]["subscription_plan_tier"];
        };
        Insert: {
          features?: NonNullable<Json>;
          id?: string;
          max_branches?: number | null;
          max_staff?: number | null;
          monthly_price: number;
          name: string;
          tier: Database["public"]["Enums"]["subscription_plan_tier"];
        };
        Update: {
          features?: NonNullable<Json>;
          id?: string;
          max_branches?: number | null;
          max_staff?: number | null;
          monthly_price?: number;
          name?: string;
          tier?: Database["public"]["Enums"]["subscription_plan_tier"];
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string;
          current_period_end: string | null;
          current_period_start: string;
          id: string;
          plan_id: string;
          restaurant_id: string;
          status: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string;
          id?: string;
          plan_id: string;
          restaurant_id: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string;
          id?: string;
          plan_id?: string;
          restaurant_id?: string;
          status?: Database["public"]["Enums"]["subscription_status"];
          trial_ends_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "subscription_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
        ];
      };
      table_sessions: {
        Row: {
          branch_id: string;
          closed_at: string | null;
          id: string;
          opened_at: string;
          status: Database["public"]["Enums"]["table_session_status"];
          table_id: string;
        };
        Insert: {
          branch_id: string;
          closed_at?: string | null;
          id?: string;
          opened_at?: string;
          status?: Database["public"]["Enums"]["table_session_status"];
          table_id: string;
        };
        Update: {
          branch_id?: string;
          closed_at?: string | null;
          id?: string;
          opened_at?: string;
          status?: Database["public"]["Enums"]["table_session_status"];
          table_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "table_sessions_branch_fk";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_sessions_table_branch_fk";
            columns: ["table_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id", "branch_id"];
          },
          {
            foreignKeyName: "table_sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
        ];
      };
      templates: {
        Row: {
          id: string;
          is_premium: boolean;
          name: string;
          preview_image_url: string | null;
          slug: string;
        };
        Insert: {
          id?: string;
          is_premium?: boolean;
          name: string;
          preview_image_url?: string | null;
          slug: string;
        };
        Update: {
          id?: string;
          is_premium?: boolean;
          name?: string;
          preview_image_url?: string | null;
          slug?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          id: string;
          provider_reference: string | null;
          status: Database["public"]["Enums"]["payment_status"];
          subscription_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          id?: string;
          provider_reference?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          id?: string;
          provider_reference?: string | null;
          status?: Database["public"]["Enums"]["payment_status"];
          subscription_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
      waiter_requests: {
        Row: {
          acknowledged_at: string | null;
          assigned_staff_id: string | null;
          branch_id: string;
          created_at: string;
          id: string;
          note: string | null;
          resolved_at: string | null;
          resolved_by_staff_id: string | null;
          table_id: string;
          type: Database["public"]["Enums"]["waiter_request_type"];
        };
        Insert: {
          acknowledged_at?: string | null;
          assigned_staff_id?: string | null;
          branch_id: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          resolved_by_staff_id?: string | null;
          table_id: string;
          type: Database["public"]["Enums"]["waiter_request_type"];
        };
        Update: {
          acknowledged_at?: string | null;
          assigned_staff_id?: string | null;
          branch_id?: string;
          created_at?: string;
          id?: string;
          note?: string | null;
          resolved_at?: string | null;
          resolved_by_staff_id?: string | null;
          table_id?: string;
          type?: Database["public"]["Enums"]["waiter_request_type"];
        };
        Relationships: [
          {
            foreignKeyName: "waiter_requests_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waiter_requests_branch_id_fkey";
            columns: ["branch_id"];
            isOneToOne: false;
            referencedRelation: "branches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waiter_requests_resolved_by_staff_id_fkey";
            columns: ["resolved_by_staff_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "waiter_requests_table_branch_fk";
            columns: ["table_id", "branch_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id", "branch_id"];
          },
          {
            foreignKeyName: "waiter_requests_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "restaurant_tables";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      begin_staff_login_attempt: {
        Args: {
          p_ip: string;
          p_restaurant_id: string;
          p_role: Database["public"]["Enums"]["restaurant_role"];
        };
        Returns: string;
      };
      complete_staff_login_attempt: { Args: { p_attempt_id: string }; Returns: undefined };
      create_restaurant: {
        Args: { p_branch_name: string; p_cuisine_type?: string; p_name: string; p_slug: string };
        Returns: string;
      };
      dearmor: { Args: { "": string }; Returns: string };
      gen_random_uuid: { Args: Record<PropertyKey, never>; Returns: string };
      gen_salt: { Args: { "": string }; Returns: string };
      mark_bill_paid: {
        Args: {
          p_bill_id: string;
          p_branch_id?: string;
          p_method: Database["public"]["Enums"]["payment_method"];
          p_restaurant_id: string;
          p_staff_id: string;
        };
        Returns: undefined;
      };
      pgp_armor_headers: { Args: { "": string }; Returns: Record<string, unknown>[] };
      place_order: {
        Args: {
          p_branch_slug: string;
          p_coupon_code?: string;
          p_customer_name?: string;
          p_customer_phone?: string;
          p_lines: Json;
          p_restaurant_slug: string;
          p_table_id?: string;
        };
        Returns: {
          order_id: string;
          order_number: number;
        }[];
      };
    };
    Enums: {
      bill_status: "open" | "requested" | "paid";
      notification_event:
        | "new_order"
        | "waiter_request"
        | "bill_request"
        | "payment_received"
        | "order_ready";
      offer_type: "percentage" | "flat" | "bogo" | "combo" | "happy_hour";
      order_status:
        | "pending"
        | "accepted"
        | "preparing"
        | "ready"
        | "served"
        | "completed"
        | "cancelled";
      payment_method: "cash" | "mobile_money" | "card" | "online";
      payment_status: "pending" | "paid" | "failed" | "refunded";
      restaurant_role: "owner" | "manager" | "waiter" | "kitchen" | "cashier";
      restaurant_status: "active" | "suspended" | "closed";
      subscription_plan_tier: "starter" | "business" | "pro";
      subscription_status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
      table_session_status: "open" | "bill_requested" | "closed";
      table_status:
        | "available"
        | "occupied"
        | "order_pending"
        | "preparing"
        | "ready"
        | "bill_requested"
        | "cleaning";
      waiter_request_type: "call_waiter" | "water" | "cutlery" | "bill" | "other";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      bill_status: ["open", "requested", "paid"],
      notification_event: [
        "new_order",
        "waiter_request",
        "bill_request",
        "payment_received",
        "order_ready",
      ],
      offer_type: ["percentage", "flat", "bogo", "combo", "happy_hour"],
      order_status: [
        "pending",
        "accepted",
        "preparing",
        "ready",
        "served",
        "completed",
        "cancelled",
      ],
      payment_method: ["cash", "mobile_money", "card", "online"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      restaurant_role: ["owner", "manager", "waiter", "kitchen", "cashier"],
      restaurant_status: ["active", "suspended", "closed"],
      subscription_plan_tier: ["starter", "business", "pro"],
      subscription_status: ["trialing", "active", "past_due", "cancelled", "expired"],
      table_session_status: ["open", "bill_requested", "closed"],
      table_status: [
        "available",
        "occupied",
        "order_pending",
        "preparing",
        "ready",
        "bill_requested",
        "cleaning",
      ],
      waiter_request_type: ["call_waiter", "water", "cutlery", "bill", "other"],
    },
  },
} as const;
