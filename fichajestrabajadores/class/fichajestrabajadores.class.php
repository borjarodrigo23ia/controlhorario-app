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
 *  \file       htdocs/custom/fichajestrabajadores/class/fichajestrabajadores.class.php
 *  \ingroup    fichajestrabajadores
 *  \brief      Clase para gestionar fichajes de trabajadores
 */

require_once DOL_DOCUMENT_ROOT . '/core/lib/functions.lib.php';
require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/jornadalaboral.class.php';
require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadores_centers.class.php';

/**
 * Clase para gestionar fichajes de trabajadores
 */
class FichajeTrabajador
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
     * @var int ID del usuario
     */
    public $fk_user;

    /**
     * @var string Usuario
     */
    public $usuario;

    /**
     * @var string Tipo de fichaje (entrar/salir/pausa/finp)
     */
    public $tipo;

    /**
     * @var string Observaciones
     */
    public $observaciones;

    /**
     * @var int Fecha de creación
     */
    public $fecha_creacion;

    /**
     * @var float Latitud de la ubicación del fichaje
     */
    public $latitud;

    /**
     * @var float Longitud de la ubicación del fichaje
     */
    public $longitud;

    /**
     * @var string Hash SHA-256 para verificación de integridad (cumplimiento legal 2026)
     */
    public $hash_integridad;

    /**
     * @var string Estado de aceptación por el trabajador (aceptado/pendiente/rechazado)
     */
    public $estado_aceptacion;

    /**
     * @var int Advertencia de ubicación (0/1)
     */
    public $location_warning;

    /**
     * @var string Justificación de ubicación/horario
     */
    public $justification;

    /**
     * @var int Advertencia de entrada anticipada (0/1)
     */
    public $early_entry_warning;

    /**
     * @var int ID del centro de trabajo asociado
     */
    public $workplace_center_id;

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
     * Crea un registro de entrada en la base de datos
     *
     * @param string $usuario Nombre del usuario
     * @param string $observaciones Observaciones opcionales
     * @param float $latitud Latitud de la ubicación (opcional)
     * @param float $longitud Longitud de la ubicación (opcional)
     * @param int $user_id ID del usuario (opcional)
     * @param string $justification Justificación opcional
     * @return int <0 si error, >0 si ok
     */
    public function registrarEntrada($usuario = 'USUARIO', $observaciones = '', $latitud = null, $longitud = null, $user_id = null, $justification = null, $location_warning = 0)
    {
        global $user;

        // Limpiar los errores previos
        $this->errors = array();

        // Establecer tipo como "entrar"
        $this->tipo = 'entrar';

        // Establecer usuario
        $this->usuario = $usuario;

        // Establecer ID de usuario
        $this->fk_user = $user_id ? $user_id : $user->id;

        // Establecer observaciones
        $this->observaciones = $observaciones;

        // Establecer coordenadas de geolocalización
        $this->latitud = $latitud;
        $this->longitud = $longitud;

        // Establecer campos de validación
        $this->justification = $justification;
        $this->location_warning = $location_warning ? 1 : 0;

        return $this->create();
    }

    /**
     * Crea un registro de salida en la base de datos
     *
     * @param string $usuario Nombre del usuario
     * @param string $observaciones Observaciones opcionales
     * @param float $latitud Latitud de la ubicación (opcional)
     * @param float $longitud Longitud de la ubicación (opcional)
     * @param int $user_id ID del usuario (opcional)
     * @return int <0 si error, >0 si ok
     */
    public function registrarSalida($usuario = 'USUARIO', $observaciones = '', $latitud = null, $longitud = null, $user_id = null, $justification = null, $location_warning = 0)
    {
        global $user;

        // Limpiar los errores previos
        $this->errors = array();

        // Establecer tipo como "salir"
        $this->tipo = 'salir';

        // Establecer usuario
        $this->usuario = $usuario;

        // Establecer ID de usuario
        $this->fk_user = $user_id ? $user_id : $user->id;

        // Establecer observaciones
        $this->observaciones = $observaciones;

        // Establecer coordenadas de geolocalización
        $this->latitud = $latitud;
        $this->longitud = $longitud;

        // Establecer campos de validación
        $this->justification = $justification;
        $this->location_warning = $location_warning ? 1 : 0;

        // Calculamos la jornada completa si acabamos de finalizar un ciclo
        $result = $this->create();

        if ($result > 0) {
            // Intentar calcular y crear la jornada completa
            require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/jornadacompleta.class.php';
            $jornada = new JornadaCompleta($this->db);
            $jornada->calcularJornadaCompleta($this->fk_user, gmdate('Y-m-d'));
        }

        return $result;
    }

    /**
     * Crea un registro de inicio de pausa en la base de datos
     *
     * @param string $usuario Nombre del usuario
     * @param string $observaciones Observaciones opcionales
     * @param float $latitud Latitud de la ubicación (opcional)
     * @param float $longitud Longitud de la ubicación (opcional)
     * @param int $user_id ID del usuario (opcional)
     * @return int <0 si error, >0 si ok
     */
    public function iniciarPausa($usuario = 'USUARIO', $observaciones = '', $latitud = null, $longitud = null, $user_id = null, $justification = null, $location_warning = 0)
    {
        global $user;

        // Limpiar los errores previos
        $this->errors = array();

        // Establecer tipo como "pausa"
        $this->tipo = 'pausa';

        // Establecer usuario
        $this->usuario = $usuario;

        // Establecer ID de usuario
        $this->fk_user = $user_id ? $user_id : $user->id;

        // Establecer observaciones
        $this->observaciones = $observaciones;

        // Establecer coordenadas de geolocalización
        $this->latitud = $latitud;
        $this->longitud = $longitud;

        // Establecer campos de validación
        $this->justification = $justification;
        $this->location_warning = $location_warning ? 1 : 0;

        return $this->create();
    }

    /**
     * Crea un registro de fin de pausa en la base de datos
     *
     * @param string $usuario Nombre del usuario
     * @param string $observaciones Observaciones opcionales
     * @param float $latitud Latitud de la ubicación (opcional)
     * @param float $longitud Longitud de la ubicación (opcional)
     * @param int $user_id ID del usuario (opcional)
     * @return int <0 si error, >0 si ok
     */
    public function terminarPausa($usuario = 'USUARIO', $observaciones = '', $latitud = null, $longitud = null, $user_id = null, $justification = null, $location_warning = 0)
    {
        global $user;

        // Limpiar los errores previos
        $this->errors = array();

        // Establecer tipo como "finp"
        $this->tipo = 'finp';

        // Establecer usuario
        $this->usuario = $usuario;

        // Establecer ID de usuario
        $this->fk_user = $user_id ? $user_id : $user->id;

        // Establecer observaciones
        $this->observaciones = $observaciones;

        // Establecer coordenadas de geolocalización
        $this->latitud = $latitud;
        $this->longitud = $longitud;

        // Establecer campos de validación
        $this->justification = $justification;
        $this->location_warning = $location_warning ? 1 : 0;

        return $this->create();
    }

    /**
     * Inserta un fichaje con una fecha/hora específica (UTC) sin lógica adicional.
     *
     * @param string      $tipo          Tipo ('entrar','salir','pausa','finp')
     * @param string      $usuario       Login del usuario
     * @param string      $observaciones Observaciones
     * @param string      $fecha_iso     Fecha ISO 8601 (con zona, recomendado UTC con Z)
     * @param int|null    $user_id       ID de usuario (opcional)
     * @return int <0 si error, >0 si ok
     */
    public function insertarFichajeConFecha($tipo, $usuario, $observaciones, $fecha_iso, $user_id = null)
    {
        global $user;

        $this->errors = array();
        $this->tipo = $tipo;
        $this->usuario = $usuario;
        $this->fk_user = $user_id ? $user_id : $user->id;
        $this->observaciones = $observaciones;
        $this->latitud = null;
        $this->longitud = null;

        // The input may be a local datetime string (no TZ info) already in Madrid time,
        // or an ISO string with TZ info (e.g. 2026-02-13T07:20:00Z).
        // We need to store as Europe/Madrid local time.
        $tz = new DateTimeZone('Europe/Madrid');

        // Detect if input has explicit timezone info (Z, +00:00, etc.)
        if (preg_match('/[Zz]$|[+-]\d{2}:\d{2}$/', $fecha_iso)) {
            // Input has explicit timezone — parse and convert to Madrid
            $date = new DateTime($fecha_iso);
            $date->setTimezone($tz);
        } else {
            // Input is a local time string (no TZ) — treat as already Madrid time
            $date = new DateTime($fecha_iso, $tz);
        }
        $this->fecha_creacion = $date->format('Y-m-d H:i:s');

        return $this->create();
    }

    /**
     * Inserta una jornada completa de manera manual:
     * - Crea fichajes (entrada/pausas/salida) con timestamp
     * - Crea (o sustituye) la jornada completa con observaciones de "manual"
     *
     * @param string $usuario          Login del usuario
     * @param string $fecha            Fecha YYYY-MM-DD (día de la jornada)
     * @param string $entrada_iso      ISO entrada (UTC recomendado)
     * @param string $salida_iso       ISO salida (UTC recomendado)
     * @param array  $pausas           Array de pausas: [ ['inicio_iso'=>..., 'fin_iso'=>...], ... ]
     * @param string $obs_fichaje      Observación a guardar en cada fichaje
     * @param string $obs_jornada      Observación a guardar en la jornada completa
     * @param int|null $user_id        ID de usuario (opcional)
     * @return array                   Resultado con ids
     */
    public function insertarJornadaManual($usuario, $fecha, $entrada_iso, $salida_iso, $pausas = array(), $obs_fichaje = '', $obs_jornada = '', $user_id = null, $is_approved_request = false)
    {
        global $conf, $user;

        $this->errors = array();

        if (empty($usuario) || empty($fecha) || (empty($entrada_iso) && empty($salida_iso) && empty($pausas))) {
            $this->errors[] = 'Parámetros requeridos: usuario, fecha, y al menos entrada, salida, o pausas';
            return array('success' => false, 'errors' => $this->errors);
        }

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
            $this->errors[] = 'Fecha inválida (YYYY-MM-DD): ' . $fecha;
            return array('success' => false, 'errors' => $this->errors);
        }

        // Convertir a timestamps para validar y calcular
        $tsEntrada = !empty($entrada_iso) ? strtotime($entrada_iso) : false;
        $tsSalida = !empty($salida_iso) ? strtotime($salida_iso) : false;

        // If entry or exit are missing but pauses exist, read existing ones from DB
        // This handles pause-only corrections where the user didn't change entry/exit
        if (($tsEntrada === false || $tsSalida === false) && !empty($pausas)) {
            $dayS = $fecha . ' 00:00:00';
            $dayE = $fecha . ' 23:59:59';
            // Resolve uid early for this lookup
            $lookupUid = $user_id;
            if (!$lookupUid) {
                $sql_lu = "SELECT rowid FROM " . MAIN_DB_PREFIX . "user WHERE login = '" . $this->db->escape($usuario) . "'";
                $res_lu = $this->db->query($sql_lu);
                if ($res_lu && $this->db->num_rows($res_lu) > 0) {
                    $obj_lu = $this->db->fetch_object($res_lu);
                    $lookupUid = $obj_lu->rowid;
                }
            }
            if ($lookupUid) {
                if ($tsEntrada === false) {
                    $sqlE = "SELECT fecha_creacion FROM " . MAIN_DB_PREFIX . "fichajestrabajadores";
                    $sqlE .= " WHERE fk_user = " . (int) $lookupUid . " AND tipo = 'entrar'";
                    $sqlE .= " AND fecha_creacion >= '" . $this->db->escape($dayS) . "' AND fecha_creacion <= '" . $this->db->escape($dayE) . "'";
                    $sqlE .= " ORDER BY fecha_creacion ASC LIMIT 1";
                    $resE = $this->db->query($sqlE);
                    if ($resE && $this->db->num_rows($resE) > 0) {
                        $objE = $this->db->fetch_object($resE);
                        $entrada_iso = $objE->fecha_creacion;
                        $tsEntrada = strtotime($entrada_iso);
                    }
                }
                if ($tsSalida === false) {
                    $sqlS = "SELECT fecha_creacion FROM " . MAIN_DB_PREFIX . "fichajestrabajadores";
                    $sqlS .= " WHERE fk_user = " . (int) $lookupUid . " AND tipo = 'salir'";
                    $sqlS .= " AND fecha_creacion >= '" . $this->db->escape($dayS) . "' AND fecha_creacion <= '" . $this->db->escape($dayE) . "'";
                    $sqlS .= " ORDER BY fecha_creacion DESC LIMIT 1";
                    $resS = $this->db->query($sqlS);
                    if ($resS && $this->db->num_rows($resS) > 0) {
                        $objS = $this->db->fetch_object($resS);
                        $salida_iso = $objS->fecha_creacion;
                        $tsSalida = strtotime($salida_iso);
                    }
                }
            }
        }

        if ($tsEntrada === false && $tsSalida === false) {
            $this->errors[] = 'Rango de entrada/salida inválido';
            return array('success' => false, 'errors' => $this->errors);
        }

        if ($tsEntrada !== false && $tsSalida !== false && $tsSalida <= $tsEntrada) {
            $this->errors[] = 'La salida debe ser posterior a la entrada';
            return array('success' => false, 'errors' => $this->errors);
        }

        // Normalizar pausas
        $pausas_norm = array();
        if (is_array($pausas)) {
            foreach ($pausas as $p) {
                // A veces llega como stdClass (JSON decode). Convertir para acceso consistente.
                if (is_object($p))
                    $p = (array) $p;
                if (!is_array($p))
                    continue;

                // Aceptar varias convenciones por si el framework cambia nombres (snake_case vs camelCase)
                $ini =
                    (isset($p['inicio_iso']) ? $p['inicio_iso'] : null)
                    ?: (isset($p['inicioIso']) ? $p['inicioIso'] : null)
                    ?: (isset($p['inicioISO']) ? $p['inicioISO'] : null)
                    ?: (isset($p['inicio']) ? $p['inicio'] : null);
                $fin =
                    (isset($p['fin_iso']) ? $p['fin_iso'] : null)
                    ?: (isset($p['finIso']) ? $p['finIso'] : null)
                    ?: (isset($p['finISO']) ? $p['finISO'] : null)
                    ?: (isset($p['fin']) ? $p['fin'] : null);

                if (empty($ini) || empty($fin)) {
                    // Si el cliente envió pausas pero no reconocemos el formato, mejor fallar que ignorar.
                    $this->errors[] = 'Pausa sin campos inicio/fin reconocibles';
                    return array('success' => false, 'errors' => $this->errors);
                }
                $tIni = strtotime($ini);
                $tFin = strtotime($fin);
                if ($tIni === false || $tFin === false || $tFin <= $tIni) {
                    $this->errors[] = 'Pausa inválida (inicio/fin)';
                    return array('success' => false, 'errors' => $this->errors);
                }
                if ($tIni < $tsEntrada || ($tsSalida !== false && $tFin > $tsSalida)) {
                    $this->errors[] = 'Las pausas deben estar dentro del rango entrada/salida';
                    return array('success' => false, 'errors' => $this->errors);
                }
                $pausas_norm[] = array('inicio' => $tIni, 'fin' => $tFin, 'inicio_iso' => $ini, 'fin_iso' => $fin);
            }
        }

        if (!empty($pausas) && empty($pausas_norm)) {
            $this->errors[] = 'Se recibieron pausas pero no se pudo procesar ninguna';
            return array('success' => false, 'errors' => $this->errors);
        }

        usort($pausas_norm, function ($a, $b) {
            return $a['inicio'] - $b['inicio'];
        });
        for ($i = 1; $i < count($pausas_norm); $i++) {
            if ($pausas_norm[$i]['inicio'] < $pausas_norm[$i - 1]['fin']) {
                $this->errors[] = 'Las pausas no pueden solaparse';
                return array('success' => false, 'errors' => $this->errors);
            }
        }

        // Resolve user ID correctly
        if ($user_id) {
            $uid = $user_id;
        } else {
            // Try to resolve from login string
            $sql_u = "SELECT rowid FROM " . MAIN_DB_PREFIX . "user WHERE login = '" . $this->db->escape($usuario) . "'";
            $res_u = $this->db->query($sql_u);
            if ($res_u && $this->db->num_rows($res_u) > 0) {
                $obj_u = $this->db->fetch_object($res_u);
                $uid = $obj_u->rowid;
            } else {
                // Fallback to current user (should rarely happen if validated)
                $uid = $user->id;
            }
        }

        // Determinar estado de aceptación (Ley Control Horario 2026)
        // Si el usuario que edita NO es el trabajador Y no es una solicitud aprobada del propio empleado,
        // se marca como 'pendiente' de validación
        if ($user->id != $uid && !$is_approved_request) {
            $this->estado_aceptacion = 'pendiente';
            dol_syslog("FichajeTrabajador::insertarJornadaManual - Edición por tercero (Admin ID: {$user->id}, Target ID: {$uid}). Estado: pendiente", LOG_INFO);
        } else {
            $this->estado_aceptacion = 'aceptado';
        }

        // Soft delete existing records of the same type to avoid duplicates in calculation
        // We append '_anulado' to the type so they are ignored by the calculator but preserved in DB
        $dayStart = $fecha . ' 00:00:00';
        $dayEnd = $fecha . ' 23:59:59';
        $obsSuffix = " [ANULADO]";

        // Helper to read original fecha_creacion before soft-deleting
        $getOriginalTime = function ($tipo) use ($uid, $dayStart, $dayEnd) {
            $sqlOrig = "SELECT fecha_creacion FROM " . MAIN_DB_PREFIX . "fichajestrabajadores";
            $sqlOrig .= " WHERE fk_user = " . (int) $uid . " AND tipo = '" . $this->db->escape($tipo) . "'";
            $sqlOrig .= " AND fecha_creacion >= '" . $this->db->escape($dayStart) . "' AND fecha_creacion <= '" . $this->db->escape($dayEnd) . "'";
            $sqlOrig .= " ORDER BY fecha_creacion ASC LIMIT 1";
            $resOrig = $this->db->query($sqlOrig);
            if ($resOrig && $this->db->num_rows($resOrig) > 0) {
                $objOrig = $this->db->fetch_object($resOrig);
                return $objOrig->fecha_creacion;
            }
            return null;
        };

        // Capture original times BEFORE soft-deleting (legal compliance: preserve old values)
        $origEntrada = !empty($entrada_iso) ? $getOriginalTime('entrar') : null;
        $origSalida = !empty($salida_iso) ? $getOriginalTime('salir') : null;
        $origPausas = array();
        if (!empty($pausas_norm)) {
            // Get all original pause start times
            $sqlOrigPausas = "SELECT rowid, tipo, fecha_creacion FROM " . MAIN_DB_PREFIX . "fichajestrabajadores";
            $sqlOrigPausas .= " WHERE fk_user = " . (int) $uid . " AND tipo IN ('pausa','finp')";
            $sqlOrigPausas .= " AND fecha_creacion >= '" . $this->db->escape($dayStart) . "' AND fecha_creacion <= '" . $this->db->escape($dayEnd) . "'";
            $sqlOrigPausas .= " ORDER BY fecha_creacion ASC";
            $resOrigPausas = $this->db->query($sqlOrigPausas);
            if ($resOrigPausas) {
                while ($objP = $this->db->fetch_object($resOrigPausas)) {
                    $origPausas[] = array('tipo' => $objP->tipo, 'fecha_creacion' => $objP->fecha_creacion);
                }
            }
        }

        // Helper to soft delete
        $softDelete = function ($tipo) use ($uid, $dayStart, $dayEnd, $obsSuffix) {
            $sqlUpd = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores";
            $sqlUpd .= " SET tipo = CONCAT(tipo, '_anulado'), observaciones = CONCAT(IFNULL(observaciones,''), '" . $this->db->escape($obsSuffix) . "')";
            $sqlUpd .= " WHERE fk_user = " . (int) $uid . " AND tipo = '" . $this->db->escape($tipo) . "'";
            $sqlUpd .= " AND fecha_creacion >= '" . $this->db->escape($dayStart) . "' AND fecha_creacion <= '" . $this->db->escape($dayEnd) . "'";
            $this->db->query($sqlUpd);
        };

        if (!empty($entrada_iso)) {
            $softDelete('entrar');
        }
        if (!empty($salida_iso)) {
            $softDelete('salir');
        }
        if (!empty($pausas_norm)) {
            $softDelete('pausa');
            $softDelete('finp');
        }

        // Helper to set fecha_original on a newly inserted fichaje
        $setFechaOriginal = function ($newId, $originalTime) {
            if ($newId > 0 && !empty($originalTime)) {
                $sqlFO = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores";
                $sqlFO .= " SET fecha_original = '" . $this->db->escape($originalTime) . "'";
                $sqlFO .= " WHERE rowid = " . (int) $newId;
                $this->db->query($sqlFO);
            }
        };

        // Insertar fichajes
        $ids = array();
        if (!empty($entrada_iso)) {
            $res_e = $this->insertarFichajeConFecha('entrar', $usuario, $obs_fichaje, $entrada_iso, $uid);
            if ($res_e > 0) {
                $ids[] = $res_e;
                $setFechaOriginal($res_e, $origEntrada);
            } else {
                $this->errors[] = 'Error al insertar fichaje de entrada';
                return array('success' => false, 'errors' => $this->errors);
            }
        }

        $pausaIdx = 0;
        foreach ($pausas_norm as $p) {
            $res_p = $this->insertarFichajeConFecha('pausa', $usuario, $obs_fichaje, $p['inicio_iso'], $uid);
            $res_f = $this->insertarFichajeConFecha('finp', $usuario, $obs_fichaje, $p['fin_iso'], $uid);
            if ($res_p > 0) {
                $ids[] = $res_p;
                // Match original pause times by index
                $origPausa = isset($origPausas[$pausaIdx * 2]) ? $origPausas[$pausaIdx * 2]['fecha_creacion'] : null;
                $setFechaOriginal($res_p, $origPausa);
            }
            if ($res_f > 0) {
                $ids[] = $res_f;
                $origFinp = isset($origPausas[$pausaIdx * 2 + 1]) ? $origPausas[$pausaIdx * 2 + 1]['fecha_creacion'] : null;
                $setFechaOriginal($res_f, $origFinp);
            }
            $pausaIdx++;
        }

        if (!empty($salida_iso)) {
            $res_s = $this->insertarFichajeConFecha('salir', $usuario, $obs_fichaje, $salida_iso, $uid);
            if ($res_s > 0) {
                $ids[] = $res_s;
                $setFechaOriginal($res_s, $origSalida);
            } else {
                $this->errors[] = 'Error al insertar fichaje de salida';
                return array('success' => false, 'errors' => $this->errors);
            }
        }

        $jid = 0;
        // Solo crear o sustituir jornada completa si tenemos ambos
        if ($tsEntrada !== false && $tsSalida !== false) {
            // Calcular totales
            $totalPausaSeg = 0;
            foreach ($pausas_norm as $p)
                $totalPausaSeg += max(0, $p['fin'] - $p['inicio']);
            $totalTrabajoSeg = max(0, ($tsSalida - $tsEntrada) - $totalPausaSeg);

            $total_pausa = sprintf('%02d:%02d:%02d', floor($totalPausaSeg / 3600), floor(($totalPausaSeg % 3600) / 60), $totalPausaSeg % 60);
            $total_trabajo = sprintf('%02d:%02d:%02d', floor($totalTrabajoSeg / 3600), floor(($totalTrabajoSeg % 3600) / 60), $totalTrabajoSeg % 60);

            require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/jornadacompleta.class.php';
            $jornada = new JornadaCompleta($this->db);

            $tz = new DateTimeZone('Europe/Madrid');
            $dateEntrada = new DateTime("@$tsEntrada");
            $dateEntrada->setTimezone($tz);
            $dateSalida = new DateTime("@$tsSalida");
            $dateSalida->setTimezone($tz);

            $sqlDel = "DELETE FROM " . MAIN_DB_PREFIX . "jornadas_completas WHERE usuario_id = " . ((int) $uid);
            $sqlDel .= " AND fecha = '" . $this->db->escape($fecha) . "'";
            $this->db->query($sqlDel);

            $fecha_ts = dol_mktime(0, 0, 0, (int) substr($fecha, 5, 2), (int) substr($fecha, 8, 2), (int) substr($fecha, 0, 4));
            $dataJ = array(
                'fecha' => $fecha_ts,
                'hora_entrada' => $dateEntrada->format('Y-m-d H:i:s'),
                'hora_salida' => $dateSalida->format('Y-m-d H:i:s'),
                'total_pausa' => $total_pausa,
                'total_trabajo' => $total_trabajo,
                'observaciones' => $obs_jornada
            );

            $jid = $jornada->create($uid, $dataJ);
            if ($jid <= 0) {
                $this->errors[] = 'Error al crear jornada completa manual';
                return array('success' => false, 'errors' => $this->errors);
            }
        }

        return array(
            'success' => true,
            'ids_fichajes' => $ids,
            'id_jornada' => $jid
        );
    }

    /**
     * Crea un registro en la base de datos
     *
     * @return int <0 si error, >0 si ok
     */
    public function create()
    {
        global $conf, $user;

        $error = 0;

        dol_syslog("FichajeTrabajador::create - Iniciando creación de fichaje", LOG_DEBUG);
        dol_syslog("FichajeTrabajador::create - Usuario: " . $this->usuario, LOG_DEBUG);
        dol_syslog("FichajeTrabajador::create - Tipo: " . $this->tipo, LOG_DEBUG);

        // Limpiar parámetros
        if (empty($this->usuario)) {
            $this->usuario = 'USUARIO';
            dol_syslog("FichajeTrabajador::create - Usuario vacío, usando valor por defecto", LOG_DEBUG);
        }

        // Validar el tipo
        $tipos_validos = array('entrar', 'salir', 'pausa', 'finp');
        if (!in_array($this->tipo, $tipos_validos)) {
            $this->errors[] = 'Tipo de fichaje no válido: ' . $this->tipo;
            dol_syslog("FichajeTrabajador::create - Tipo de fichaje no válido: " . $this->tipo, LOG_ERR);
            return -1;
        }

        // Obtener el ID del usuario si no está establecido
        if (empty($this->fk_user)) {
            $sql_user = "SELECT rowid FROM " . MAIN_DB_PREFIX . "user WHERE login = '" . $this->db->escape($this->usuario) . "'";
            $resql_user = $this->db->query($sql_user);
            if ($resql_user && $this->db->num_rows($resql_user) > 0) {
                $obj_user = $this->db->fetch_object($resql_user);
                $this->fk_user = $obj_user->rowid;
                $this->db->free($resql_user);
            } else {
                $this->fk_user = $user->id;
            }
        }

        // Comprobar si la geolocalización está activada
        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php';
        $config = new FichajesTrabajadoresConfig($this->db);
        $require_geolocation = $config->getParamValue('require_geolocation', $this->fk_user);

        // Assign workplace_center_id if not already set (e.g. manually)
        if (empty($this->workplace_center_id)) {
            $centerId = $config->getParamValue('work_center_id', $this->fk_user);
            if ($centerId) {
                $this->workplace_center_id = (int) $centerId;
            }
        }

        // Si la geolocalización está desactivada, AUN ASÍ guardamos las coordenadas si vienen.
        // Solo validamos si es obligatorio en el frontend o en un método de validación específico.
        // if ($require_geolocation === false || $require_geolocation === '0') {
        //     $this->latitud = null;
        //     $this->longitud = null;
        // }
        // Prepare SQL
        // Si ya viene establecida (p.ej. inserción manual), respetarla. Si no, usar ahora en Europe/Madrid.
        if (empty($this->fecha_creacion)) {
            $tz = new DateTimeZone('Europe/Madrid');
            $now = new DateTime('now', $tz);
            $this->fecha_creacion = $now->format('Y-m-d H:i:s');
        }
        // Calcular hash de integridad para cumplimiento legal
        $hashData = $this->fk_user . '|' . $this->tipo . '|' . $this->fecha_creacion . '|' . $this->usuario;
        $this->hash_integridad = hash('sha256', $hashData . getenv('INTEGRITY_SALT'));

        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores (";
        $sql .= "fk_user, usuario, tipo, observaciones, fecha_creacion, latitud, longitud, hash_integridad, estado_aceptacion, location_warning, justification, early_entry_warning, workplace_center_id";
        $sql .= ") VALUES (";
        $sql .= " " . (int) $this->fk_user . ",";
        $sql .= " '" . $this->db->escape($this->usuario) . "',";
        $sql .= " '" . $this->db->escape($this->tipo) . "',";
        $sql .= " '" . $this->db->escape($this->observaciones) . "',";
        $sql .= " '" . $this->db->escape($this->fecha_creacion) . "',";
        $sql .= " " . ($this->latitud ? "'" . $this->db->escape($this->latitud) . "'" : "NULL") . ",";
        $sql .= " " . ($this->longitud ? "'" . $this->db->escape($this->longitud) . "'" : "NULL") . ",";
        $sql .= " '" . $this->db->escape($this->hash_integridad) . "',";
        $sql .= " '" . $this->db->escape($this->estado_aceptacion ? $this->estado_aceptacion : 'aceptado') . "',";
        $sql .= " " . ($this->location_warning ? 1 : 0) . ",";
        $sql .= " '" . $this->db->escape($this->justification) . "',";
        $sql .= " " . ($this->early_entry_warning ? 1 : 0) . ",";
        $sql .= " " . ($this->workplace_center_id ? (int) $this->workplace_center_id : "NULL");
        $sql .= ")";

        // LOGIC FOR AUTOMATIC CHECKS (Before INSERT would be better, but we do it here or assume caller did it)
        // Actually, logic is better inside registerEntrada before calling create(), but create() is generic.
        // We already passed location_warning and early_entry_warning.
        // However, if we want the BACKEND to enforce or double-check:

        dol_syslog("FichajeTrabajador::create - SQL Query: " . $sql, LOG_DEBUG);

        $this->db->begin();

        $resql = $this->db->query($sql);
        if (!$resql) {
            $error++;
            $this->errors[] = "Error SQL: " . $this->db->lasterror();
            $this->errors[] = "Query: " . $sql;
            dol_syslog("FichajeTrabajador::create - Error SQL: " . $this->db->lasterror(), LOG_ERR);
            dol_syslog("FichajeTrabajador::create - Query: " . $sql, LOG_ERR);
        }

        if (!$error) {
            $this->id = $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores");
            dol_syslog("FichajeTrabajador::create - Fichaje creado exitosamente con ID: " . $this->id, LOG_DEBUG);
            $this->db->commit();
            return $this->id;
        } else {
            $this->db->rollback();
            dol_syslog("FichajeTrabajador::create rollback", LOG_ERR);
            return -1 * $error;
        }
    }

    /**
     * Get fichajes pending employee validation (admin-made changes)
     * 
     * Returns fichajes where estado_aceptacion = 'pendiente' for the given user.
     * These are records that an admin modified directly (not user correction requests).
     * 
     * @param int $user_id User ID to check
     * @return array Array of pending fichaje objects, or error string
     */
    public function getPendingValidationFichajes($user_id)
    {
        $result = array();

        $sql = "SELECT f.rowid, f.fk_user, f.tipo, f.fecha_creacion, f.observaciones,";
        $sql .= " f.estado_aceptacion, f.usuario";
        $sql .= " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores as f";
        $sql .= " WHERE f.fk_user = " . (int) $user_id;
        $sql .= " AND f.estado_aceptacion = 'pendiente'";
        $sql .= " AND f.tipo NOT LIKE '%_anulado'";
        $sql .= " ORDER BY f.fecha_creacion DESC";

        dol_syslog("FichajeTrabajador::getPendingValidationFichajes for user $user_id", LOG_DEBUG);

        $resql = $this->db->query($sql);
        if ($resql) {
            while ($obj = $this->db->fetch_object($resql)) {
                $result[] = array(
                    'rowid' => $obj->rowid,
                    'fk_user' => $obj->fk_user,
                    'tipo' => $obj->tipo,
                    'fecha_creacion' => $obj->fecha_creacion,
                    'observaciones' => $obj->observaciones,
                    'estado_aceptacion' => $obj->estado_aceptacion,
                    'usuario' => $obj->usuario
                );
            }
            $this->db->free($resql);
        } else {
            $this->error = $this->db->lasterror();
            return $this->error;
        }

        return $result;
    }

    /**
     * Carga todos los registros de fichajes
     *
     * @param int    $user_id             ID de usuario
     * @param bool   $solo_usuario_actual Solo usuario actual
     * @param string $date_start          Fecha inicio
     * @param string $date_end            Fecha fin
     */
    public function getAllFichajes($user_id = 0, $solo_usuario_actual = false, $date_start = '', $date_end = '')
    {
        global $user;

        $fichajes = array();

        // Auto-migrate: ensure fecha_original column exists (legal compliance)
        // @$this->db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores ADD COLUMN fecha_original DATETIME DEFAULT NULL");

        // Construir la consulta SQL
        $sql = "SELECT f.rowid, f.fk_user, f.usuario, f.tipo, f.observaciones, f.latitud, f.longitud, f.fecha_creacion, f.fecha_original, f.estado_aceptacion, f.justification, f.location_warning, f.early_entry_warning, f.workplace_center_id,";
        $sql .= " u.firstname, u.lastname, u.login";
        $sql .= " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores as f";
        $sql .= " LEFT JOIN " . MAIN_DB_PREFIX . "user as u ON f.fk_user = u.rowid";
        $sql .= " WHERE 1=1";

        // Filtrar por usuario si se proporciona un ID o si se solicita solo el usuario actual
        if ($user_id > 0) {
            $sql .= " AND f.fk_user = " . (int) $user_id;
        } elseif ($solo_usuario_actual && !$user->admin) {
            $sql .= " AND f.usuario = '" . $this->db->escape($user->login) . "'";
        }

        // Filtro por fecha (Ley 2026 / Requerimiento Auditoría)
        if (!empty($date_start)) {
            $sql .= " AND f.fecha_creacion >= '" . $this->db->escape($date_start) . " 00:00:00'";
        }
        if (!empty($date_end)) {
            $sql .= " AND f.fecha_creacion <= '" . $this->db->escape($date_end) . " 23:59:59'";
        }

        $sql .= " ORDER BY f.fecha_creacion DESC";

        dol_syslog("FichajeTrabajador::getAllFichajes - SQL: " . $sql, LOG_DEBUG);

        $resql = $this->db->query($sql);
        if ($resql) {
            $num = $this->db->num_rows($resql);
            dol_syslog("FichajeTrabajador::getAllFichajes - Encontrados " . $num . " registros", LOG_DEBUG);

            while ($obj = $this->db->fetch_object($resql)) {
                $fichaje = new stdClass();
                $fichaje->id = $obj->rowid;
                $fichaje->fk_user = $obj->fk_user;
                $fichaje->usuario = $obj->usuario;
                $fichaje->tipo = $obj->tipo;
                $fichaje->observaciones = $obj->observaciones;
                $fichaje->latitud = $obj->latitud;
                $fichaje->longitud = $obj->longitud;
                $fichaje->fecha_creacion = $obj->fecha_creacion;
                $fichaje->estado_aceptacion = $obj->estado_aceptacion;
                $fichaje->justification = $obj->justification;
                $fichaje->location_warning = $obj->location_warning;
                $fichaje->early_entry_warning = $obj->early_entry_warning;
                $fichaje->workplace_center_id = $obj->workplace_center_id;
                $fichaje->fecha_original = $obj->fecha_original;

                // Mostrar solo el login del usuario
                $fichaje->usuario_nombre = $obj->login;

                $fichajes[] = $fichaje;
            }

            dol_syslog("FichajeTrabajador::getAllFichajes - Se añadieron " . count($fichajes) . " fichajes al array", LOG_DEBUG);
            return $fichajes;
        } else {
            $this->error = $this->db->lasterror();
            dol_syslog("FichajeTrabajador::getAllFichajes - Error SQL: " . $this->error, LOG_ERR);
            return -1;
        }
    }

    /**
     * Obtiene el último fichaje de un usuario
     *
     * @param int $user_id ID del usuario
     * @return object|null Último fichaje o null si no hay fichajes
     */
    public function getUltimoFichaje($user_id)
    {
        if (empty($user_id)) {
            return null;
        }

        $sql = "SELECT f.*, u.firstname, u.lastname, u.login";
        $sql .= " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores as f";
        $sql .= " LEFT JOIN " . MAIN_DB_PREFIX . "user as u ON f.fk_user = u.rowid";
        $sql .= " WHERE f.fk_user = " . (int) $user_id;
        $sql .= " OR f.usuario = (SELECT login FROM " . MAIN_DB_PREFIX . "user WHERE rowid = " . (int) $user_id . ")";
        $sql .= " ORDER BY f.fecha_creacion DESC LIMIT 1";

        dol_syslog("FichajeTrabajador::getUltimoFichaje - SQL: " . $sql, LOG_DEBUG);

        $resql = $this->db->query($sql);
        if ($resql && $this->db->num_rows($resql) > 0) {
            $obj = $this->db->fetch_object($resql);

            $fichaje = new stdClass();
            $fichaje->id = $obj->rowid;
            $fichaje->fk_user = $obj->fk_user;
            $fichaje->usuario = $obj->usuario;
            $fichaje->tipo = $obj->tipo;
            $fichaje->observaciones = $obj->observaciones;
            $fichaje->latitud = $obj->latitud;
            $fichaje->longitud = $obj->longitud;
            $fichaje->fecha_creacion = $obj->fecha_creacion;

            // Datos del usuario
            $fichaje->usuario_nombre = $obj->login;

            $this->db->free($resql);
            return $fichaje;
        }

        return null;
    }

    /**
     * Obtiene el último fichaje de un usuario
     *
     * @param int $user_id ID del usuario
     * @return object|null Objeto con datos del último fichaje o null si no hay fichajes
     */
    public function getUltimoFichajeUsuario($user_id)
    {
        if (empty($user_id)) {
            return null;
        }

        $sql = "SELECT f.*, u.firstname, u.lastname, u.login";
        $sql .= " FROM " . MAIN_DB_PREFIX . "fichajestrabajadores as f";
        $sql .= " LEFT JOIN " . MAIN_DB_PREFIX . "user as u ON f.fk_user = u.rowid";
        $sql .= " WHERE f.fk_user = " . (int) $user_id;
        $sql .= " ORDER BY f.fecha_creacion DESC LIMIT 1";

        dol_syslog("FichajeTrabajador::getUltimoFichajeUsuario - SQL: " . $sql, LOG_DEBUG);

        $resql = $this->db->query($sql);
        if ($resql && $this->db->num_rows($resql) > 0) {
            $obj = $this->db->fetch_object($resql);

            $fichaje = new stdClass();
            $fichaje->id = $obj->rowid;
            $fichaje->fk_user = $obj->fk_user;
            $fichaje->usuario = $obj->usuario;
            $fichaje->tipo = $obj->tipo;
            $fichaje->observaciones = $obj->observaciones;
            $fichaje->latitud = $obj->latitud;
            $fichaje->longitud = $obj->longitud;
            $fichaje->fecha_creacion = $this->db->jdate($obj->fecha_creacion);

            // Datos del usuario
            $fichaje->usuario_nombre = $obj->login;

            $this->db->free($resql);
            return $fichaje;
        }

        return null;
    }

    /**
     * Determina qué botones deben estar disponibles basado en el último fichaje
     *
     * @param int $user_id ID del usuario
     * @return array Array con estado de los botones (true/false para cada botón)
     */
    public function getBotonesDisponibles($user_id)
    {
        $botones = array(
            'entrar' => false,
            'salir' => false,
            'iniciar_pausa' => false,
            'terminar_pausa' => false
        );

        $ultimoFichaje = $this->getUltimoFichaje($user_id);

        if (!$ultimoFichaje) {
            // No hay fichajes previos, solo se permite entrar
            $botones['entrar'] = true;
        } else {
            switch ($ultimoFichaje->tipo) {
                case 'entrar':
                    // Si el último fichaje fue entrada, permitir salir o iniciar pausa
                    $botones['salir'] = true;
                    $botones['iniciar_pausa'] = true;
                    break;
                case 'pausa':
                    // Si el último fichaje fue inicio de pausa, solo permitir terminar pausa
                    $botones['terminar_pausa'] = true;
                    break;
                case 'finp':
                    // Si el último fichaje fue fin de pausa, permitir salir o iniciar otra pausa
                    $botones['salir'] = true;
                    $botones['iniciar_pausa'] = true;
                    break;
                case 'salir':
                    // Si el último fichaje fue salida, solo permitir entrar
                    $botones['entrar'] = true;
                    break;
            }
        }

        return $botones;
    }

    /**
     * Actualiza un fichaje en la base de datos
     *
     * @param int $id ID del fichaje a actualizar
     * @param array $data Datos a actualizar
     * @param string $comentario Comentario obligatorio para el log de auditoría
     * @return int <0 si error, >0 si ok
     */
    public function update($id, $data = array(), $comentario = '')
    {
        global $user;

        if (empty($comentario)) {
            $this->errors[] = 'Es obligatorio proporcionar un comentario para justificar la modificación';
            return -1;
        }

        $error = 0;
        $this->db->begin();

        // Guardar valores originales para el log de auditoría
        $originalData = array();
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores WHERE rowid = " . (int) $id;
        $resql = $this->db->query($sql);

        if ($resql && $this->db->num_rows($resql) > 0) {
            $obj = $this->db->fetch_object($resql);
            $originalData = array(
                'fk_user' => $obj->fk_user,
                'usuario' => $obj->usuario,
                'tipo' => $obj->tipo,
                'observaciones' => $obj->observaciones,
                'fecha_creacion' => $this->db->jdate($obj->fecha_creacion),
                'latitud' => $obj->latitud,
                'longitud' => $obj->longitud,
                'estado_aceptacion' => $obj->estado_aceptacion
            );
            $this->db->free($resql);
        } else {
            $this->db->rollback();
            $this->errors[] = 'No se encontró el fichaje a modificar';
            return -2;
        }

        // Preparar datos para actualizar
        $updateFields = array();

        if (isset($data['fk_user'])) {
            $updateFields[] = "fk_user = " . (int) $data['fk_user'];
        }

        if (isset($data['usuario'])) {
            $updateFields[] = "usuario = '" . $this->db->escape($data['usuario']) . "'";
        }

        if (isset($data['tipo'])) {
            $updateFields[] = "tipo = '" . $this->db->escape($data['tipo']) . "'";
        }

        if (isset($data['observaciones'])) {
            $updateFields[] = "observaciones = " . ($data['observaciones'] ? "'" . $this->db->escape($data['observaciones']) . "'" : "NULL");
        }

        if (isset($data['fecha_creacion'])) {
            $updateFields[] = "fecha_creacion = '" . $this->db->idate($data['fecha_creacion']) . "'";
        }

        if (isset($data['latitud'])) {
            $updateFields[] = "latitud = " . (float) $data['latitud'];
        }

        if (isset($data['longitud'])) {
            $updateFields[] = "longitud = " . (float) $data['longitud'];
        }

        if (isset($data['estado_aceptacion'])) {
            $updateFields[] = "estado_aceptacion = '" . $this->db->escape($data['estado_aceptacion']) . "'";
        }

        if (empty($updateFields)) {
            $this->db->rollback();
            return 0; // Nada que actualizar
        }

        // Construir la consulta SQL
        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores SET ";
        $sql .= implode(", ", $updateFields);
        $sql .= " WHERE rowid = " . (int) $id;

        dol_syslog("FichajeTrabajador::update - SQL: " . $sql, LOG_DEBUG);

        $resql = $this->db->query($sql);
        if (!$resql) {
            $error++;
            $this->error = "Error al actualizar registro: " . $this->db->lasterror();
        }

        // Registrar cambios en el log de auditoría
        if (!$error) {
            require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajelog.class.php';
            $logObj = new FichajeLog($this->db);

            foreach ($data as $key => $value) {
                if (isset($originalData[$key]) && $originalData[$key] != $value) {
                    $logData = array(
                        'id_fichaje' => $id,
                        'usuario_editor' => $user->id,
                        'campo_modificado' => $key,
                        'valor_anterior' => $originalData[$key],
                        'valor_nuevo' => $value,
                        'comentario' => $comentario
                    );

                    if ($logObj->create($logData) <= 0) {
                        $error++;
                        $this->errors = array_merge($this->errors, $logObj->errors);
                    }
                }
            }
        }

        if (!$error) {
            $this->db->commit();
            return 1;
        } else {
            $this->db->rollback();
            return -1;
        }
    }
    /**
     * Check if entry is too early based on assigned schedule
     */
    private function checkScheduleCompliance($usuario, $userId)
    {
        $jornada = new JornadaLaboral($this->db);
        // Get all active jornadas for user
        $jornadas = $jornada->getAllJornadas($userId);

        if (is_array($jornadas) && count($jornadas) > 0) {
            // Find logic for "today" - simplified: assume the first active one is the current one
            $currentJornada = $jornadas[0];

            if (!empty($currentJornada['hora_inicio_jornada'])) {
                try {
                    $tz = new DateTimeZone('Europe/Madrid');
                    $now = new DateTime('now', $tz);
                    $todayDate = $now->format('Y-m-d');

                    $startTimeStr = $todayDate . ' ' . $currentJornada['hora_inicio_jornada']; // Y-m-d H:i:s
                    $startTime = new DateTime($startTimeStr, $tz);

                    // If now is more than 15 mins before start time
                    // timestamp diff: startTime - now. If positive and > 900 (15*60)
                    $diff = $startTime->getTimestamp() - $now->getTimestamp();
                    if ($diff > (15 * 60)) {
                        // Early entry detected
                        $this->early_entry_warning = 1;
                        dol_syslog("FichajeTrabajador::checkScheduleCompliance - Early entry detected for $usuario. Schedule: " . $currentJornada['hora_inicio_jornada'] . ", Actual: " . $now->format('H:i:s'), LOG_WARNING);
                    }
                } catch (Exception $e) {
                    dol_syslog("FichajeTrabajador::checkScheduleCompliance - Error: " . $e->getMessage(), LOG_ERR);
                }
            }
        }
    }

    /**
     * Validate location against centers
     */
    private function validateLocationBackend()
    {
        if (!class_exists('FichajesTrabajadoresCenters')) {
            return;
        }
        $centers = new FichajesTrabajadoresCenters($this->db);
        $result = $centers->checkLocation($this->latitud, $this->longitud);

        if ($result['inside']) {
            $this->workplace_center_id = $result['center']['id'];
            // If inside, we can theoretically clear the warning, but we trust frontend mostly.
            // But let's say if we find them inside, we force warning off.
            $this->location_warning = 0;
        } else {
            // Outside
            // Logic: If frontend validation was skipped or spoofed, we confirm it here.
            // If frontend sent justification, we keep it. If not, we still flag it.
            if (!$this->justification) {
                $this->location_warning = 1;
            }
            // If they have justification, we normally keep location_warning=1 to show it's an exception.
            // So we don't force it to 1 if it's already 1.
        }
    }
}