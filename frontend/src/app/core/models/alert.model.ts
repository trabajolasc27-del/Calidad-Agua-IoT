export type AlertSeverity = 'WARNING' | 'CRITICAL';
export type AlertStatus = 'NEW' | 'ACKNOWLEDGED' | 'ATTENDED' | 'CLOSED';

export interface DashboardAlert {
  id: string;
  parameter_name: string;
  severity: AlertSeverity;
  status: AlertStatus;
  opened_at: string;
}
