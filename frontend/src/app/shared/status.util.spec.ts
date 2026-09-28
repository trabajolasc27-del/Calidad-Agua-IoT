import { describe, expect, it } from 'vitest';

import { alertSeverityStatus, alertStatusMeta, deviceStatusMeta, evaluationStatus } from './status.util';

// Pruebas de la logica pura de mapeo de estados -> tono/icono/etiqueta que
// usan Dashboard, Historial, Alertas, Reportes, Dispositivos y
// Administracion. Al ser funciones puras (sin Supabase ni Angular de por
// medio), no requieren TestBed ni mocks -- se prueban directamente.
describe('status.util', () => {
  it('evaluationStatus mapea cada resultado al tono correcto', () => {
    expect(evaluationStatus('CONFORME').tone).toBe('ok');
    expect(evaluationStatus('ALERTA').tone).toBe('warn');
    expect(evaluationStatus('CRITICO').tone).toBe('crit');
    expect(evaluationStatus(null).tone).toBe('neutral');
    expect(evaluationStatus(undefined).label).toBe('Sin evaluar');
  });

  it('alertSeverityStatus distingue Alerta de Critico', () => {
    expect(alertSeverityStatus('ALERTA').tone).toBe('warn');
    expect(alertSeverityStatus('CRITICO').tone).toBe('crit');
  });

  it('alertStatusMeta cubre las 4 etapas del flujo en español', () => {
    expect(alertStatusMeta('NUEVA').label).toBe('Nueva');
    expect(alertStatusMeta('RECONOCIDA').label).toBe('Reconocida');
    expect(alertStatusMeta('ATENDIDA').label).toBe('Atendida');
    expect(alertStatusMeta('CERRADA').label).toBe('Cerrada');
  });

  it('deviceStatusMeta distingue activo de inactivo', () => {
    expect(deviceStatusMeta('activo').tone).toBe('ok');
    expect(deviceStatusMeta('inactivo').tone).toBe('neutral');
  });
});
