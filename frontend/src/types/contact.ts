export interface Contact {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  group_id: number | null;
  group_name?: string;
  business: string | null;
  source_file: string | null;
  raw_data: string | null;
  created_at: string;
  updated_at: string;
  sent_count?: number;
  whatsapp_valid?: number | null; // 0 = invalid, 1 = valid, null = not checked
  whatsapp_in_contacts?: number | null; // 0 = no, 1 = yes, null = not checked
  whatsapp_validated_at?: string | null;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  contactCount?: number;
}

