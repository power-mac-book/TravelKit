export interface Destination {
  id: number;
  name: string;
  slug: string;
  description?: string;
  location: string;
  country: string;
  base_price: number;
  max_discount: number;
  discount_per_member: number;
  image_url?: string;
  gallery?: string[];
  itinerary?: any;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  interest_summary?: InterestSummary;
}

export interface InterestSummary {
  total_interested_last_30_days: number;
  next_30_day_count: number;
  recent_names_sample: string;
}

export interface Interest {
  id: number;
  destination_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  num_people: number;
  date_from: string;
  date_to: string;
  budget_min?: number;
  budget_max?: number;
  special_requests?: string;
  client_uuid: string;
  status: string;
  group_id?: number;
  created_at: string;
  updated_at?: string;
}

export interface InterestCreate {
  destination_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  num_people: number;
  date_from: string;
  date_to: string;
  budget_min?: number;
  budget_max?: number;
  special_requests?: string;
  client_uuid: string;
}

export interface CalendarData {
  date: string;
  count: number;
}

export interface CalendarResponse {
  month: string;
  data: CalendarData[];
}

export interface HomepageMessage {
  id: number;
  destination_id: number;
  message_type: string;
  title: string;
  message: string;
  cta_text?: string;
  cta_link?: string;
  priority: number;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface Group {
  id: number;
  destination_id: number;
  name: string;
  date_from: string;
  date_to: string;
  min_size: number;
  max_size: number;
  current_size: number;
  base_price: number;
  final_price_per_person: number;
  price_calc?: any;
  status: string;
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}