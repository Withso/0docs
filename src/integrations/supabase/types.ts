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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          order_index: number
          section_id: string
          type: Database["public"]["Enums"]["block_type"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          section_id: string
          type?: Database["public"]["Enums"]["block_type"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          order_index?: number
          section_id?: string
          type?: Database["public"]["Enums"]["block_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_versions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          project_id: string
          version_label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          project_id: string
          version_label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          project_id?: string
          version_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "doc_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      nav_groups: {
        Row: {
          created_at: string
          id: string
          order_index: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nav_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      page_analytics: {
        Row: {
          avg_time_seconds: number | null
          created_at: string
          id: string
          last_viewed_at: string | null
          page_id: string
          project_id: string
          view_count: number
        }
        Insert: {
          avg_time_seconds?: number | null
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          page_id: string
          project_id: string
          view_count?: number
        }
        Update: {
          avg_time_seconds?: number | null
          created_at?: string
          id?: string
          last_viewed_at?: string | null
          page_id?: string
          project_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "page_analytics_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: true
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      page_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_helpful: boolean
          page_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful: boolean
          page_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_helpful?: boolean
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_feedback_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          created_at: string
          id: string
          meta_description: string | null
          nav_group_id: string | null
          order_index: number
          project_id: string
          slug: string
          title: string
          updated_at: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          meta_description?: string | null
          nav_group_id?: string | null
          order_index?: number
          project_id: string
          slug: string
          title: string
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          meta_description?: string | null
          nav_group_id?: string | null
          order_index?: number
          project_id?: string
          slug?: string
          title?: string
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_nav_group_id_fkey"
            columns: ["nav_group_id"]
            isOneToOne: false
            referencedRelation: "nav_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pages_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "doc_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_design_settings: {
        Row: {
          created_at: string
          id: string
          project_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_design_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_homepage: boolean
          name: string
          slug: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_homepage?: boolean
          name: string
          slug: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_homepage?: boolean
          name?: string
          slug?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      search_queries: {
        Row: {
          created_at: string
          id: string
          project_id: string
          query: string
          results_count: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          query: string
          results_count?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          query?: string
          results_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "search_queries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          id: string
          order_index: number
          page_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_index?: number
          page_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_index?: number
          page_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      block_type:
        | "heading"
        | "paragraph"
        | "code_block"
        | "image"
        | "video"
        | "youtube"
        | "ordered_list"
        | "unordered_list"
        | "note"
        | "callout"
        | "tabs"
        | "accordion"
        | "card"
        | "steps"
        | "table"
        | "divider"
        | "quote"
        | "api_endpoint"
        | "code_tabs"
        | "inline_editor"
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
      app_role: ["admin", "moderator", "user"],
      block_type: [
        "heading",
        "paragraph",
        "code_block",
        "image",
        "video",
        "youtube",
        "ordered_list",
        "unordered_list",
        "note",
        "callout",
        "tabs",
        "accordion",
        "card",
        "steps",
        "table",
        "divider",
        "quote",
        "api_endpoint",
        "code_tabs",
        "inline_editor",
      ],
    },
  },
} as const
