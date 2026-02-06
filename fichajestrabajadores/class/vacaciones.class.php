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
 *  \file       htdocs/custom/fichajestrabajadores/class/vacaciones.class.php
 *  \ingroup    fichajestrabajadores
 *  \brief      Clase para gestionar vacaciones en el módulo de fichajes
 */

require_once DOL_DOCUMENT_ROOT . '/core/lib/functions.lib.php';

/**
 * Clase para gestionar vacaciones
 */
class Vacaciones
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

    /**
     * @var string ID
     */
    public $id;

    /**
     * @var string Usuario
     */
    public $usuario;

    /**
     * @var string Fecha de inicio
     */
    public $fecha_inicio;

    /**
     * @var string Fecha de fin
     */
    public $fecha_fin;

    /**
     * @var string Estado
     */
    public $estado;

    /**
     * @var string Comentarios
     */
    public $comentarios;

    /**
     * @var string Tipo de ausencia
     */
    public $tipo;

    /**
     * @var string Usuario que aprobó
     */
    public $aprobado_por;

    /**
     * @var string Fecha de aprobación
     */
    public $fecha_aprobacion;

    /**
     * @var string Fecha de creación
     */
    public $fecha_creacion;

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
     * Registrar una nueva solicitud de vacaciones
     *
     * @param string $usuario Usuario que solicita
     * @param string $fecha_inicio Fecha de inicio (YYYY-MM-DD)
     * @param string $fecha_fin Fecha de fin (YYYY-MM-DD)
     * @param string $comentarios Comentarios opcionales
     * @param string $tipo Tipo de ausencia (vacaciones, enfermedad, asuntos_propios)
     * @return int ID de la solicitud creada o -1 si error
     */
    public function registrarVacaciones($usuario, $fecha_inicio, $fecha_fin, $comentarios = '', $tipo = 'vacaciones')
    {
        global $langs, $conf;

        error_log("DEBUG: registrarVacaciones llamado con usuario: $usuario, inicio: $fecha_inicio, fin: $fecha_fin");

        // Validaciones
        if (empty($usuario)) {
            error_log("ERROR: Usuario vacío");
            $this->errors[] = $langs->trans("ErrorUsuarioObligatorio");
            return -1;
        }

        if (empty($fecha_inicio) || empty($fecha_fin)) {
            error_log("ERROR: Fechas vacías - inicio: '$fecha_inicio', fin: '$fecha_fin'");
            $this->errors[] = $langs->trans("ErrorFechasObligatorias");
            return -1;
        }

        // Verificar que la fecha fin es posterior a la fecha inicio
        $fecha_inicio_ts = strtotime($fecha_inicio);
        $fecha_fin_ts = strtotime($fecha_fin);

        error_log("DEBUG: Timestamp inicio: $fecha_inicio_ts, Timestamp fin: $fecha_fin_ts");

        if ($fecha_fin_ts < $fecha_inicio_ts) {
            error_log("ERROR: Fecha fin anterior a fecha inicio");
            $this->errors[] = $langs->trans("ErrorFechaFinAnterior");
            return -1;
        }

        // Verificar que no hay solapamiento con otras solicitudes del mismo usuario
        $sql = "SELECT COUNT(*) as total FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE usuario = '" . $this->db->escape($usuario) . "'";
        $sql .= " AND estado IN ('pendiente', 'aprobado')";
        $sql .= " AND (";
        $sql .= "   (fecha_inicio <= '" . $this->db->escape($fecha_inicio) . "' AND fecha_fin >= '" . $this->db->escape($fecha_inicio) . "')";
        $sql .= "   OR (fecha_inicio <= '" . $this->db->escape($fecha_fin) . "' AND fecha_fin >= '" . $this->db->escape($fecha_fin) . "')";
        $sql .= "   OR (fecha_inicio >= '" . $this->db->escape($fecha_inicio) . "' AND fecha_fin <= '" . $this->db->escape($fecha_fin) . "')";
        $sql .= " )";

        error_log("DEBUG: SQL de verificación de solapamiento: $sql");

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            error_log("DEBUG: Resultado de verificación de solapamiento: " . $obj->total);
            if ($obj->total > 0) {
                error_log("ERROR: Solapamiento detectado");
                $this->errors[] = "Ya tienes una solicitud de vacaciones en esas fechas. Por favor, verifica tu historial.";
                return -1;
            }
        } else {
            error_log("ERROR: Fallo en consulta de verificación de solapamiento: " . $this->db->lasterror());
        }

        // Comprobar que no excede los días de vacaciones asignados por año
        // 1) Obtener el ID de usuario a partir del login
        $fk_user = 0;
        $sqlUser = "SELECT rowid FROM " . MAIN_DB_PREFIX . "user WHERE login = '" . $this->db->escape($usuario) . "'";
        $resUser = $this->db->query($sqlUser);
        if ($resUser && ($objUser = $this->db->fetch_object($resUser))) {
            $fk_user = (int) $objUser->rowid;
        }

        if ($fk_user > 0) {
            $startYear = (int) date('Y', $fecha_inicio_ts);
            $endYear = (int) date('Y', $fecha_fin_ts);

            for ($year = $startYear; $year <= $endYear; $year++) {
                $yearStart = $year . "-01-01";
                $yearEnd = $year . "-12-31";

                // Días solicitados en este año (intersección con el rango de la solicitud)
                $rangeStart = max(strtotime($fecha_inicio), strtotime($yearStart));
                $rangeEnd = min(strtotime($fecha_fin), strtotime($yearEnd));
                $requestedDaysThisYear = 0;
                if ($rangeEnd >= $rangeStart) {
                    $requestedDaysThisYear = (int) floor(($rangeEnd - $rangeStart) / 86400) + 1; // +1 para incluir ambos días
                }

                if ($requestedDaysThisYear <= 0) {
                    continue; // No afecta a este año
                }

                // 2) Días asignados para este usuario y año (si no existe, 0)
                $sqlAssigned = "SELECT dias FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones_dias WHERE fk_user = " . (int) $fk_user . " AND anio = " . (int) $year . " AND entity = " . (int) $conf->entity;
                $assignedDays = 0;
                $resAssigned = $this->db->query($sqlAssigned);
                if ($resAssigned && ($objAssign = $this->db->fetch_object($resAssigned))) {
                    $assignedDays = (int) $objAssign->dias;
                }

                // 3) Días ya consumidos/pendientes en este año por el usuario
                $sqlUsed = "SELECT SUM( DATEDIFF(LEAST(fecha_fin, '" . $this->db->escape($yearEnd) . "'), GREATEST(fecha_inicio, '" . $this->db->escape($yearStart) . "')) + 1 ) AS usedDays"
                    . " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones"
                    . " WHERE usuario = '" . $this->db->escape($usuario) . "'"
                    . " AND estado IN ('pendiente','aprobado')"
                    . " AND fecha_fin >= '" . $this->db->escape($yearStart) . "'"
                    . " AND fecha_inicio <= '" . $this->db->escape($yearEnd) . "'";

                $usedDays = 0;
                $resUsed = $this->db->query($sqlUsed);
                if ($resUsed && ($objUsed = $this->db->fetch_object($resUsed))) {
                    $usedDays = (int) max(0, (int) $objUsed->usedDays);
                }

                // Si no hay días asignados, o si se excede, bloquear
                if ($assignedDays <= 0) {
                    $this->errors[] = "No tienes días de vacaciones asignados para el año $year. Por favor, contacta con administración.";
                    return -1;
                }

                if (($usedDays + $requestedDaysThisYear) > $assignedDays) {
                    $available = $assignedDays - $usedDays;
                    $this->errors[] = "No tienes suficientes días disponibles para el año $year. Tienes $available días disponibles pero solicitas $requestedDaysThisYear días.";
                    return -1;
                }
            }
        }

        // Insertar la solicitud
        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " (usuario, fecha_inicio, fecha_fin, estado, tipo, comentarios, fecha_creacion)";
        $sql .= " VALUES";
        $sql .= " ('" . $this->db->escape($usuario) . "',";
        $sql .= " '" . $this->db->escape($fecha_inicio) . "',";
        $sql .= " '" . $this->db->escape($fecha_fin) . "',";
        $sql .= " 'pendiente',";
        $sql .= " '" . $this->db->escape($tipo) . "',";
        if (!empty($comentarios)) {
            $comentarios = "- usuario: " . $comentarios;
        }
        $sql .= " '" . $this->db->escape($comentarios) . "',";
        $sql .= " NOW())";

        error_log("DEBUG: SQL de inserción: $sql");

        $result = $this->db->query($sql);
        if ($result) {
            $id = $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones");
            error_log("SUCCESS: Solicitud creada con ID: $id");
            return $id;
        } else {
            error_log("ERROR: Fallo en inserción: " . $this->db->lasterror());
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Crear una nueva solicitud de vacaciones
     *
     * @return int ID de la solicitud creada o -1 si error
     */
    public function create()
    {
        global $langs, $conf;

        // Validaciones
        if (empty($this->usuario)) {
            $this->errors[] = $langs->trans("ErrorUsuarioObligatorio");
            return -1;
        }

        if (empty($this->fecha_inicio) || empty($this->fecha_fin)) {
            $this->errors[] = $langs->trans("ErrorFechasObligatorias");
            return -1;
        }

        // Verificar que la fecha fin es posterior a la fecha inicio
        $fecha_inicio_ts = strtotime($this->fecha_inicio);
        $fecha_fin_ts = strtotime($this->fecha_fin);

        if ($fecha_fin_ts < $fecha_inicio_ts) {
            $this->errors[] = $langs->trans("ErrorFechaFinAnterior");
            return -1;
        }

        // Reglas: no exceder días asignados
        $usuarioLogin = $this->usuario;
        $fk_user = 0;
        $sqlUser = "SELECT rowid FROM " . MAIN_DB_PREFIX . "user WHERE login = '" . $this->db->escape($usuarioLogin) . "'";
        $resUser = $this->db->query($sqlUser);
        if ($resUser && ($objUser = $this->db->fetch_object($resUser))) {
            $fk_user = (int) $objUser->rowid;
        }

        if ($fk_user > 0) {
            $startYear = (int) date('Y', strtotime($this->fecha_inicio));
            $endYear = (int) date('Y', strtotime($this->fecha_fin));
            for ($year = $startYear; $year <= $endYear; $year++) {
                $yearStart = $year . "-01-01";
                $yearEnd = $year . "-12-31";
                $rangeStart = max(strtotime($this->fecha_inicio), strtotime($yearStart));
                $rangeEnd = min(strtotime($this->fecha_fin), strtotime($yearEnd));
                $requestedDaysThisYear = 0;
                if ($rangeEnd >= $rangeStart) {
                    $requestedDaysThisYear = (int) floor(($rangeEnd - $rangeStart) / 86400) + 1;
                }
                if ($requestedDaysThisYear <= 0)
                    continue;

                $sqlAssigned = "SELECT dias FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones_dias WHERE fk_user = " . (int) $fk_user . " AND anio = " . (int) $year . " AND entity = " . (int) $conf->entity;
                $assignedDays = 0;
                $resAssigned = $this->db->query($sqlAssigned);
                if ($resAssigned && ($objAssign = $this->db->fetch_object($resAssigned))) {
                    $assignedDays = (int) $objAssign->dias;
                }

                $sqlUsed = "SELECT SUM( DATEDIFF(LEAST(fecha_fin, '" . $this->db->escape($yearEnd) . "'), GREATEST(fecha_inicio, '" . $this->db->escape($yearStart) . "')) + 1 ) AS usedDays"
                    . " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones"
                    . " WHERE usuario = '" . $this->db->escape($usuarioLogin) . "'"
                    . " AND estado IN ('pendiente','aprobado')"
                    . " AND fecha_fin >= '" . $this->db->escape($yearStart) . "'"
                    . " AND fecha_inicio <= '" . $this->db->escape($yearEnd) . "'";
                $usedDays = 0;
                $resUsed = $this->db->query($sqlUsed);
                if ($resUsed && ($objUsed = $this->db->fetch_object($resUsed))) {
                    $usedDays = (int) max(0, (int) $objUsed->usedDays);
                }
                if ($assignedDays <= 0 || ($usedDays + $requestedDaysThisYear) > $assignedDays) {
                    $this->errors[] = $langs->trans('SolicitudExcedeDiasAsignados', $year);
                    return -1;
                }
            }
        }

        // Insertar la solicitud
        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " (usuario, fecha_inicio, fecha_fin, estado, tipo, comentarios, fecha_creacion)";
        $sql .= " VALUES";
        $sql .= " ('" . $this->db->escape($this->usuario) . "',";
        $sql .= " '" . $this->db->escape($this->fecha_inicio) . "',";
        $sql .= " '" . $this->db->escape($this->fecha_fin) . "',";
        $sql .= " '" . $this->db->escape($this->estado ? $this->estado : 'pendiente') . "',";
        $sql .= " '" . $this->db->escape($this->tipo ? $this->tipo : 'vacaciones') . "',";
        $sql .= " '" . $this->db->escape($this->comentarios) . "',";
        $sql .= " NOW())";

        $result = $this->db->query($sql);
        if ($result) {
            $this->id = $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones");
            return $this->id;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Obtener todas las solicitudes de vacaciones
     *
     * @param string $filtro_estado Filtrar por estado
     * @param string $filtro_usuario Filtrar por usuario
     * @return array Array con las solicitudes
     */
    public function getAllVacaciones($filtro_estado = '', $filtro_usuario = '')
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE 1 = 1";

        if (!empty($filtro_estado)) {
            $sql .= " AND estado = '" . $this->db->escape($filtro_estado) . "'";
        }

        if (!empty($filtro_usuario)) {
            $sql .= " AND usuario = '" . $this->db->escape($filtro_usuario) . "'";
        }

        $sql .= " ORDER BY fecha_creacion DESC";

        $result = $this->db->query($sql);
        if ($result) {
            $vacaciones = array();
            while ($obj = $this->db->fetch_object($result)) {
                $vacaciones[] = $obj;
            }
            return $vacaciones;
        } else {
            $this->errors[] = $this->db->lasterror();
            return array();
        }
    }

    /**
     * Obtener una solicitud de vacaciones por ID
     *
     * @param int $id ID de la solicitud
     * @return object Objeto con los datos de la solicitud o null si no existe
     */
    public function getVacacionesById($id)
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            return $obj;
        } else {
            $this->errors[] = $this->db->lasterror();
            return null;
        }
    }

    /**
     * Cargar una solicitud de vacaciones por ID
     *
     * @param int $id ID de la solicitud
     * @return int 1 si éxito, 0 si no encontrado, -1 si error
     */
    public function fetch($id)
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            if ($obj) {
                $this->id = $obj->rowid;
                $this->usuario = $obj->usuario;
                $this->fecha_inicio = $obj->fecha_inicio;
                $this->fecha_fin = $obj->fecha_fin;
                $this->estado = $obj->estado;
                $this->tipo = $obj->tipo;
                $this->comentarios = $obj->comentarios;
                $this->aprobado_por = $obj->aprobado_por;
                $this->fecha_aprobacion = $obj->fecha_aprobacion;
                $this->fecha_creacion = $obj->fecha_creacion;
                return 1;
            } else {
                return 0;
            }
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Aprobar una solicitud de vacaciones
     *
     * @param int $id ID de la solicitud
     * @param string $supervisor Usuario que aprueba
     * @param string $comentarios Comentarios de aprobación
     * @return int 1 si éxito, -1 si error
     */
    public function aprobarSolicitud($id, $supervisor, $comentarios = '')
    {
        global $langs;

        // Verificar que la solicitud existe y está pendiente
        $sql = "SELECT estado FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            if (!$obj) {
                $this->errors[] = $langs->trans("ErrorSolicitudNoExiste");
                return -1;
            }
            if ($obj->estado != 'pendiente') {
                $this->errors[] = $langs->trans("ErrorSolicitudNoPendiente");
                return -1;
            }
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }

        // Actualizar la solicitud
        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " SET estado = 'aprobado',";
        $sql .= " aprobado_por = '" . $this->db->escape($supervisor) . "',";
        $sql .= " fecha_aprobacion = NOW()";
        if (!empty($comentarios)) {
            $sql .= ", comentarios = CONCAT(comentarios, '\n- administrador: " . $this->db->escape($comentarios) . " (Aprobado por " . $this->db->escape($supervisor) . ")')";
        }
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            return 1;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Rechazar una solicitud de vacaciones
     *
     * @param int $id ID de la solicitud
     * @param string $supervisor Usuario que rechaza
     * @param string $comentarios Comentarios de rechazo
     * @return int 1 si éxito, -1 si error
     */
    public function rechazarSolicitud($id, $supervisor, $comentarios = '')
    {
        global $langs;

        // Verificar que la solicitud existe y está pendiente
        $sql = "SELECT estado FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            if (!$obj) {
                $this->errors[] = $langs->trans("ErrorSolicitudNoExiste");
                return -1;
            }
            if ($obj->estado != 'pendiente') {
                $this->errors[] = $langs->trans("ErrorSolicitudNoPendiente");
                return -1;
            }
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }

        // Actualizar la solicitud
        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " SET estado = 'rechazado',";
        $sql .= " aprobado_por = '" . $this->db->escape($supervisor) . "',";
        $sql .= " fecha_aprobacion = NOW()";
        if (!empty($comentarios)) {
            $sql .= ", comentarios = CONCAT(comentarios, '\n- administrador: " . $this->db->escape($comentarios) . " (Rechazado por " . $this->db->escape($supervisor) . ")')";
        }
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            return 1;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Modificar una solicitud de vacaciones
     *
     * @param int $id ID de la solicitud
     * @param string $fecha_inicio Nueva fecha de inicio
     * @param string $fecha_fin Nueva fecha de fin
     * @param string $comentarios Nuevos comentarios
     * @return int 1 si éxito, -1 si error
     */
    public function modificarSolicitud($id, $fecha_inicio, $fecha_fin, $comentarios = '')
    {
        global $langs;

        // Verificar que la solicitud existe y está pendiente
        $sql = "SELECT estado FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            if (!$obj) {
                $this->errors[] = $langs->trans("ErrorSolicitudNoExiste");
                return -1;
            }
            if ($obj->estado != 'pendiente') {
                $this->errors[] = $langs->trans("ErrorSoloModificarPendientes");
                return -1;
            }
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }

        // Validar fechas
        if (empty($fecha_inicio) || empty($fecha_fin)) {
            $this->errors[] = $langs->trans("ErrorFechasObligatorias");
            return -1;
        }

        $fecha_inicio_ts = strtotime($fecha_inicio);
        $fecha_fin_ts = strtotime($fecha_fin);

        if ($fecha_fin_ts < $fecha_inicio_ts) {
            $this->errors[] = $langs->trans("ErrorFechaFinAnterior");
            return -1;
        }

        // Actualizar la solicitud
        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " SET fecha_inicio = '" . $this->db->escape($fecha_inicio) . "',";
        $sql .= " fecha_fin = '" . $this->db->escape($fecha_fin) . "'";
        if (!empty($comentarios)) {
            $sql .= ", comentarios = '" . $this->db->escape($comentarios) . "'";
        }
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            return 1;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }

    /**
     * Eliminar una solicitud de vacaciones
     *
     * @param int $id ID de la solicitud
     * @return int 1 si éxito, -1 si error
     */
    public function eliminarSolicitud($id)
    {
        global $langs;

        // Verificar que la solicitud existe y está pendiente
        $sql = "SELECT estado FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            $obj = $this->db->fetch_object($result);
            if (!$obj) {
                $this->errors[] = $langs->trans("ErrorSolicitudNoExiste");
                return -1;
            }
            if ($obj->estado != 'pendiente') {
                $this->errors[] = $langs->trans("ErrorSoloEliminarPendientes");
                return -1;
            }
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }

        // Eliminar la solicitud
        $sql = "DELETE FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_vacaciones";
        $sql .= " WHERE rowid = " . (int) $id;

        $result = $this->db->query($sql);
        if ($result) {
            return 1;
        } else {
            $this->errors[] = $this->db->lasterror();
            return -1;
        }
    }
}