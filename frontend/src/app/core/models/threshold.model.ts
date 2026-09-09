// Refleja public.thresholds (ver docs/DATABASE_DESIGN.md 3.7).

export interface Threshold {
  id: string;
  parameter_id: string;
  version: number;
  critical_low: number | null;
  warning_low: number | null;
  warning_high: number | null;
  critical_high: number | null;
  consecutive_breaches_to_alert: number;
  is_active: boolean;
  is_demo: boolean;
  created_by: string | null;
  created_at: string;
}
