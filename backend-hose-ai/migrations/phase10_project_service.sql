-- Phase 10: Project & Service Module Tables

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'NEW', -- NEW, IN_PROGRESS, COMPLETED, CANCELLED
    start_date DATE,
    end_date DATE,
    total_value DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Work Orders (SPK - Surat Perintah Kerja)
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    technician_name VARCHAR(100) NOT NULL, -- Free text for now if no User model
    task_name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_PROGRESS, COMPLETED, ON_HOLD
    priority VARCHAR(20) DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
    scheduled_date DATE,
    completion_date DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. SPPD (Surat Perintah Perjalanan Dinas)
CREATE TABLE IF NOT EXISTS project_sppd (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    technician_name VARCHAR(100) NOT NULL,
    destination VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    transport_cost DECIMAL(15, 2) DEFAULT 0,
    accommodation_cost DECIMAL(15, 2) DEFAULT 0,
    meal_allowance DECIMAL(15, 2) DEFAULT 0,
    other_cost DECIMAL(15, 2) DEFAULT 0,
    total_cost DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, APPROVED, REIMBURSED
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Daily Reports (Laporan Harian Lapangan)
CREATE TABLE IF NOT EXISTS project_daily_reports (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    technician_name VARCHAR(100) NOT NULL,
    activity_description TEXT NOT NULL,
    challenges TEXT,
    materials_used TEXT,
    progress_percentage INTEGER CHECK (progress_percentage BETWEEN 0 AND 100),
    image_path VARCHAR(500), -- For photo evidence
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Commissioning (Berita Acara)
CREATE TABLE IF NOT EXISTS project_commissioning (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    document_number VARCHAR(100),
    client_evaluator VARCHAR(100), -- Client representative name
    evaluation_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    notes TEXT,
    signature_image_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_project_id ON work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_sppd_project_id ON project_sppd(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_project_id ON project_daily_reports(project_id);
