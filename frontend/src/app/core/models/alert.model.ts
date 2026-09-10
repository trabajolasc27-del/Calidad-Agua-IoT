export type AlertSeverity = 'WARNING' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'ATTENDED' | 'CLOSED';

export interface DashboardAlert {
  id: string;
  parameter_name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  opened_at: string;
}

export interface Alert {
  id: string;
  device_id: string;
  parameter_id: string;
  severity: AlertSeverity;
  status: AlertStatus;
  opened_at: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  attended_at: string | null;
  attended_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
  follow_up_comment: string | null;
  devices: { code: string; name: string } | null;
  parameters: { name: string; unit: string } | null;
}

export interface AlertHistoryEntry {
  id: string;
  from_status: AlertStatus | null;
  to_status: AlertStatus;
  comment: string | null;
  changed_at: string;
  profiles: { full_name: string | null } | null;
}
