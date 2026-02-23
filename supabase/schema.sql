-- ============================================
-- Control Horario App — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. EMPRESAS (Multi-tenancy)
CREATE TABLE companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PERFILES DE USUARIO
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id),
    username TEXT NOT NULL,
    firstname TEXT,
    lastname TEXT,
    email TEXT,
    user_mobile TEXT,
    dni TEXT,
    naf TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    pin TEXT,
    push_subscriptions JSONB DEFAULT '{"subscriptions":[]}'::jsonb,
    push_preferences JSONB DEFAULT '{"fichajes":true,"vacaciones":true,"cambios":true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_profiles_username_company ON profiles(username, company_id);
CREATE INDEX idx_profiles_company ON profiles(company_id);

-- 3. FICHAJES (Tabla principal)
CREATE TABLE fichajes (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    tipo VARCHAR(20) NOT NULL,
    observaciones TEXT,
    latitud DECIMAL(10,7),
    longitud DECIMAL(10,7),
    hash_integridad VARCHAR(64),
    estado_aceptacion VARCHAR(20) DEFAULT 'aceptado',
    location_warning SMALLINT DEFAULT 0,
    early_entry_warning SMALLINT DEFAULT 0,
    justification TEXT,
    fecha_original TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fichajes_company ON fichajes(company_id);
CREATE INDEX idx_fichajes_user ON fichajes(user_id);
CREATE INDEX idx_fichajes_created ON fichajes(created_at DESC);
CREATE INDEX idx_fichajes_user_created ON fichajes(user_id, created_at DESC);

-- 4. FICHAJES LOG (Auditoría)
CREATE TABLE fichajes_log (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    fichaje_id BIGINT REFERENCES fichajes(id) ON DELETE CASCADE,
    jornada_id BIGINT,
    editor_id UUID NOT NULL REFERENCES auth.users(id),
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior TEXT,
    valor_nuevo TEXT,
    comentario TEXT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CENTROS DE TRABAJO
CREATE TABLE centers (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    label VARCHAR(128) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius INTEGER DEFAULT 100,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_centers_company ON centers(company_id);

-- 6. CORRECCIONES
CREATE TABLE corrections (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fecha_jornada DATE NOT NULL,
    hora_entrada TIMESTAMPTZ,
    hora_salida TIMESTAMPTZ,
    pausas JSONB,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente',
    approver_id UUID REFERENCES auth.users(id),
    date_approval TIMESTAMPTZ,
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_corrections_company ON corrections(company_id);
CREATE INDEX idx_corrections_estado ON corrections(estado);

-- 7. CONFIGURACIÓN GLOBAL (por empresa)
CREATE TABLE config (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    param_name VARCHAR(50) NOT NULL,
    param_value TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, param_name)
);

-- 8. CONFIGURACIÓN POR USUARIO
CREATE TABLE user_config (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    param_name VARCHAR(50) NOT NULL,
    param_value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, param_name)
);

-- 9. VACACIONES
CREATE TABLE vacaciones (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    comentarios TEXT,
    aprobado_por UUID REFERENCES auth.users(id),
    fecha_aprobacion TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vacaciones_company ON vacaciones(company_id);
CREATE INDEX idx_vacaciones_user ON vacaciones(user_id);
CREATE INDEX idx_vacaciones_estado ON vacaciones(estado);

-- 10. CUOTA DE VACACIONES
CREATE TABLE vacaciones_dias (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    anio SMALLINT NOT NULL,
    dias INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, anio)
);

-- 11. JORNADAS LABORALES
CREATE TABLE jornadas_laborales (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    tipo_jornada VARCHAR(20) NOT NULL,
    tipo_turno VARCHAR(20) NOT NULL,
    hora_inicio_jornada TIME NOT NULL,
    hora_fin_jornada TIME NOT NULL,
    observaciones TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PAUSAS DE JORNADA
CREATE TABLE jornadas_pausas (
    id BIGSERIAL PRIMARY KEY,
    jornada_id BIGINT NOT NULL REFERENCES jornadas_laborales(id) ON DELETE CASCADE,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    descripcion VARCHAR(100),
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. JORNADAS COMPLETAS (Resumen diario)
CREATE TABLE jornadas_completas (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fecha DATE NOT NULL,
    hora_entrada TIMESTAMPTZ NOT NULL,
    hora_salida TIMESTAMPTZ NOT NULL,
    total_pausa INTERVAL DEFAULT '00:00:00',
    total_trabajo INTERVAL NOT NULL,
    observaciones TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. ORIGINALES MODIFICADOS (Legal compliance)
CREATE TABLE fichajes_originales_modificados (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    jornada_id BIGINT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    fecha DATE NOT NULL,
    hora_entrada TIMESTAMPTZ NOT NULL,
    hora_salida TIMESTAMPTZ NOT NULL,
    total_pausa INTERVAL DEFAULT '00:00:00',
    total_trabajo INTERVAL NOT NULL,
    observaciones TEXT,
    modified_by UUID NOT NULL REFERENCES auth.users(id),
    comentario_modificacion TEXT NOT NULL,
    revision INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. FESTIVOS
CREATE TABLE holidays (
    id BIGSERIAL PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES companies(id),
    date DATE NOT NULL,
    name TEXT NOT NULL,
    region TEXT,
    UNIQUE(company_id, date)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichajes_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacaciones_dias ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas_laborales ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas_pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas_completas ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichajes_originales_modificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION public.get_my_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    FALSE
  )
$$;

-- ── PROFILES ──
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can view all company profiles"
    ON profiles FOR SELECT
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "Admins can manage company profiles"
    ON profiles FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── FICHAJES ──
CREATE POLICY "Users can view own fichajes"
    ON fichajes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can view all company fichajes"
    ON fichajes FOR SELECT
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

CREATE POLICY "Users can insert own fichajes"
    ON fichajes FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND company_id = public.get_my_company_id()
    );

CREATE POLICY "Admins can manage company fichajes"
    ON fichajes FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── CENTERS ──
CREATE POLICY "Company members can view centers"
    ON centers FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage centers"
    ON centers FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── CORRECTIONS ──
CREATE POLICY "Users can view own corrections"
    ON corrections FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own corrections"
    ON corrections FOR INSERT
    WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage company corrections"
    ON corrections FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── CONFIG ──
CREATE POLICY "Company members can view config"
    ON config FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage config"
    ON config FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── USER CONFIG ──
CREATE POLICY "Users can view own config"
    ON user_config FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user config"
    ON user_config FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── VACACIONES ──
CREATE POLICY "Users can view own vacaciones"
    ON vacaciones FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create own vacaciones"
    ON vacaciones FOR INSERT
    WITH CHECK (user_id = auth.uid() AND company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage company vacaciones"
    ON vacaciones FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── VACACIONES DIAS ──
CREATE POLICY "Users can view own quota"
    ON vacaciones_dias FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage vacation quotas"
    ON vacaciones_dias FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── JORNADAS LABORALES ──
CREATE POLICY "Users can view own jornadas"
    ON jornadas_laborales FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage company jornadas"
    ON jornadas_laborales FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── JORNADAS PAUSAS ──
CREATE POLICY "Users can view pausas of own jornadas"
    ON jornadas_pausas FOR SELECT
    USING (
        jornada_id IN (
            SELECT id FROM jornadas_laborales WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage jornadas pausas"
    ON jornadas_pausas FOR ALL
    USING (
        jornada_id IN (
            SELECT id FROM jornadas_laborales
            WHERE company_id = public.get_my_company_id()
        )
        AND public.get_my_is_admin()
    );

-- ── JORNADAS COMPLETAS ──
CREATE POLICY "Users can view own jornadas completas"
    ON jornadas_completas FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage jornadas completas"
    ON jornadas_completas FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── FICHAJES LOG ──
CREATE POLICY "Admins can view company audit log"
    ON fichajes_log FOR SELECT
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

CREATE POLICY "Admins can insert audit log"
    ON fichajes_log FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id());

-- ── FICHAJES ORIGINALES MODIFICADOS ──
CREATE POLICY "Admins can view modified originals"
    ON fichajes_originales_modificados FOR SELECT
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

CREATE POLICY "Admins can insert modified originals"
    ON fichajes_originales_modificados FOR INSERT
    WITH CHECK (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── HOLIDAYS ──
CREATE POLICY "Company members can view holidays"
    ON holidays FOR SELECT
    USING (company_id = public.get_my_company_id());

CREATE POLICY "Admins can manage holidays"
    ON holidays FOR ALL
    USING (company_id = public.get_my_company_id() AND public.get_my_is_admin());

-- ── COMPANIES ──
CREATE POLICY "Members can view own company"
    ON companies FOR SELECT
    USING (id = public.get_my_company_id());

CREATE POLICY "Admins can update own company"
    ON companies FOR UPDATE
    USING (id = public.get_my_company_id() AND public.get_my_is_admin());

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON corrections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON user_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON vacaciones_dias
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON jornadas_laborales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON jornadas_completas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
