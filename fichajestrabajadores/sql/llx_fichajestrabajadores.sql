-- Copyright (C) 2024
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see http://www.gnu.org/licenses/.

CREATE TABLE llx_fichajestrabajadores(
    -- BEGIN MODULEBUILDER FIELDS
    rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) DEFAULT 'USUARIO' NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    observaciones VARCHAR(255) DEFAULT NULL,
    latitud DECIMAL(10,7) DEFAULT NULL,
    longitud DECIMAL(10,7) DEFAULT NULL,
    hash_integridad VARCHAR(64) DEFAULT NULL,
    estado_aceptacion VARCHAR(20) DEFAULT 'aceptado', -- aceptado, pendiente, rechazado
    fecha_original DATETIME DEFAULT NULL, -- Original time before correction (legal compliance)
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
    -- END MODULEBUILDER FIELDS
) ENGINE=innodb; 