-- Update script to add missing columns to fichajestrabajadores_corrections table
-- Run this on production if the approve/reject functionality fails

-- Add fk_approver column if it doesn't exist
ALTER TABLE llx_fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS fk_approver INTEGER NULL;

-- Add date_approval column if it doesn't exist
ALTER TABLE llx_fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS date_approval DATETIME NULL;

-- Add date_creation column if it doesn't exist
ALTER TABLE llx_fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS date_creation DATETIME NULL;

-- Update date_creation for any existing records without it
UPDATE llx_fichajestrabajadores_corrections SET date_creation = tms WHERE date_creation IS NULL;

-- Add admin_note column for approve/reject comments
ALTER TABLE llx_fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS admin_note TEXT NULL;
