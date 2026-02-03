export interface Rule {
  id: number;
  name: string;
  description: string | null;
  condition_type: string;
  column_name: string;
  operator: 'exists' | 'not_empty' | 'empty' | 'equals' | 'contains' | 'not_contains';
  value: string | null;
  is_active: boolean;
  created_at: string;
}

