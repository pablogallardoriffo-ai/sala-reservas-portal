-- ============================================================
-- DUOC UC · Portal de Salas — Schema para Supabase
-- ============================================================
-- Pegar todo este archivo en: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- USUARIOS DE LA APLICACIÓN (no usa Supabase Auth, autenticación en capa app)
CREATE TABLE IF NOT EXISTS app_users (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT UNIQUE NOT NULL,
  nombre      TEXT NOT NULL,
  email       TEXT,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('admin','reservador','usuario')),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- CATÁLOGO DE SALAS
CREATE TABLE IF NOT EXISTS salas (
  codigo       TEXT PRIMARY KEY,
  nombre       TEXT,
  capacidad    INT,
  tipo         TEXT,
  responsable  TEXT,
  activa       BOOLEAN DEFAULT TRUE,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- MÓDULOS HORARIOS
CREATE TABLE IF NOT EXISTS modulos (
  num     INT PRIMARY KEY,
  inicio  TEXT NOT NULL,
  fin     TEXT NOT NULL
);

-- PROGRAMACIÓN ACADÉMICA (SABANA)
CREATE TABLE IF NOT EXISTS programacion (
  id   BIGSERIAL PRIMARY KEY,
  s    TEXT,           -- sala (código aula)
  a    TEXT,           -- asignatura
  sc   TEXT,           -- sección
  d    TEXT,           -- docente
  es   TEXT,           -- escuela (3 letras)
  j    TEXT,           -- jornada (D/V)
  n    TEXT,           -- nivel (SABANA col L)
  hi   TEXT,           -- hora inicio HH:MM
  hf   TEXT,           -- hora fin    HH:MM
  dw   CHAR(7),        -- dias semana bits LMMJVSD
  i    INT,            -- inscritos
  p    INT             -- plazas disponibles
);
CREATE INDEX IF NOT EXISTS idx_prog_s ON programacion(s);

-- EVENTOS (LISTA DE RECURSOS) — una fila por clase real con fecha exacta
-- Complementa el patrón semanal de `programacion` con sesiones por fecha.
CREATE TABLE IF NOT EXISTS eventos (
  id   BIGSERIAL PRIMARY KEY,
  s    TEXT,           -- sala (código, col D del Excel)
  sc   TEXT,           -- sección (col A, ej. "RMC1102-001")
  tr   TEXT,           -- tipo de recurso descriptivo (col B)
  de   TEXT,           -- denominación del evento (col K)
  ev   TEXT,           -- código de evento (col N)
  fi   DATE,           -- fecha de la clase (col F = G)
  hi   TEXT,           -- hora inicio HH:MM (col H)
  hf   TEXT            -- hora fin    HH:MM (col I)
);
CREATE INDEX IF NOT EXISTS idx_eventos_fi_s ON eventos(fi, s);
CREATE INDEX IF NOT EXISTS idx_eventos_sc   ON eventos(sc);

-- JEFATURAS DOCENTES — mapeo docente → jefe directo (lo carga el admin)
CREATE TABLE IF NOT EXISTS docente_jefes (
  id          BIGSERIAL PRIMARY KEY,
  docente     TEXT NOT NULL,    -- nombre completo (matchea con programacion.d)
  jefe        TEXT NOT NULL,    -- nombre del jefe
  jefe_correo TEXT,             -- opcional
  escuela     TEXT              -- escuela (3 letras)
);
CREATE INDEX IF NOT EXISTS idx_dj_docente ON docente_jefes(docente);

-- RESERVAS
CREATE TABLE IF NOT EXISTS reservas (
  id            BIGSERIAL PRIMARY KEY,
  fi            DATE NOT NULL,
  ff            DATE,
  hi            TEXT,
  hf            TEXT,
  mi            INT,
  mf            INT,
  r             TEXT NOT NULL,        -- recinto
  ts            TEXT DEFAULT 'NO',    -- todo el semestre
  mo            TEXT,                 -- motivo
  observacion   TEXT,
  "do"          TEXT,                 -- docente (entre comillas porque DO es palabra reservada)
  ru            TEXT,                 -- rut
  co            TEXT,                 -- correo
  es            TEXT DEFAULT 'pendiente' CHECK (es IN ('pendiente','aprobada','rechazada')),
  creado_por    TEXT,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  decidido_por  TEXT,
  decidido_en   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_reservas_fi_r ON reservas(fi, r);
CREATE INDEX IF NOT EXISTS idx_reservas_es   ON reservas(es);

-- ============================================================
-- DATOS INICIALES (usuarios demo + módulos)
-- ============================================================
INSERT INTO app_users (username, nombre, email, password, role) VALUES
  ('admin',      'Coordinación Docente · Jefe de Área', 'admin@duoc.cl',     '010203', 'admin'),
  ('reservador', 'Asistente de Coordinación Docente',   'reservas@duoc.cl',  '010203', 'reservador'),
  ('usuario',    'Usuario de la Sede',                  'consulta@duoc.cl',  '010203', 'usuario')
ON CONFLICT (username) DO NOTHING;

INSERT INTO modulos (num, inicio, fin) VALUES
  (1,'08:01','08:40'),  (2,'08:41','09:20'),  (3,'09:31','10:10'),  (4,'10:11','10:50'),
  (5,'11:01','11:40'),  (6,'11:41','12:20'),  (7,'12:31','13:10'),  (8,'13:11','13:50'),
  (9,'14:01','14:40'),  (10,'14:41','15:20'), (11,'15:31','16:10'), (12,'16:11','16:50'),
  (13,'17:01','17:40'), (14,'17:41','18:20'), (15,'18:21','19:00'), (16,'19:01','19:40'),
  (17,'19:41','20:20'), (18,'20:31','21:10'), (19,'21:11','21:50'), (20,'21:50','22:30')
ON CONFLICT (num) DO NOTHING;

-- ============================================================
-- RLS (Row Level Security) — política abierta para anon key
-- La autenticación se valida en la capa de aplicación
-- Para producción: implementar Supabase Auth + políticas por rol
-- ============================================================
ALTER TABLE app_users     ENABLE ROW LEVEL SECURITY;
ALTER TABLE salas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE programacion  ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE docente_jefes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS allow_all ON app_users;
DROP POLICY IF EXISTS allow_all ON salas;
DROP POLICY IF EXISTS allow_all ON modulos;
DROP POLICY IF EXISTS allow_all ON programacion;
DROP POLICY IF EXISTS allow_all ON eventos;
DROP POLICY IF EXISTS allow_all ON docente_jefes;
DROP POLICY IF EXISTS allow_all ON reservas;

CREATE POLICY allow_all ON app_users     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON salas         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON modulos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON programacion  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON eventos       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON docente_jefes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY allow_all ON reservas      FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- MIGRACIONES IDEMPOTENTES (para BD ya creada)
-- ============================================================
ALTER TABLE programacion ADD COLUMN IF NOT EXISTS n TEXT;

-- ============================================================
-- REAL-TIME: replicación para que todos los clientes vean cambios al instante
-- ============================================================
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reservas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE salas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
