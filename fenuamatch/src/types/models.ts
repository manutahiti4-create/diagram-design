import type { Database } from './database';

type Tables = Database['public']['Tables'];
type Enums = Database['public']['Enums'];
type Functions = Database['public']['Functions'];

export type Profile = Tables['profiles']['Row'];
export type ProfilePrivate = Tables['profile_private']['Row'];
export type ProviderProfile = Tables['provider_profiles']['Row'];
export type ProviderPhoto = Tables['provider_photos']['Row'];
export type Commune = Tables['communes']['Row'];
export type Category = Tables['categories']['Row'];
export type Trade = Tables['trades']['Row'];
export type Listing = Tables['listings']['Row'];
export type ListingPhoto = Tables['listing_photos']['Row'];
export type Proposal = Tables['proposals']['Row'];
export type Mission = Tables['missions']['Row'];
export type Message = Tables['messages']['Row'];
export type Notification = Tables['notifications']['Row'];
export type Report = Tables['reports']['Row'];
export type Appeal = Tables['moderation_appeals']['Row'];
export type AuditEntry = Tables['admin_audit_log']['Row'];

export type AccountType = Enums['account_type'];
export type AccountStatus = Enums['account_status'];
export type Availability = Enums['availability'];
export type ListingStatus = Enums['listing_status'];
export type ProposalStatus = Enums['proposal_status'];
export type MissionStatus = Enums['mission_status'];
export type DateMode = Enums['date_mode'];
export type ReportTarget = Enums['report_target'];
export type ReportReason = Enums['report_reason'];
export type ReportStatus = Enums['report_status'];

export type ProviderSearchResult = Functions['search_providers']['Returns'][number];
export type ConversationSummary = Functions['my_conversations']['Returns'][number];
export type AdminUserRow = Functions['admin_list_users']['Returns'][number];
export type ReportQueueItem = Functions['admin_report_queue']['Returns'][number];
export type HiddenContent = Functions['my_hidden_content']['Returns'][number];

export interface AdminStats {
  accounts: number;
  clients: number;
  providers: number;
  published_providers: number;
  listings: number;
  active_listings: number;
  confirmed_missions: number;
  open_reports: number;
  open_appeals: number;
  suspended_accounts: number;
}
