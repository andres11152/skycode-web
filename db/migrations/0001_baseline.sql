-- Congela el esquema que hasta ahora creaba initAuthDatabase() en tiempo de
-- request (ver src/lib/auth.ts antes de esta migración). Idempotente: usa
-- IF NOT EXISTS en todo, así corre igual sobre una base nueva que sobre la
-- base de producción existente sin duplicar ni fallar.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  service VARCHAR(255),
  budget VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'COP',
  estimated_weeks INTEGER DEFAULT 4,
  message TEXT,
  notes TEXT DEFAULT '',
  source VARCHAR(100) DEFAULT 'Cotizador Interactivo',
  status VARCHAR(50) DEFAULT 'Nuevo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  client_email VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  repo_url VARCHAR(255),
  staging_url VARCHAR(255),
  sla_warranty_start DATE,
  sla_warranty_end DATE,
  status VARCHAR(50) DEFAULT 'En Desarrollo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sprints (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pendiente',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
