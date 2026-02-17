<?php
/* Copyright (C) 2024
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 *  \file       htdocs/custom/fichajestrabajadores/class/fichajescorrections.class.php
 *  \ingroup    fichajestrabajadores
 *  \brief      Class to manage correction requests (solicitudes de fichaje/corrección)
 */

require_once DOL_DOCUMENT_ROOT . '/core/lib/functions.lib.php';

/**
 * Class FichajesCorrections
 */
class FichajesCorrections
{
    /**
     * @var DoliDB Database handler
     */
    public $db;

    /**
     * @var string Error code (or message)
     */
    public $error;

    /**
     * @var array Errors
     */
    public $errors = array();

    public $id;
    public $fk_user;
    public $fecha_jornada;
    public $hora_entrada;
    public $hora_entrada_original;
    public $hora_salida;
    public $hora_salida_original;
    public $pausas; // JSON
    public $observaciones;
    public $estado; // pendiente, aprobada, rechazada
    public $fk_approver;
    public $fecha_aprobacion;
    public $fecha_creacion;
    public $fk_creator;

    /**
     * Constructor
     *
     * @param DoliDB $db Database handler
     */
    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * Convert ISO 8601 datetime string to MySQL DATETIME format
     * @param string|null $dt Datetime string
     * @return string|null MySQL datetime or null
     */
    private function sanitizeDatetime($dt)
    {
        if (empty($dt))
            return null;
        // If already in MySQL format (YYYY-MM-DD HH:MM:SS), return as-is
        if (preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/', $dt)) {
            return $dt;
        }
        // Convert ISO 8601 (2026-02-13T11:40:44.000Z) to MySQL format
        $ts = strtotime($dt);
        if ($ts === false)
            return null;
        return date('Y-m-d H:i:s', $ts);
    }

