export interface Message {
  id: number;
  contact_id: number | null;
  group_id: number | null;
  template: string;
  final_message: string;
  sent_at: string | null;
  status: 'pending' | 'sent' | 'failed';
  error_message: string | null;
  contact_name?: string;
  phone?: string;
  group_name?: string;
}

