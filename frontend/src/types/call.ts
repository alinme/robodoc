export interface CallRecord {
  contact_id: number;
  name: string;
  phone: string;
  group_id: number | null;
  group_name?: string | null;
  business: string | null;
  call_count: number;
  observations: string | null;
  last_called_at: string | null;
  last_call_type: 'phone' | 'whatsapp' | null;
}


