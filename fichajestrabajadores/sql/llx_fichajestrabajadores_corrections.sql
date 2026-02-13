CREATE TABLE llx_fichajestrabajadores_corrections(
    rowid INTEGER AUTO_INCREMENT PRIMARY KEY,
    fk_user INTEGER NOT NULL,
    fecha_jornada DATE NOT NULL,
    hora_entrada DATETIME,
    hora_salida DATETIME,
    pausas TEXT, -- JSON array of pauses
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, aprobada, rechazada
    fk_approver INTEGER,
    date_approval DATETIME,
    admin_note TEXT,
    date_creation DATETIME NOT NULL,
    tms TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fichajestrabajadores_corrections_user FOREIGN KEY (fk_user) REFERENCES llx_user(rowid)
) ENGINE=innodb;
