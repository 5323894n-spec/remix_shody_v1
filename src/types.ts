export type Criticality = 'Низкая' | 'Средняя' | 'Высокая' | 'Критическая' | 'Требует проверки';
export type IncidentStatus = 'закрыт' | 'открыт' | 'требует проверки';

export interface Incident {
  id: number;
  incident_date: string; // YYYY-MM-DD
  weekday: string;
  column_number: string;
  route_number: string;
  run_number: string;
  vehicle_number: string;
  driver_tab_number: string;
  driver_name: string;
  departure_time: string;
  incident_report_time: string;
  return_to_depot_time: string;
  restart_time: string;
  original_reason: string;
  breakdown_code: string;
  breakdown_category: string;
  breakdown_name: string;
  criticality: Criticality;
  note: string;
  health_reason: string;
  dispatcher_name: string;
  status: IncidentStatus;
  source_file: string;
}

export interface Breakdown {
  id: number;
  breakdown_code: string;
  category: string;
  breakdown_name: string;
  keywords: string;
  criticality: Criticality;
  responsible_department: string;
  status: 'активная' | 'архивная';
}

export interface Driver {
  id: number;
  tab_number: string;
  name: string;
}

export interface Dispatcher {
  id: number;
  tab_number: string;
  name: string;
}

export interface Vehicle {
  id: number;
  vehicle_number: string;
  model: string;
  bus_class: string; // 'большой' | 'средний' | 'малый'
}

export type UserRole = 'admin' | 'dispatcher' | 'viewer' | 'manager';

export interface User {
  id: number;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  object_type: string;
  object_id: string;
  details: string;
}

export interface Backup {
  id: number;
  filename: string;
  timestamp: string;
  size: string;
  records_count: number;
}
