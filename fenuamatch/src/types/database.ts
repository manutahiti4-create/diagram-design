
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "admin_audit_log": {
                  Row: {
                    "action": string,"admin_id": string | null,"created_at": string,"details": Json | null,"id": number,"reason": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_id"?: string | null,"created_at"?: string,"details"?: Json | null,"id"?: never,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_id"?: string | null,"created_at"?: string,"details"?: Json | null,"id"?: never,"reason"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "admin_audit_log_admin_id_fkey"
      columns: ["admin_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "created_at": string,"icon": string | null,"id": number,"is_active": boolean,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"icon"?: string | null,"id"?: number,"is_active"?: boolean,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"icon"?: string | null,"id"?: number,"is_active"?: boolean,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"communes": {
                  Row: {
                    "id": number,"is_active": boolean,"island_id": number,"name": string,"slug": string,"sort_order": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: number,"is_active"?: boolean,"island_id": number,"name": string,"slug": string,"sort_order"?: number
                  }
                  Update: {
                    "id"?: number,"is_active"?: boolean,"island_id"?: number,"name"?: string,"slug"?: string,"sort_order"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "communes_island_id_fkey"
      columns: ["island_id"]
isOneToOne: false
      referencedRelation: "islands"
      referencedColumns: ["id"]
    }
                  ]
                },"conversation_members": {
                  Row: {
                    "conversation_id": string,"joined_at": string,"last_read_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "conversation_id": string,"joined_at"?: string,"last_read_at"?: string,"user_id": string
                  }
                  Update: {
                    "conversation_id"?: string,"joined_at"?: string,"last_read_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversation_members_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversation_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "client_id": string | null,"created_at": string,"id": string,"last_message_at": string | null,"last_message_preview": string | null,"last_sender_id": string | null,"listing_id": string | null,"provider_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null,"listing_id"?: string | null,"provider_id"?: string | null
                  }
                  Update: {
                    "client_id"?: string | null,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"last_message_preview"?: string | null,"last_sender_id"?: string | null,"listing_id"?: string | null,"provider_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"islands": {
                  Row: {
                    "id": number,"is_active": boolean,"name": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": number,"is_active"?: boolean,"name": string,"slug": string
                  }
                  Update: {
                    "id"?: number,"is_active"?: boolean,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"listing_categories": {
                  Row: {
                    "category_id": number,"listing_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"listing_id": string
                  }
                  Update: {
                    "category_id"?: number,"listing_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_categories_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_categories_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_photos": {
                  Row: {
                    "created_at": string,"id": string,"listing_id": string,"position": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_id": string,"position"?: number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_id"?: string,"position"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_photos_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listing_revisions": {
                  Row: {
                    "created_at": string,"editor_id": string | null,"id": number,"listing_id": string,"previous": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"editor_id"?: string | null,"id"?: never,"listing_id": string,"previous": NonNullable<Json>
                  }
                  Update: {
                    "created_at"?: string,"editor_id"?: string | null,"id"?: never,"listing_id"?: string,"previous"?: NonNullable<Json>
                  }
                  Relationships: [
                    {
      foreignKeyName: "listing_revisions_editor_id_fkey"
      columns: ["editor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listing_revisions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    }
                  ]
                },"listings": {
                  Row: {
                    "budget_xpf": number | null,"client_id": string,"commune_id": number,"created_at": string,"date_mode": Database["public"]['Enums']["date_mode"],"description": string,"desired_date": string | null,"edit_count": number,"expires_at": string | null,"hidden_reason": string | null,"id": string,"is_demo": boolean,"is_hidden": boolean,"published_at": string | null,"renewal_count": number,"search_document": unknown,"status": Database["public"]['Enums']["listing_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "budget_xpf"?: number | null,"client_id": string,"commune_id": number,"created_at"?: string,"date_mode"?: Database["public"]['Enums']["date_mode"],"description": string,"desired_date"?: string | null,"edit_count"?: number,"expires_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"is_demo"?: boolean,"is_hidden"?: boolean,"published_at"?: string | null,"renewal_count"?: number,"search_document"?: never,"status"?: Database["public"]['Enums']["listing_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "budget_xpf"?: number | null,"client_id"?: string,"commune_id"?: number,"created_at"?: string,"date_mode"?: Database["public"]['Enums']["date_mode"],"description"?: string,"desired_date"?: string | null,"edit_count"?: number,"expires_at"?: string | null,"hidden_reason"?: string | null,"id"?: string,"is_demo"?: boolean,"is_hidden"?: boolean,"published_at"?: string | null,"renewal_count"?: number,"search_document"?: never,"status"?: Database["public"]['Enums']["listing_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "listings_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "listings_commune_id_fkey"
      columns: ["commune_id"]
isOneToOne: false
      referencedRelation: "communes"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"is_hidden": boolean,"kind": string,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"kind"?: string,"sender_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"is_hidden"?: boolean,"kind"?: string,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"missions": {
                  Row: {
                    "client_id": string | null,"close_reason": string | null,"closed_at": string | null,"closed_by": string | null,"completed_at": string | null,"confirmed_at": string | null,"created_at": string,"id": string,"listing_id": string,"proposal_id": string,"provider_id": string | null,"selected_at": string,"status": Database["public"]['Enums']["mission_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "client_id"?: string | null,"close_reason"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"listing_id": string,"proposal_id": string,"provider_id"?: string | null,"selected_at"?: string,"status"?: Database["public"]['Enums']["mission_status"],"updated_at"?: string
                  }
                  Update: {
                    "client_id"?: string | null,"close_reason"?: string | null,"closed_at"?: string | null,"closed_by"?: string | null,"completed_at"?: string | null,"confirmed_at"?: string | null,"created_at"?: string,"id"?: string,"listing_id"?: string,"proposal_id"?: string,"provider_id"?: string | null,"selected_at"?: string,"status"?: Database["public"]['Enums']["mission_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "missions_client_id_fkey"
      columns: ["client_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "missions_closed_by_fkey"
      columns: ["closed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "missions_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "missions_proposal_id_fkey"
      columns: ["proposal_id"]
isOneToOne: false
      referencedRelation: "proposals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "missions_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"moderation_appeals": {
                  Row: {
                    "created_at": string,"id": string,"message": string,"resolution_note": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": string,"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"message": string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id": string,"target_type": Database["public"]['Enums']["report_target"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"message"?: string,"resolution_note"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: string,"target_id"?: string,"target_type"?: Database["public"]['Enums']["report_target"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "moderation_appeals_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "moderation_appeals_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"link_path": string | null,"read_at": string | null,"ref_id": string | null,"title": string,"type": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link_path"?: string | null,"read_at"?: string | null,"ref_id"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"link_path"?: string | null,"read_at"?: string | null,"ref_id"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profile_private": {
                  Row: {
                    "adult_confirmed_at": string | null,"phone": string | null,"terms_accepted_at": string | null,"terms_version": string | null,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "adult_confirmed_at"?: string | null,"phone"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "adult_confirmed_at"?: string | null,"phone"?: string | null,"terms_accepted_at"?: string | null,"terms_version"?: string | null,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profile_private_user_id_fkey"
      columns: ["user_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "account_type": Database["public"]['Enums']["account_type"],"avatar_path": string | null,"commune_id": number | null,"created_at": string,"hidden_for_inactivity": boolean,"hidden_reason": string | null,"id": string,"inactivity_reminder_sent_at": string | null,"is_demo": boolean,"is_hidden": boolean,"last_active_at": string,"status": Database["public"]['Enums']["account_status"],"updated_at": string,"username": string,"username_change_count": number,"username_changed_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "account_type": Database["public"]['Enums']["account_type"],"avatar_path"?: string | null,"commune_id"?: number | null,"created_at"?: string,"hidden_for_inactivity"?: boolean,"hidden_reason"?: string | null,"id": string,"inactivity_reminder_sent_at"?: string | null,"is_demo"?: boolean,"is_hidden"?: boolean,"last_active_at"?: string,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username": string,"username_change_count"?: number,"username_changed_at"?: string | null
                  }
                  Update: {
                    "account_type"?: Database["public"]['Enums']["account_type"],"avatar_path"?: string | null,"commune_id"?: number | null,"created_at"?: string,"hidden_for_inactivity"?: boolean,"hidden_reason"?: string | null,"id"?: string,"inactivity_reminder_sent_at"?: string | null,"is_demo"?: boolean,"is_hidden"?: boolean,"last_active_at"?: string,"status"?: Database["public"]['Enums']["account_status"],"updated_at"?: string,"username"?: string,"username_change_count"?: number,"username_changed_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_commune_id_fkey"
      columns: ["commune_id"]
isOneToOne: false
      referencedRelation: "communes"
      referencedColumns: ["id"]
    }
                  ]
                },"proposals": {
                  Row: {
                    "created_at": string,"id": string,"listing_changed_at": string | null,"listing_id": string,"message": string,"price_xpf": number | null,"provider_id": string | null,"status": Database["public"]['Enums']["proposal_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"listing_changed_at"?: string | null,"listing_id": string,"message": string,"price_xpf"?: number | null,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"listing_changed_at"?: string | null,"listing_id"?: string,"message"?: string,"price_xpf"?: number | null,"provider_id"?: string | null,"status"?: Database["public"]['Enums']["proposal_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "proposals_listing_id_fkey"
      columns: ["listing_id"]
isOneToOne: false
      referencedRelation: "listings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "proposals_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_photos": {
                  Row: {
                    "caption": string | null,"created_at": string,"id": string,"position": number,"provider_id": string,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"provider_id": string,"storage_path": string
                  }
                  Update: {
                    "caption"?: string | null,"created_at"?: string,"id"?: string,"position"?: number,"provider_id"?: string,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_photos_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_profiles": {
                  Row: {
                    "availability": Database["public"]['Enums']["availability"],"commune_id": number,"created_at": string,"description": string,"extra_info": string | null,"hidden_reason": string | null,"id": string,"is_hidden": boolean,"is_published": boolean,"main_trade_id": number,"opening_hours": string | null,"phone": string | null,"public_name": string,"search_document": unknown,"service_area": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "availability"?: Database["public"]['Enums']["availability"],"commune_id": number,"created_at"?: string,"description": string,"extra_info"?: string | null,"hidden_reason"?: string | null,"id": string,"is_hidden"?: boolean,"is_published"?: boolean,"main_trade_id": number,"opening_hours"?: string | null,"phone"?: string | null,"public_name": string,"search_document"?: unknown,"service_area"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "availability"?: Database["public"]['Enums']["availability"],"commune_id"?: number,"created_at"?: string,"description"?: string,"extra_info"?: string | null,"hidden_reason"?: string | null,"id"?: string,"is_hidden"?: boolean,"is_published"?: boolean,"main_trade_id"?: number,"opening_hours"?: string | null,"phone"?: string | null,"public_name"?: string,"search_document"?: unknown,"service_area"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_profiles_commune_id_fkey"
      columns: ["commune_id"]
isOneToOne: false
      referencedRelation: "communes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_profiles_id_fkey"
      columns: ["id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_profiles_main_trade_id_fkey"
      columns: ["main_trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    }
                  ]
                },"provider_trades": {
                  Row: {
                    "created_at": string,"provider_id": string,"trade_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"provider_id": string,"trade_id": number
                  }
                  Update: {
                    "created_at"?: string,"provider_id"?: string,"trade_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "provider_trades_provider_id_fkey"
      columns: ["provider_id"]
isOneToOne: false
      referencedRelation: "provider_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "provider_trades_trade_id_fkey"
      columns: ["trade_id"]
isOneToOne: false
      referencedRelation: "trades"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"decision_note": string | null,"details": string | null,"id": string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["report_status"],"target_id": string,"target_owner_id": string | null,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"decision_note"?: string | null,"details"?: string | null,"id"?: string,"reason": Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id": string,"target_owner_id"?: string | null,"target_type": Database["public"]['Enums']["report_target"]
                  }
                  Update: {
                    "created_at"?: string,"decision_note"?: string | null,"details"?: string | null,"id"?: string,"reason"?: Database["public"]['Enums']["report_reason"],"reporter_id"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["report_status"],"target_id"?: string,"target_owner_id"?: string | null,"target_type"?: Database["public"]['Enums']["report_target"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_target_owner_id_fkey"
      columns: ["target_owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"status_history": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"entity_id": string,"entity_type": string,"from_status": string | null,"id": number,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id": string,"entity_type": string,"from_status"?: string | null,"id"?: never,"to_status": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"entity_id"?: string,"entity_type"?: string,"from_status"?: string | null,"id"?: never,"to_status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "status_history_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"trades": {
                  Row: {
                    "category_id": number,"created_at": string,"id": number,"is_active": boolean,"keywords": string | null,"name": string,"slug": string,"sort_order": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category_id": number,"created_at"?: string,"id"?: number,"is_active"?: boolean,"keywords"?: string | null,"name": string,"slug": string,"sort_order"?: number,"updated_at"?: string
                  }
                  Update: {
                    "category_id"?: number,"created_at"?: string,"id"?: number,"is_active"?: boolean,"keywords"?: string | null,"name"?: string,"slug"?: string,"sort_order"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trades_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "granted_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "granted_at"?: string,"role": string,"user_id": string
                  }
                  Update: {
                    "granted_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_roles_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_list_users":
{ Args: { "p_limit"?: number,"p_offset"?: number,"p_search"?: string }; Returns: {
              "account_type": Database["public"]['Enums']["account_type"],"created_at": string,"hidden_reason": string,"id": string,"is_admin": boolean,"is_demo": boolean,"is_hidden": boolean,"last_active_at": string,"open_reports": number,"provider_name": string,"provider_published": boolean,"status": Database["public"]['Enums']["account_status"],"total_count": number,"username": string
            }[]
                           },
"admin_report_queue":
{ Args: { "p_status"?: Database["public"]['Enums']["report_status"] }; Returns: {
              "details": (string)[],"first_reported_at": string,"is_hidden": boolean,"link_path": string,"owner_username": string,"preview": string,"reasons": (string)[],"report_count": number,"target_id": string,"target_owner_id": string,"target_type": Database["public"]['Enums']["report_target"]
            }[]
                           },
"admin_resolve_appeal":
{ Args: { "p_accept": boolean,"p_appeal_id": string,"p_note"?: string }; Returns: undefined
                           },
"admin_resolve_reports":
{ Args: { "p_decision": Database["public"]['Enums']["report_status"],"p_note"?: string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"admin_set_content_hidden":
{ Args: { "p_hidden": boolean,"p_reason": string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"admin_set_user_status":
{ Args: { "p_reason": string,"p_status": Database["public"]['Enums']["account_status"],"p_user_id": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"cancel_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"cancel_mission":
{ Args: { "p_mission_id": string,"p_reason"?: string }; Returns: undefined
                           },
"change_username":
{ Args: { "p_new_username": string }; Returns: undefined
                           },
"check_username":
{ Args: { "p_username": string }; Returns: string
                           },
"complete_mission":
{ Args: { "p_mission_id": string }; Returns: undefined
                           },
"confirm_adult":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"confirm_mission":
{ Args: { "p_mission_id": string }; Returns: undefined
                           },
"create_listing":
{ Args: { "p_budget_xpf"?: number,"p_category_ids": (number)[],"p_commune_id": number,"p_date_mode"?: Database["public"]['Enums']["date_mode"],"p_description": string,"p_desired_date"?: string,"p_publish"?: boolean,"p_title": string }; Returns: string
                           },
"decline_mission":
{ Args: { "p_mission_id": string,"p_reason"?: string }; Returns: undefined
                           },
"decline_proposal":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           },
"delete_my_account":
{ Args: { "p_confirm_username": string }; Returns: undefined
                           },
"export_my_data":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"mark_conversation_read":
{ Args: { "p_conversation_id": string }; Returns: undefined
                           },
"mark_notifications_read":
{ Args: { "p_ids"?: (string)[] }; Returns: undefined
                           },
"my_conversations":
{ Args: Record<PropertyKey, never>; Returns: {
              "id": string,"last_message_at": string,"last_message_preview": string,"last_sender_id": string,"listing_id": string,"listing_title": string,"other_avatar_path": string,"other_display_name": string,"other_is_provider": boolean,"other_user_id": string,"other_username": string,"unread_count": number
            }[]
                           },
"my_hidden_content":
{ Args: Record<PropertyKey, never>; Returns: {
              "appeal_status": string,"hidden_reason": string,"label": string,"target_id": string,"target_type": Database["public"]['Enums']["report_target"]
            }[]
                           },
"publish_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"renew_listing":
{ Args: { "p_listing_id": string }; Returns: undefined
                           },
"report_content":
{ Args: { "p_details"?: string,"p_reason": Database["public"]['Enums']["report_reason"],"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"search_providers":
{ Args: { "p_availability"?: Database["public"]['Enums']["availability"],"p_category_id"?: number,"p_commune_id"?: number,"p_limit"?: number,"p_offset"?: number,"p_query"?: string,"p_trade_id"?: number }; Returns: {
              "availability": Database["public"]['Enums']["availability"],"avatar_path": string,"commune_id": number,"commune_name": string,"excerpt": string,"id": string,"is_demo": boolean,"main_trade_id": number,"main_trade_name": string,"public_name": string,"score": number,"total_count": number,"username": string
            }[]
                           },
"select_proposal":
{ Args: { "p_proposal_id": string }; Returns: string
                           },
"start_conversation":
{ Args: { "p_provider_id": string }; Returns: string
                           },
"submit_appeal":
{ Args: { "p_message": string,"p_target_id": string,"p_target_type": Database["public"]['Enums']["report_target"] }; Returns: undefined
                           },
"submit_proposal":
{ Args: { "p_listing_id": string,"p_message": string,"p_price_xpf"?: number }; Returns: string
                           },
"touch_activity":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"unread_messages_count":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"update_listing":
{ Args: { "p_budget_xpf"?: number,"p_category_ids": (number)[],"p_commune_id": number,"p_date_mode"?: Database["public"]['Enums']["date_mode"],"p_description": string,"p_desired_date"?: string,"p_listing_id": string,"p_title": string }; Returns: undefined
                           },
"withdraw_proposal":
{ Args: { "p_proposal_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"suspended","account_type": "client"|"provider","availability": "available"|"busy"|"unavailable","date_mode": "asap"|"precise"|"flexible","listing_status": "draft"|"published"|"in_discussion"|"awaiting_confirmation"|"assigned"|"completed"|"expired"|"cancelled","mission_status": "awaiting_provider"|"confirmed"|"completed"|"declined"|"cancelled","proposal_status": "pending"|"selected"|"accepted"|"declined"|"withdrawn"|"not_selected"|"cancelled","report_reason": "fraud"|"harassment"|"spam"|"forbidden"|"impersonation"|"other","report_status": "open"|"upheld"|"dismissed","report_target": "profile"|"listing"|"message"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "account_status": ["active", "suspended"],"account_type": ["client", "provider"],"availability": ["available", "busy", "unavailable"],"date_mode": ["asap", "precise", "flexible"],"listing_status": ["draft", "published", "in_discussion", "awaiting_confirmation", "assigned", "completed", "expired", "cancelled"],"mission_status": ["awaiting_provider", "confirmed", "completed", "declined", "cancelled"],"proposal_status": ["pending", "selected", "accepted", "declined", "withdrawn", "not_selected", "cancelled"],"report_reason": ["fraud", "harassment", "spam", "forbidden", "impersonation", "other"],"report_status": ["open", "upheld", "dismissed"],"report_target": ["profile", "listing", "message"]
          }
        }
} as const
