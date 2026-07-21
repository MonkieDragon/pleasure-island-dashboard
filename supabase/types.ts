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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      editor_region_access: {
        Row: {
          created_at: string
          region_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          region_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          region_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_region_access_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editor_region_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      puzzle_chains: {
        Row: {
          created_at: string | null
          id: string
          image_path: string | null
          latitude: number
          longitude: number
          ready_to_publish: boolean
          region_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_path?: string | null
          latitude: number
          longitude: number
          ready_to_publish?: boolean
          region_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_path?: string | null
          latitude?: number
          longitude?: number
          ready_to_publish?: boolean
          region_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_chains_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      puzzle_steps: {
        Row: {
          answer: string | null
          chain_id: string
          content: string | null
          created_at: string
          hints: Json | null
          id: string
          image_path: string | null
          latitude: number | null
          longitude: number | null
          multiple_choice_options: string[] | null
          notes: string | null
          order_index: number
          ready_to_publish: boolean
          type: string
        }
        Insert: {
          answer?: string | null
          chain_id: string
          content?: string | null
          created_at?: string
          hints?: Json | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          longitude?: number | null
          multiple_choice_options?: string[] | null
          notes?: string | null
          order_index: number
          ready_to_publish?: boolean
          type: string
        }
        Update: {
          answer?: string | null
          chain_id?: string
          content?: string | null
          created_at?: string
          hints?: Json | null
          id?: string
          image_path?: string | null
          latitude?: number | null
          longitude?: number | null
          multiple_choice_options?: string[] | null
          notes?: string | null
          order_index?: number
          ready_to_publish?: boolean
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_steps_chain_id_fkey"
            columns: ["chain_id"]
            isOneToOne: false
            referencedRelation: "puzzle_chains"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          country: string
          id: string
          image_path: string | null
          latitude: number
          longitude: number
          name: string
          ready_to_publish: boolean
          slug: string
        }
        Insert: {
          country?: string
          id?: string
          image_path?: string | null
          latitude: number
          longitude: number
          name: string
          ready_to_publish?: boolean
          slug: string
        }
        Update: {
          country?: string
          id?: string
          image_path?: string | null
          latitude?: number
          longitude?: number
          name?: string
          ready_to_publish?: boolean
          slug?: string
        }
        Relationships: []
      }
      treasures: {
        Row: {
          assigned_at: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          discovered_at: string | null
          id: string
          image_path: string | null
          latitude: number
          longitude: number
          notes: string | null
          region_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          id?: string
          image_path?: string | null
          latitude: number
          longitude: number
          notes?: string | null
          region_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          discovered_at?: string | null
          id?: string
          image_path?: string | null
          latitude?: number
          longitude?: number
          notes?: string | null
          region_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasures_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_staff_edit_region: { Args: { region_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_editor_or_admin: { Args: never; Returns: boolean }
      puzzle_chain_region_id: { Args: { p_chain_id: string }; Returns: string }
      puzzle_step_region_id: { Args: { p_step_id: string }; Returns: string }
      storage_object_staff_region: {
        Args: { object_name: string }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