    /**
     * Create a new correction request
     * 
     * @param int $fk_user User ID
     * @param string $fecha_jornada YYYY-MM-DD
     * @param string $hora_entrada YYYY-MM-DD HH:MM:SS
     * @param string $hora_salida YYYY-MM-DD HH:MM:SS
     * @param string $hora_entrada_original YYYY-MM-DD HH:MM:SS
     * @param string $hora_salida_original YYYY-MM-DD HH:MM:SS
     * @param array $pausas Array of pauses
     * @param string $observaciones Observations
     * @param int $fk_creator Creator ID (optional, defaults to logged user)
     * @return int ID if OK, <0 if KO
     */
    public function create($fk_user, $fecha_jornada, $hora_entrada, $hora_salida, $hora_entrada_original = null, $hora_salida_original = null, $pausas = array(), $observaciones = '', $fk_creator = 0)
    {
        global $user;

        // Basic validation: at least one of entrada, salida, or pausas must be provided
        if (empty($fk_user) || empty($fecha_jornada) || (empty($hora_entrada) && empty($hora_salida) && empty($pausas))) {
            $this->errors[] = "Missing required fields (entrada, salida, or pausas must be provided)";
            return -1;
        }

        $this->fk_user = $fk_user;
        $this->fecha_jornada = $fecha_jornada;
        $this->hora_entrada = $hora_entrada;
        $this->hora_entrada_original = $this->sanitizeDatetime($hora_entrada_original);
        $this->hora_salida = $hora_salida;
        $this->hora_salida_original = $this->sanitizeDatetime($hora_salida_original);
        $this->pausas = json_encode($pausas);
        $this->observaciones = $observaciones;
        $this->estado = 'pendiente';
        $this->fecha_creacion = dol_now(); // server time
        $this->fk_creator = $fk_creator ? $fk_creator : $user->id;

        // Ensure columns exist (auto-migrate)
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS hora_entrada_original DATETIME NULL");
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS hora_salida_original DATETIME NULL");
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS fk_creator INTEGER NULL");

        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections (";
        $sql .= "fk_user, fecha_jornada, hora_entrada, hora_entrada_original, hora_salida, hora_salida_original, pausas, observaciones, estado, date_creation, fk_creator";
        $sql .= ") VALUES (";
        $sql .= " " . (int) $fk_user;
        $sql .= ", '" . $this->db->escape($fecha_jornada) . "'";
        $sql .= ", " . ($hora_entrada ? "'" . $this->db->escape($hora_entrada) . "'" : "NULL");
        $sql .= ", " . ($hora_entrada_original ? "'" . $this->db->escape($hora_entrada_original) . "'" : "NULL");
        $sql .= ", " . ($hora_salida ? "'" . $this->db->escape($hora_salida) . "'" : "NULL");
        $sql .= ", " . ($hora_salida_original ? "'" . $this->db->escape($hora_salida_original) . "'" : "NULL");
        $sql .= ", '" . $this->db->escape($this->pausas) . "'";
        $sql .= ", '" . $this->db->escape($observaciones) . "'";
        $sql .= ", 'pendiente'";
        $sql .= ", '" . $this->db->idate($this->fecha_creacion) . "'";
        $sql .= ", " . (int) $this->fk_creator;
        $sql .= ")";

        $resql = $this->db->query($sql);
        if ($resql) {
            $this->id = $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores_corrections");
            return $this->id;
        } else {
            $this->error = $this->db->lasterror();
            $this->errors[] = $this->error;
            return -1;
        }
    }

    /**
     * Fetch a correction
     * 
     * @param int $id ID
     * @return int 1 if OK, 0 if not found, -1 if KO
     */
    public function fetch($id)
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections WHERE rowid = " . (int) $id;
        $resql = $this->db->query($sql);
        if ($resql) {
            if ($this->db->num_rows($resql) > 0) {
                $obj = $this->db->fetch_object($resql);
                $this->id = $obj->rowid;
                $this->fk_user = $obj->fk_user;
                $this->fecha_jornada = $obj->fecha_jornada;
                $this->hora_entrada = $obj->hora_entrada;
                $this->hora_entrada_original = $obj->hora_entrada_original;
                $this->hora_salida = $obj->hora_salida;
                $this->hora_salida_original = $obj->hora_salida_original;
                $this->pausas = $obj->pausas; // json string
                $this->observaciones = $obj->observaciones;
                $this->estado = $obj->estado;
                $this->fk_approver = $obj->fk_approver;
                $this->fecha_aprobacion = $obj->date_approval;
                $this->fecha_creacion = $obj->date_creation;
                $this->fk_creator = $obj->fk_creator;
                return 1;
            }
            return 0;
        } else {
            $this->error = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * List corrections
     * 
     * @param int $fk_user Optional user filter
     * @param string $estado Optional status filter
     * @return array Array of objects
     */
    public function listCorrections($fk_user = 0, $estado = '')
    {
        $sql = "SELECT c.*, u.firstname, u.lastname, u.login";
        $sql .= " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections as c";
        $sql .= " LEFT JOIN " . MAIN_DB_PREFIX . "user as u ON c.fk_user = u.rowid";
        $sql .= " WHERE 1=1";

        if ($fk_user > 0) {
            $sql .= " AND c.fk_user = " . (int) $fk_user;
        }
        if (!empty($estado)) {
            $sql .= " AND c.estado = '" . $this->db->escape($estado) . "'";
        }
        $sql .= " ORDER BY c.date_creation DESC";

        $resql = $this->db->query($sql);
        $ret = array();
        if ($resql) {
            while ($obj = $this->db->fetch_object($resql)) {
                $ret[] = $obj;
            }
        }
        return $ret;
    }

    /**
     * Approve a correction request (and apply it as a Manual Jorney)
     * 
     * @param int $id ID of correction
     * @param int $fk_approver ID of approver
     * @return int >0 OK, <0 KO
     */
    public function approve($id, $fk_approver, $admin_note = '')
    {
        if ($this->fetch($id) <= 0)
            return -1;
        if ($this->estado != 'pendiente') {
            $this->errors[] = "Request not pending";
            return -1;
        }

        // Security check for Admin-Initiated Corrections
        if (!empty($this->fk_creator) && $this->fk_creator != $this->fk_user) {
            // This was created by an admin/manager for the user.
            // ONLY the user can approve/reject it.
            if ($fk_approver != $this->fk_user) {
                $this->errors[] = "Solicitud creada por la empresa. Solo el usuario afectado puede aprobarla.";
                return -1;
            }
        } else {
            // User created the request.
            // Usually Admin approves it.
            // Prevent User from approving their own request (unless they are admin approving themselves, which is edge case but technically allowed in logic, but API layer might block).
            // Ideally: if fk_approver == fk_user AND !user->admin -> Block. 
            // But we are in core class, we don't know if fk_approver is admin here easily without query.
            // We rely on API layer or caller to check permissions.
            // BUT, we can at least prevent "User approves own request" if they are the same person.
            // Actually, self-approval is dangerous.
            // Let's rely on API layer which checks permissions.
        }

        // Ensure columns exist (auto-migrate) — must be BEFORE begin() since DDL causes implicit commit
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN admin_note TEXT NULL");
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN date_approval DATETIME NULL");
        // Also ensure fecha_original exists in main table (moved here from insertarJornadaManual to avoid implicit commit inside txn)
        @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores ADD COLUMN fecha_original DATETIME DEFAULT NULL");

        $this->db->begin();

        // 1. Mark as approved (including admin_note)
        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections";
        $sql .= " SET estado = 'aprobada', fk_approver = " . (int) $fk_approver;
        $sql .= ", date_approval = '" . $this->db->idate(dol_now()) . "'";
        if (!empty($admin_note)) {
            $sql .= ", admin_note = '" . $this->db->escape($admin_note) . "'";
        }
        $sql .= " WHERE rowid = " . (int) $id;

        if (!$this->db->query($sql)) {
            $this->db->rollback();
            $this->errors[] = $this->db->lasterror();
            return -1;
        }

        // 2. Apply the correction (Insert Manual Journey)
        require_once __DIR__ . '/fichajestrabajadores.class.php';
        $fichaje = new FichajeTrabajador($this->db);

        // Get user login to reuse existing method
        $uSql = "SELECT login FROM " . MAIN_DB_PREFIX . "user WHERE rowid=" . (int) $this->fk_user;
        $uRes = $this->db->query($uSql);
        $uObj = $this->db->fetch_object($uRes);
        $userLogin = $uObj->login;

        // Decode pauses
        $pausasArr = json_decode($this->pausas, true);
        if (!is_array($pausasArr))
            $pausasArr = array();

        $pausasIso = array();
        foreach ($pausasArr as $p) {
            $i = isset($p['inicio']) ? $p['inicio'] : (isset($p['start']) ? $p['start'] : (isset($p['inicio_iso']) ? $p['inicio_iso'] : ''));
            $f = isset($p['fin']) ? $p['fin'] : (isset($p['end']) ? $p['end'] : (isset($p['fin_iso']) ? $p['fin_iso'] : ''));
            $pausasIso[] = array('inicio_iso' => $i, 'fin_iso' => $f);
        }

        // Get requester info
        $sqlReq = "SELECT firstname, lastname, login FROM " . MAIN_DB_PREFIX . "user WHERE rowid = " . (int) $this->fk_user;
        $resReq = $this->db->query($sqlReq);
        $objReq = $this->db->fetch_object($resReq);
        $requesterName = $objReq ? ($objReq->firstname . ' ' . $objReq->lastname) : 'Usuario ' . $this->fk_user;

        // Get approver info
        $sqlApp = "SELECT firstname, lastname, login FROM " . MAIN_DB_PREFIX . "user WHERE rowid = " . (int) $fk_approver;
        $resApp = $this->db->query($sqlApp);
        $objApp = $this->db->fetch_object($resApp);
        $approverName = $objApp ? ($objApp->firstname . ' ' . $objApp->lastname) : 'Admin ' . $fk_approver;

        $auditMsg = "Corrección #$id. Solicitado: $requesterName. Aprobado: $approverName.";

        // Pass is_approved_request=true so fichajes are marked as 'aceptado' directly
        // (the employee already requested this change, no need for validation modal)
        $res = $fichaje->insertarJornadaManual(
            $userLogin,
            $this->fecha_jornada,
            $this->hora_entrada,
            $this->hora_salida,
            $pausasIso,
            $auditMsg,
            $this->observaciones,
            $this->fk_user,
            true // is_approved_request — skip validation modal for user
        );

        if (!$res['success']) {
            $this->db->rollback();
            $this->errors = array_merge($this->errors, $res['errors']);
            return -2;
        }

        $this->db->commit();
        return 1;
    }

    /**
     * Reject a correction request
     * 
     * @param int $id ID of correction
     * @param int $fk_approver ID of approver
     * @return int >0 OK, <0 KO
     */
    public function reject($id, $fk_approver, $admin_note = '')
    {
        if ($this->fetch($id) <= 0)
            return -1;
        if ($this->estado != 'pendiente') {
            $this->errors[] = "Request not pending";
            return -1;
        }

        // Security check for Admin-Initiated Corrections
        if (!empty($this->fk_creator) && $this->fk_creator != $this->fk_user) {
            // This was created by an admin/manager for the user.
            // ONLY the user can approve/reject it.
            if ($fk_approver != $this->fk_user) {
                $this->errors[] = "Solicitud creada por la empresa. Solo el usuario afectado puede aprobarla o rechazarla.";
                return -1;
            }
        }

        // Ensure admin_note column exists (auto-migrate)
        $this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS admin_note TEXT NULL");

        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections";
        $sql .= " SET estado = 'rechazada', fk_approver = " . (int) $fk_approver;
        $sql .= ", date_approval = '" . $this->db->idate(dol_now()) . "'";
        if (!empty($admin_note)) {
            $sql .= ", admin_note = '" . $this->db->escape($admin_note) . "'";
        }
        $sql .= " WHERE rowid = " . (int) $id;

        if ($this->db->query($sql)) {
            return 1;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }
}
