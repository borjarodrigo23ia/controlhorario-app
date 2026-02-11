-- Add columns for Geolocation Compliance and Validation (2026)
ALTER TABLE llx_fichajestrabajadores ADD COLUMN location_warning TINYINT DEFAULT 0;
ALTER TABLE llx_fichajestrabajadores ADD COLUMN justification TEXT DEFAULT NULL;
ALTER TABLE llx_fichajestrabajadores ADD COLUMN early_entry_warning TINYINT DEFAULT 0;
ALTER TABLE llx_fichajestrabajadores ADD COLUMN workplace_center_id INTEGER DEFAULT NULL;
