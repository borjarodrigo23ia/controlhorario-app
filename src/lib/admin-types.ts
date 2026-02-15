
export interface CorrectionRequest {
    rowid: string;
    fk_user: string;
    firstname?: string;
    lastname?: string;
    login?: string;
    fecha_jornada: string; // YYYY-MM-DD
    hora_entrada: string;
    hora_entrada_original?: string;
    hora_salida: string;
    hora_salida_original?: string;
    pausas: Array<{
        inicio_iso: string,
        fin_iso: string,
        original_inicio_iso?: string,
        original_fin_iso?: string
    }>;
    observaciones: string;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    date_creation: string;
    fk_approver?: string;
    date_approval?: string;
    admin_note?: string;
    fk_creator?: string;
}

export interface UserConfig {
    require_geolocation?: string;
    schedule_type?: 'intensiva' | 'partida';
    shift_type?: 'fijo' | 'rotativo';
    work_hours_daily?: string;
    entry_time_margin?: string;
    logout_after_clock?: string;
}


export interface DolibarrUser {
    id: string;
    login: string;
    firstname: string;
    lastname: string;
    active: string;
    admin: string;
    email?: string;
    user_mobile?: string;
    office_phone?: string;
    note_private?: string;
}
