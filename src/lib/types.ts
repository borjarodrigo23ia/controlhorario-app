// ============================================================================
// INTERFACES PRINCIPALES DEL SISTEMA (ADAPTADO PARA LOGIN-APP)
// ============================================================================

export interface User {
  id: string;
  login: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  user_mobile?: string;
  entity: string;
  statut?: string;
  status?: string;
  dolapikey?: string;
  admin?: boolean;
  workplace_center_id?: number | string;
  work_centers_ids?: string;
  permissions?: any[];
  array_options?: {
    options_dni?: string | null;
    options_naf?: string | null;
    // Add other custom fields here if needed
    [key: string]: any;
  };
}

export type FichajeTipo = 'entrar' | 'salir' | 'pausa' | 'finp' | 'iniciar_pausa' | 'terminar_pausa';
export type FichajeState = 'sin_iniciar' | 'trabajando' | 'en_pausa' | 'finalizado';

export interface Fichaje {
  id: string;
  usuario: string;
  tipo: FichajeTipo;
  fecha_creacion: string;
  fecha_original?: string; // Original time before correction (legal compliance)
  comentario?: string;
  observaciones?: string;
  latitud?: string;
  longitud?: string;
  fk_user?: string;
  usuario_nombre?: string;
  estado_aceptacion?: 'pendiente' | 'aceptado' | 'rechazado';
  location_warning?: number;
  early_entry_warning?: number;
  justification?: string;
}

export interface FichajeFilter {
  tipo?: FichajeTipo | 'todos';
  usuario?: string;
  startDate?: string;
  endDate?: string;
}

// Interfaz para ciclos de trabajo
export interface WorkCycle {
  id?: string;
  entrada: {
    fecha_creacion: string;
    fecha_original?: string;
    id: string;
    tipo: 'entrar';
    usuario: string;
    usuario_nombre?: string;
    observaciones?: string;
    latitud?: string;
    longitud?: string;
    estado_aceptacion?: 'pendiente' | 'aceptado' | 'rechazado';
    location_warning?: number;
    early_entry_warning?: number;
    justification?: string;
  };
  salida?: {
    fecha_creacion: string;
    fecha_original?: string;
    id: string;
    tipo: 'salir';
    usuario: string;
    observaciones?: string;
    latitud?: string;
    longitud?: string;
    estado_aceptacion?: 'pendiente' | 'aceptado' | 'rechazado';
    location_warning?: number;
    early_entry_warning?: number;
    justification?: string;
  };
  pausas: Array<{
    inicio?: {
      fecha_creacion: string;
      fecha_original?: string;
      id: string;
      tipo: 'iniciar_pausa' | 'pausa';
      usuario: string;
      observaciones?: string;
      latitud?: string;
      longitud?: string;
      estado_aceptacion?: 'pendiente' | 'aceptado' | 'rechazado';
      location_warning?: number;
      early_entry_warning?: number;
      justification?: string;
    };
    fin?: {
      fecha_creacion: string;
      fecha_original?: string;
      id: string;
      tipo: 'terminar_pausa' | 'finp';
      usuario: string;
      observaciones?: string;
      latitud?: string;
      longitud?: string;
      estado_aceptacion?: 'pendiente' | 'aceptado' | 'rechazado';
      location_warning?: number;
      early_entry_warning?: number;
      justification?: string;
    };
  }>;
  fecha: string;
  fk_user?: string;
  duracion_total?: number;
  duracion_pausas?: number;
  duracion_efectiva?: number;
}

export interface AuditLog {
  id_log: string;
  id_fichaje: string;
  usuario_editor: string;
  usuario_nombre: string;
  fecha_modificacion: string;
  campo_modificado: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  comentario: string;
}
export interface BreakPeriod {
  id?: number;
  hora_inicio: string;
  hora_fin: string;
  descripcion?: string;
  orden?: number;
}

export interface Shift {
  id: number;
  fk_user: number;
  tipo_jornada: 'intensiva' | 'partida';
  tipo_turno: 'fijo' | 'rotativo';
  hora_inicio_jornada: string;
  hora_fin_jornada: string;
  pausas: BreakPeriod[];
  observaciones?: string;
  active: number;
}
