export type CityType = 'urban' | 'rural' | 'urban-small' | 'urban-large';
export type OrderStatus = 'draft' | 'planned' | 'in-progress' | 'completed' | 'cancelled';

export interface Order {
  id: number;
  name: string;
  delivery_month: string | null;
  delivery_year: number | null;
  status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  school_count?: number;
  structure_count?: number;
  total_kits?: number;
}

export type DeliveryStatus = 'planned' | 'in-transit' | 'delivered' | 'completed';

export interface School {
  id: number;
  order_id: number;
  name: string;
  address: string;
  city: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  kits_count: number;
  city_type: CityType | null;
  latitude: number | null;
  longitude: number | null;
  is_standalone: boolean;
  delivery_group_id: number | null;
  delivery_status: DeliveryStatus;
  delivery_notes: string | null;
  route_order: number | null;
  scheduled_start_time: string | null;
  document_check_duration: number | null;
  distribution_duration: number | null;
  scheduled_end_time: string | null;
  protocol_number: string | null;
  kits_delivered: boolean;
  created_at: string;
  updated_at: string;
  calculated_kits?: number;
  structure_count?: number;
  structures?: Structure[];
  delivery_group_name?: string | null;
}

export interface Structure {
  id: number;
  school_id: number;
  name: string;
  address: string | null;
  kits_count: number;
  latitude: number | null;
  longitude: number | null;
  in_same_building: boolean;
  scheduled_start_time: string | null;
  document_check_duration: number | null;
  distribution_duration: number | null;
  scheduled_end_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryGroup {
  id: number;
  order_id: number;
  name: string;
  description: string | null;
  delivery_date: string | null;
  delivery_hour: string | null;
  start_address: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  fuel_type: string | null;
  fuel_cost_per_liter: number | null;
  total_km: number | null;
  two_way_km: number | null;
  calculated_distance_km: number | null;
  fuel_consumption: number | null;
  average_speed_kmh: number | null;
  created_at: string;
  updated_at: string;
  school_count?: number;
  total_kits?: number;
}

export interface OrderWithDetails extends Order {
  schools: School[];
  delivery_groups: DeliveryGroup[];
}

