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
 *  \file       htdocs/custom/fichajestrabajadores/class/api_fichajestrabajadores.class.php
 *  \ingroup    fichajestrabajadores
 *  \brief      API para gestionar fichajes y jornadas laborales
 */

use Luracast\Restler\RestException;

require_once DOL_DOCUMENT_ROOT . '/api/class/api.class.php';
require_once DOL_DOCUMENT_ROOT . '/user/class/user.class.php';
require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/vacaciones.class.php';
require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/vacaciones_dias.class.php';
require_once __DIR__ . '/jornadalaboral.class.php';

/**
 * API class for fichajestrabajadores
 *
 * @access protected
 * @class  DolibarrApiAccess {@requires user,external}
 */
class FichajestrabajadoresApi extends DolibarrApi
{
    /**
     * @var array   $FIELDS     Mandatory fields, checked when create and update object
     */
    public $FIELDS = array(
        'fk_user',
    );

    /**
     * Constructor
     */
    public function __construct()
    {
        global $db, $conf;
        $this->db = $db;
    }


    /**
     * List fichajes
     *
     * Get a list of fichajes
     *
     * @param string    $sortfield  Sort field
     * @param string    $sortorder  Sort order
     * @param int       $limit      Limit for list
     * @param int       $page       Page number
     * @param string    $sqlfilters Other criteria to filter answers separated by a comma
     * @param int       $fk_user    Optional user id to filter fichajes
     * @return array                Array of fichajes objects
     *
     * @url GET /fichajes
     *
     * @throws RestException
     */
    public function index($sortfield = "f.rowid", $sortorder = 'ASC', $limit = 100, $page = 0, $sqlfilters = '', $fk_user = 0, $date_start = '', $date_end = '')
    {
        global $db, $conf;

        // Incluir la clase de fichajes
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            // Crear objeto de fichajes
            $fichaje = new FichajeTrabajador($db);

            // Verificar existencia de la tabla
            $sql_check = "SHOW TABLES LIKE '" . MAIN_DB_PREFIX . "fichajestrabajadores'";
            $resql_check = $db->query($sql_check);
            $tabla_existe = ($resql_check && $db->num_rows($resql_check) > 0);

            if (!$tabla_existe) {
                throw new RestException(500, 'La tabla de fichajes no existe en la base de datos');
            }

            // Contar registros en la tabla
            $sql_count = "SELECT COUNT(*) as total FROM " . MAIN_DB_PREFIX . "fichajestrabajadores";
            $resql_count = $db->query($sql_count);
            $num_registros = 0;
            if ($resql_count) {
                $obj_count = $db->fetch_object($resql_count);
                $num_registros = $obj_count->total;
            }

            // Si no hay registros, devolver array vacío
            if ($num_registros == 0) {
                return array();
            }

            // Determinar si se ha solicitado filtrar por usuario
            $userId = 0;

            // Priorizar el parámetro tipado de Restler
            if (!empty($fk_user)) {
                $userId = (int) $fk_user;
            } elseif (!empty($_GET['fk_user'])) {
                // Fallback por si Restler no mapea correctamente el parámetro
                $userId = (int) $_GET['fk_user'];
            }

            // SEGURIDAD: Si no es admin, forzar el filtro al usuario actual
            if (!DolibarrApiAccess::$user->admin) {
                $userId = DolibarrApiAccess::$user->id;
            }

            $date_start = !empty($date_start) ? $date_start : (!empty($_GET['date_start']) ? $_GET['date_start'] : '');
            $date_end = !empty($date_end) ? $date_end : (!empty($_GET['date_end']) ? $_GET['date_end'] : '');

            dol_syslog("FichajestrabajadoresApi::index - fk_user: " . $userId . ", date_start: " . $date_start . ", date_end: " . $date_end, LOG_DEBUG);

            // Obtener todos los fichajes (opcionalmente filtrados por usuario y fecha)
            $fichajes = $fichaje->getAllFichajes($userId, false, $date_start, $date_end);

            if (is_array($fichajes)) {
                // Aplicar paginación si se solicita
                if ($limit > 0 && $page > 0) {
                    $fichajes = array_slice($fichajes, ($limit * ($page - 1)), $limit);
                } elseif ($limit > 0) {
                    $fichajes = array_slice($fichajes, 0, $limit);
                }

                return $fichajes;
            } else {
                throw new RestException(500, 'Error al obtener fichajes: ' . $fichaje->error);
            }
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Registrar entrada
     *
     * @param array $request_data   Request data con usuario, observaciones y coordenadas (opcionales)
     * @return  array   Array con el resultado de la operación
     *
     * @url POST /registrarEntrada
     *
     * @throws RestException
     */
    public function registrarEntrada($request_data = null)
    {
        // Incluir la clase de fichajes
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            // Crear objeto de fichajes
            $fichaje = new FichajeTrabajador($this->db);

            // Obtener datos de la petición
            $usuario = isset($request_data['usuario']) ? $request_data['usuario'] : 'USUARIO';
            $observaciones = isset($request_data['observaciones']) ? $request_data['observaciones'] : '';
            $latitud = isset($request_data['latitud']) ? floatval($request_data['latitud']) : null;
            $longitud = isset($request_data['longitud']) ? floatval($request_data['longitud']) : null;
            $justification = isset($request_data['justification']) ? $request_data['justification'] : null;
            $location_warning = isset($request_data['location_warning']) ? (int) $request_data['location_warning'] : 0;

            // Registrar entrada
            if ($latitud !== null && $longitud !== null) {
                $result = $fichaje->registrarEntrada($usuario, $observaciones, $latitud, $longitud, null, $justification, $location_warning);
            } else {
                $result = $fichaje->registrarEntrada($usuario, $observaciones, null, null, null, $justification, $location_warning);
            }

            // Comprobar resultado
            if ($result > 0) {
                return array(
                    'success' => true,
                    'message' => 'Entrada registrada correctamente',
                    'id' => $result
                );
            } else {
                throw new RestException(500, 'Error al registrar entrada: ' . implode(', ', $fichaje->errors));
            }
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Registrar salida
     *
     * @param array $request_data   Request data con usuario, observaciones y coordenadas (opcionales)
     * @return  array   Array con el resultado de la operación
     *
     * @url POST /registrarSalida
     *
     * @throws RestException
     */
    public function registrarSalida($request_data = null)
    {
        // Incluir la clase de fichajes
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            // Crear objeto de fichajes
            $fichaje = new FichajeTrabajador($this->db);

            // Obtener datos de la petición
            $usuario = isset($request_data['usuario']) ? $request_data['usuario'] : 'USUARIO';
            $observaciones = isset($request_data['observaciones']) ? $request_data['observaciones'] : '';
            $latitud = isset($request_data['latitud']) ? floatval($request_data['latitud']) : null;
            $longitud = isset($request_data['longitud']) ? floatval($request_data['longitud']) : null;
            $justification = isset($request_data['justification']) ? $request_data['justification'] : null;
            $location_warning = isset($request_data['location_warning']) ? (int) $request_data['location_warning'] : 0;

            // Registrar salida
            if ($latitud !== null && $longitud !== null) {
                $result = $fichaje->registrarSalida($usuario, $observaciones, $latitud, $longitud, null, $justification, $location_warning);
            } else {
                $result = $fichaje->registrarSalida($usuario, $observaciones, null, null, null, $justification, $location_warning);
            }

            // Comprobar resultado
            if ($result > 0) {
                return array(
                    'success' => true,
                    'message' => 'Salida registrada correctamente',
                    'id' => $result
                );
            } else {
                throw new RestException(500, 'Error al registrar salida: ' . implode(', ', $fichaje->errors));
            }
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Iniciar pausa
     *
     * @param array $request_data   Request data con usuario, observaciones y coordenadas (opcionales)
     * @return  array   Array con el resultado de la operación
     *
     * @url POST /iniciarPausa
     *
     * @throws RestException
     */
    public function iniciarPausa($request_data = null)
    {
        // Incluir la clase de fichajes
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            // Crear objeto de fichajes
            $fichaje = new FichajeTrabajador($this->db);

            // Obtener datos de la petición
            $usuario = isset($request_data['usuario']) ? $request_data['usuario'] : 'USUARIO';
            $observaciones = isset($request_data['observaciones']) ? $request_data['observaciones'] : '';
            $latitud = isset($request_data['latitud']) ? floatval($request_data['latitud']) : null;
            $longitud = isset($request_data['longitud']) ? floatval($request_data['longitud']) : null;
            $justification = isset($request_data['justification']) ? $request_data['justification'] : null;
            $location_warning = isset($request_data['location_warning']) ? (int) $request_data['location_warning'] : 0;

            // Iniciar pausa
            if ($latitud !== null && $longitud !== null) {
                $result = $fichaje->iniciarPausa($usuario, $observaciones, $latitud, $longitud, null, $justification, $location_warning);
            } else {
                $result = $fichaje->iniciarPausa($usuario, $observaciones, null, null, null, $justification, $location_warning);
            }

            // Comprobar resultado
            if ($result > 0) {
                return array(
                    'success' => true,
                    'message' => 'Pausa iniciada correctamente',
                    'id' => $result
                );
            } else {
                throw new RestException(500, 'Error al iniciar pausa: ' . implode(', ', $fichaje->errors));
            }
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Terminar pausa
     *
     * @param array $request_data   Request data con usuario, observaciones y coordenadas (opcionales)
     * @return  array   Array con el resultado de la operación
     *
     * @url POST /terminarPausa
     *
     * @throws RestException
     */
    public function terminarPausa($request_data = null)
    {
        // Incluir la clase de fichajes
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            // Crear objeto de fichajes
            $fichaje = new FichajeTrabajador($this->db);

            // Obtener datos de la petición
            $usuario = isset($request_data['usuario']) ? $request_data['usuario'] : 'USUARIO';
            $observaciones = isset($request_data['observaciones']) ? $request_data['observaciones'] : '';
            $latitud = isset($request_data['latitud']) ? floatval($request_data['latitud']) : null;
            $longitud = isset($request_data['longitud']) ? floatval($request_data['longitud']) : null;
            $justification = isset($request_data['justification']) ? $request_data['justification'] : null;
            $location_warning = isset($request_data['location_warning']) ? (int) $request_data['location_warning'] : 0;

            // Terminar pausa
            if ($latitud !== null && $longitud !== null) {
                $result = $fichaje->terminarPausa($usuario, $observaciones, $latitud, $longitud, null, $justification, $location_warning);
            } else {
                $result = $fichaje->terminarPausa($usuario, $observaciones, null, null, null, $justification, $location_warning);
            }

            // Comprobar resultado
            if ($result > 0) {
                return array(
                    'success' => true,
                    'message' => 'Pausa terminada correctamente',
                    'id' => $result
                );
            } else {
                throw new RestException(500, 'Error al terminar pausa: ' . implode(', ', $fichaje->errors));
            }
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Insertar jornada completa de manera manual (entrada/salida/pausas con timestamp)
     *
     * @param array $request_data Request data
     *  - usuario: login del usuario (opcional, por defecto login del token)
     *  - fecha: YYYY-MM-DD
     *  - entrada_iso: ISO 8601 UTC (con Z recomendado)
     *  - salida_iso: ISO 8601 UTC (con Z recomendado)
     *  - pausas: array de { inicio_iso, fin_iso }
     *
     * @return array
     *
     * @url POST /insertarJornadaManual
     *
     * @throws RestException
     */
    public function insertarJornadaManual($request_data = null)
    {
        global $user;

        dol_include_once('/fichajestrabajadores/class/fichajestrabajadores.class.php');

        try {
            $fichaje = new FichajeTrabajador($this->db);

            $usuario = isset($request_data['usuario']) ? $request_data['usuario'] : $user->login;
            $fecha = isset($request_data['fecha']) ? $request_data['fecha'] : '';
            $entrada_iso = isset($request_data['entrada_iso']) ? $request_data['entrada_iso'] : '';
            $salida_iso = isset($request_data['salida_iso']) ? $request_data['salida_iso'] : '';
            $pausasRaw = isset($request_data['pausas']) && is_array($request_data['pausas']) ? $request_data['pausas'] : array();
            // Normalizar: a veces llega como array de stdClass (JSON decode)
            $pausas = array();
            foreach ($pausasRaw as $p) {
                if (is_object($p))
                    $p = (array) $p;
                if (is_array($p))
                    $pausas[] = $p;
            }

            $obs_fichaje = 'Insertado de manera manual por el trabajador';
            $obs_jornada = 'Jornada insertada de manera manual por el trabajador';

            $result = $fichaje->insertarJornadaManual($usuario, $fecha, $entrada_iso, $salida_iso, $pausas, $obs_fichaje, $obs_jornada, $user->id);

            if (!is_array($result) || empty($result['success'])) {
                throw new RestException(500, 'Error al insertar jornada manual: ' . implode(', ', $fichaje->errors));
            }

            return array(
                'success' => true,
                'message' => 'Jornada manual insertada correctamente',
                'ids_fichajes' => $result['ids_fichajes'],
                'id_jornada' => $result['id_jornada']
            );
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * List jornadas laborales
     *
     * Get a list of jornadas laborales
     *
     * @param int       $user_id    ID del usuario para filtrar (opcional)
     * @param string    $sortfield  Sort field
     * @param string    $sortorder  Sort order
     * @param int       $limit      Limit for list
     * @param int       $page       Page number
     * @param string    $sqlfilters Other criteria to filter answers separated by a comma
     * @return array                Array of jornadas laborales objects
     *
     * @url GET /jornadas
     *
     * @throws RestException
     */
    public function listarJornadas($user_id = 0, $sortfield = "j.rowid", $sortorder = 'ASC', $limit = 100, $page = 0, $sqlfilters = '')
    {
        $jornada = new JornadaLaboral($this->db);
        $jornadas = $jornada->getAllJornadas($user_id);

        if (!is_array($jornadas)) {
            throw new RestException(500, 'Error al obtener jornadas laborales');
        }

        return $jornadas;
    }

    /**
     * List jornadas completas
     *
     * Get a list of jornadas completas (igual al GET de fichajes)
     *
     * @param int    $usuario_id   ID del usuario para filtrar (opcional)
     * @param string $fecha_inicio Fecha inicio filtro (YYYY-MM-DD) (opcional)
     * @param string $fecha_fin    Fecha fin filtro (YYYY-MM-DD) (opcional)
     * @param int    $limit        Límite de resultados
     * @param int    $page         Número de página (1-based)
     * @return array               Array de jornadas completas
     *
     * @url GET /jornadas-completas
     *
     * @throws RestException
     */
    public function listarJornadasCompletas($usuario_id = 0, $fecha_inicio = '', $fecha_fin = '', $limit = 100, $page = 0)
    {
        global $db;

        // Incluir la clase de jornadas completas
        dol_include_once('/fichajestrabajadores/class/jornadacompleta.class.php');

        try {
            $jornada = new JornadaCompleta($this->db);

            // Verificar existencia de la tabla
            $sql_check = "SHOW TABLES LIKE '" . MAIN_DB_PREFIX . "jornadas_completas'";
            $resql_check = $db->query($sql_check);
            $tabla_existe = ($resql_check && $db->num_rows($resql_check) > 0);

            if (!$tabla_existe) {
                throw new RestException(500, 'La tabla de jornadas_completas no existe en la base de datos');
            }

            // Contar registros en la tabla
            $sql_count = "SELECT COUNT(*) as total FROM " . MAIN_DB_PREFIX . "jornadas_completas";
            $resql_count = $db->query($sql_count);
            $num_registros = 0;
            if ($resql_count) {
                $obj_count = $db->fetch_object($resql_count);
                $num_registros = $obj_count->total;
            }

            // Si no hay registros, devolver array vacío
            if ($num_registros == 0) {
                return array();
            }

            // Obtener jornadas completas aplicando filtros opcionales
            $jornadas = $jornada->getAllJornadas($usuario_id, $fecha_inicio, $fecha_fin);

            if (is_array($jornadas)) {
                // Paginación similar a fichajes
                if ($limit > 0 && $page > 0) {
                    $jornadas = array_slice($jornadas, ($limit * ($page - 1)), $limit);
                } elseif ($limit > 0) {
                    $jornadas = array_slice($jornadas, 0, $limit);
                }
                return $jornadas;
            }

            throw new RestException(500, 'Error al obtener jornadas completas' . ($jornada->error ? (': ' . $jornada->error) : ''));
        } catch (Exception $e) {
            throw new RestException(500, 'Error inesperado: ' . $e->getMessage());
        }
    }

    /**
     * Get properties of a jornada completa
     *
     * Return an array with jornada completa information
     *
     * @param int $id ID of jornada completa
     * @return array
     *
     * @url GET /jornadas-completas/{id}
     *
     * @throws RestException
     */
    public function getJornadaCompleta($id)
    {
        if (empty($id)) {
            throw new RestException(400, 'ID de jornada completa requerido');
        }

        // Incluir la clase de jornadas completas
        dol_include_once('/fichajestrabajadores/class/jornadacompleta.class.php');

        $jornada = new JornadaCompleta($this->db);
        $result = $jornada->fetch($id);

        if ($result <= 0) {
            throw new RestException(404, 'Jornada completa no encontrada');
        }

        return array(
            'id_jornada' => $jornada->id_jornada,
            'usuario_id' => $jornada->usuario_id,
            'usuario_nombre' => $jornada->usuario_nombre,
            'fecha' => $jornada->fecha,
            'hora_entrada' => $jornada->hora_entrada,
            'hora_salida' => $jornada->hora_salida,
            'total_pausa' => $jornada->total_pausa,
            'total_trabajo' => $jornada->total_trabajo,
            'observaciones' => $jornada->observaciones,
            'fecha_creacion' => $jornada->fecha_creacion,
            'active' => $jornada->active,
            'ultimo_editor' => $jornada->ultimo_editor,
            'editor_nombre' => $jornada->editor_nombre,
            'ultima_modificacion' => $jornada->ultima_modificacion
        );
    }

    /**
     * Update jornada completa (edición API)
     *
     * @param int   $id             ID de jornada completa
     * @param array $request_data   { usuario_id, fecha(YYYY-MM-DD), hora_entrada(HH:MM), hora_salida(HH:MM), total_pausa(HH:MM:SS), total_trabajo(HH:MM:SS), comentario }
     * @return array
     *
     * @url PUT /jornadas-completas/{id}
     */
    public function updateJornadaCompleta($id, $request_data = null)
    {
        global $user;

        if (empty($id)) {
            throw new RestException(400, 'ID de jornada completa requerido');
        }

        // Permisos: admin o permiso de configuración del módulo
        if (!$user->admin && empty($user->rights->fichajestrabajadores->config)) {
            throw new RestException(401, 'No tienes permiso para editar jornadas completas');
        }

        if (!is_array($request_data)) {
            throw new RestException(400, 'Cuerpo de la petición requerido');
        }

        $usuario_id = isset($request_data['usuario_id']) ? (int) $request_data['usuario_id'] : 0;
        $fecha = isset($request_data['fecha']) ? trim($request_data['fecha']) : '';
        $horaEntrada = isset($request_data['hora_entrada']) ? trim($request_data['hora_entrada']) : '';
        $horaSalida = isset($request_data['hora_salida']) ? trim($request_data['hora_salida']) : '';
        $totalPausa = isset($request_data['total_pausa']) ? trim($request_data['total_pausa']) : '';
        $totalTrabajo = isset($request_data['total_trabajo']) ? trim($request_data['total_trabajo']) : '';
        $comentario = isset($request_data['comentario']) ? trim($request_data['comentario']) : '';

        if (empty($comentario)) {
            throw new RestException(400, 'El comentario es obligatorio para la auditoría');
        }
        if (empty($fecha) || empty($horaEntrada) || empty($horaSalida)) {
            throw new RestException(400, 'Campos requeridos: fecha, hora_entrada y hora_salida');
        }

        // Normalizar HH:MM si llega HH:MM:SS
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $horaEntrada))
            $horaEntrada = substr($horaEntrada, 0, 5);
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $horaSalida))
            $horaSalida = substr($horaSalida, 0, 5);

        $horaEntradaDt = $fecha . ' ' . $horaEntrada . ':00';
        $horaSalidaDt = $fecha . ' ' . $horaSalida . ':00';
        $fechaTs = dol_mktime(0, 0, 0, (int) substr($fecha, 5, 2), (int) substr($fecha, 8, 2), (int) substr($fecha, 0, 4));

        dol_include_once('/fichajestrabajadores/class/jornadacompleta.class.php');
        $jornada = new JornadaCompleta($this->db);
        $exists = $jornada->fetch($id);
        if ($exists <= 0) {
            throw new RestException(404, 'Jornada completa no encontrada');
        }

        // Si no se recibe 'observaciones', usamos el comentario como observaciones para que
        // quede también reflejado en la tabla principal (además del histórico de auditoría)
        $observacionesReq = isset($request_data['observaciones']) ? trim($request_data['observaciones']) : '';

        $data = array(
            'usuario_id' => ($usuario_id > 0 ? $usuario_id : $jornada->usuario_id),
            'fecha' => $fechaTs,
            'hora_entrada' => $horaEntradaDt,
            'hora_salida' => $horaSalidaDt,
            'total_pausa' => $totalPausa !== '' ? $totalPausa : $jornada->total_pausa,
            'total_trabajo' => $totalTrabajo !== '' ? $totalTrabajo : $jornada->total_trabajo,
            'observaciones' => ($observacionesReq !== '' ? $observacionesReq : ($comentario !== '' ? $comentario : $jornada->observaciones)),
        );

        $res = $jornada->update($id, $data, $comentario);
        if ($res <= 0) {
            throw new RestException(500, 'No se pudo actualizar la jornada: ' . $jornada->error);
        }

        return array('success' => true, 'id' => (int) $id);
    }

    /**
     * Delete jornada completa
     *
     * @param int $id Jornada ID
     * @return array
     *
     * @url DELETE /jornadas-completas/{id}
     */
    public function deleteJornadaCompleta($id)
    {
        global $user;
        if (empty($id)) {
            throw new RestException(400, 'ID de jornada requerido');
        }
        if (!$user->admin && empty($user->rights->fichajestrabajadores->config)) {
            throw new RestException(401, 'No tienes permiso para eliminar jornadas completas');
        }

        dol_include_once('/fichajestrabajadores/class/jornadacompleta.class.php');
        $jornada = new JornadaCompleta($this->db);
        $exists = $jornada->fetch($id);
        if ($exists <= 0) {
            throw new RestException(404, 'Jornada completa no encontrada');
        }

        $res = $jornada->delete($id);
        if ($res <= 0) {
            throw new RestException(500, 'No se pudo eliminar la jornada: ' . $jornada->error);
        }
        return array('success' => true);
    }

    /**
     * Get audit logs of a jornada completa
     *
     * @param int $id Jornada ID
     * @return array
     *
     * @url GET /jornadas-completas/{id}/logs
     */
    public function getJornadaCompletaLogs($id)
    {
        global $user;
        if (empty($id)) {
            throw new RestException(400, 'ID de jornada requerido');
        }
        if (!$user->admin && empty($user->rights->fichajestrabajadores->config)) {
            throw new RestException(401, 'No tienes permiso para ver los registros de auditoría');
        }

        dol_include_once('/fichajestrabajadores/class/fichajelog.class.php');
        $log = new FichajeLog($this->db);
        $logs = $log->getAllLogs(0, $id);
        if (!is_array($logs)) {
            throw new RestException(500, 'Error al obtener registros de auditoría');
        }
        return $logs;
    }

    /**
     * Get properties of a jornada laboral
     *
     * Return an array with jornada laboral information
     *
     * @param   int     $id     ID of jornada laboral
     * @return  Object          Object with requested information
     *
     * @url GET /jornadas/{id}
     *
     * @throws RestException
     */
    public function getJornada($id)
    {
        if (empty($id)) {
            throw new RestException(400, 'ID de jornada requerido');
        }

        $jornada = new JornadaLaboral($this->db);
        $result = $jornada->fetch($id);

        if ($result <= 0) {
            throw new RestException(404, 'Jornada laboral no encontrada');
        }

        return array(
            'id' => $jornada->id,
            'fk_user' => $jornada->fk_user,
            'tipo_jornada' => $jornada->tipo_jornada,
            'tipo_turno' => $jornada->tipo_turno,
            'hora_inicio_jornada' => $jornada->hora_inicio_jornada,
            'hora_inicio_pausa' => $jornada->hora_inicio_pausa,
            'hora_fin_pausa' => $jornada->hora_fin_pausa,
            'hora_fin_jornada' => $jornada->hora_fin_jornada,
            'observaciones' => $jornada->observaciones,
            'fecha_creacion' => $jornada->fecha_creacion,
            'active' => $jornada->active
        );
    }

    /**
     * Create jornada laboral object
     *
     * @param array $request_data   Request data
     * @return int  ID of jornada
     *
     * @url POST /jornadas
     *
     * @throws RestException
     */
    public function createJornada($request_data = null)
    {
        if (!DolibarrApiAccess::$user->rights->fichajestrabajadores->write) {
            throw new RestException(401, 'No tienes permiso para crear jornadas laborales');
        }

        // Check mandatory fields
        $result = $this->_validate($request_data, array('fk_user', 'tipo_jornada', 'tipo_turno', 'hora_inicio_jornada', 'hora_fin_jornada'));

        $jornada = new JornadaLaboral($this->db);
        $id = $jornada->create($request_data['fk_user'], $request_data);

        if ($id <= 0) {
            throw new RestException(500, 'Error al crear jornada laboral: ' . implode(', ', $jornada->errors));
        }

        return $id;
    }

    /**
     * Update jornada laboral
     *
     * @param int   $id             ID of jornada to update
     * @param array $request_data   Datas
     * @return int                  ID of jornada
     *
     * @url PUT /jornadas/{id}
     *
     * @throws RestException
     */
    public function updateJornada($id, $request_data = null)
    {
        if (!DolibarrApiAccess::$user->rights->fichajestrabajadores->write) {
            throw new RestException(401, 'No tienes permiso para actualizar jornadas laborales');
        }

        $jornada = new JornadaLaboral($this->db);
        $result = $jornada->fetch($id);

        if ($result <= 0) {
            throw new RestException(404, 'Jornada laboral no encontrada');
        }

        $result = $jornada->update($id, $request_data);

        if ($result <= 0) {
            throw new RestException(500, 'Error al actualizar jornada laboral: ' . implode(', ', $jornada->errors));
        }

        return $id;
    }

    /**
     * Delete jornada laboral
     *
     * @param   int     $id     Jornada ID
     * @return  array           Array of deleted jornada
     *
     * @url DELETE /jornadas/{id}
     *
     * @throws RestException
     */
    public function deleteJornada($id)
    {
        if (!DolibarrApiAccess::$user->rights->fichajestrabajadores->delete) {
            throw new RestException(401, 'No tienes permiso para eliminar jornadas laborales');
        }

        $jornada = new JornadaLaboral($this->db);
        $result = $jornada->fetch($id);

        if ($result <= 0) {
            throw new RestException(404, 'Jornada laboral no encontrada');
        }

        // Save jornada data before delete
        $jornadaData = array(
            'id' => $jornada->id,
            'fk_user' => $jornada->fk_user,
            'tipo_jornada' => $jornada->tipo_jornada,
            'tipo_turno' => $jornada->tipo_turno
        );

        $result = $jornada->delete($id);

        if ($result <= 0) {
            throw new RestException(500, 'Error al eliminar jornada laboral: ' . implode(', ', $jornada->errors));
        }

        return $jornadaData;
    }

    /**
     * Get configuration parameter
     *
     * @param string    $param_name      Parameter name
     * @return array
     *
     * @url GET /getConfig
     * @throws RestException
     */
    public function getConfig()
    {
        global $user;
        // Permitir a cualquier usuario autenticado leer parámetros permitidos
        if (empty($user->id)) {
            throw new RestException(401, 'No autenticado');
        }

        $param_name = GETPOST('param_name', 'aZ09');

        if (empty($param_name)) {
            throw new RestException(400, 'Nombre de parámetro requerido');
        }

        // Incluir la clase de configuración
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php');
        $config = new FichajesTrabajadoresConfig($this->db);
        $value = $config->getParamValue($param_name);

        // La clase ya maneja los valores por defecto y valida nombres permitidos
        if ($value === false) {
            throw new RestException(404, 'Parámetro no encontrado');
        }

        return array('value' => $value);
    }

    /**
     * Update configuration parameter
     *
     * @param array     $request_data    Request data
     * @return array
     *
     * @url POST /setConfig
     * @throws RestException
     */
    public function setConfig($request_data = null)
    {
        global $user;

        if (!$user->admin && !$user->rights->fichajestrabajadores->config) {
            throw new RestException(401, 'Permiso denegado');
        }

        $param_name = GETPOST('param_name', 'aZ09');
        $param_value = GETPOST('value', 'nohtml');

        if (empty($param_name)) {
            throw new RestException(400, 'Nombre de parámetro requerido');
        }

        if (!isset($param_value)) {
            throw new RestException(400, 'El parámetro value es requerido');
        }

        // Validación específica para require_geolocation
        if ($param_name === 'require_geolocation' && !in_array($param_value, array('0', '1'))) {
            throw new RestException(400, 'Valor inválido para require_geolocation. Debe ser 0 o 1');
        }
        // Validación específica para logout_after_clock
        if ($param_name === 'logout_after_clock') {
            if (!$user->admin) {
                throw new RestException(401, 'Solo un administrador puede modificar logout_after_clock');
            }
            if (!in_array($param_value, array('0', '1'))) {
                throw new RestException(400, 'Valor inválido para logout_after_clock. Debe ser 0 o 1');
            }
        }

        // Incluir la clase de configuración
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php');
        $config = new FichajesTrabajadoresConfig($this->db);
        $result = $config->setParamValue($param_name, $param_value, $user);

        if ($result > 0) {
            return array('success' => true);
        }

        throw new RestException(500, 'Error al guardar la configuración');
    }

    /**
     * Validate fields before create or update object
     *
     * @param array $data   Data to validate
     * @param array $required   Required fields
     * @return array
     *
     * @throws RestException
     */
    private function _validate($data, $required = array())
    {
        foreach ($required as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                throw new RestException(400, "El campo '$field' es obligatorio");
            }
        }

        // Validar tipo_jornada
        if (isset($data['tipo_jornada']) && !empty($data['tipo_jornada'])) {
            $tipos_jornada = array('intensiva', 'partida');
            if (!in_array($data['tipo_jornada'], $tipos_jornada)) {
                throw new RestException(400, 'Tipo de jornada no válido: ' . $data['tipo_jornada']);
            }
        }

        // Validar tipo_turno
        if (isset($data['tipo_turno']) && !empty($data['tipo_turno'])) {
            $tipos_turno = array('fijo', 'rotativo');
            if (!in_array($data['tipo_turno'], $tipos_turno)) {
                throw new RestException(400, 'Tipo de turno no válido: ' . $data['tipo_turno']);
            }
        }

        return $data;
    }

    // ENDPOINTS DE VACACIONES

    /**
     * List vacation requests
     *
     * Get a list of vacation requests
     *
     * @param string $estado Filter by status
     * @param string $usuario Filter by user
     * @return array
     *
     * @url GET /vacaciones
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 500 Error getting vacation requests
     */
    public function listVacaciones($estado = '', $usuario = '')
    {
        $vacaciones = new Vacaciones($this->db);
        $result = $vacaciones->getAllVacaciones($estado, $usuario);

        if (!is_array($result)) {
            throw new RestException(500, 'Error al obtener las solicitudes: ' . join(', ', $vacaciones->errors));
        }

        return $result;
    }

    /**
     * Get vacation request
     *
     * @param int $id ID of vacation request
     * @return array
     *
     * @url GET /vacaciones/{id}
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 404 Not found
     */
    public function getVacacion($id)
    {
        if (!$id) {
            throw new RestException(400, 'ID de solicitud requerido');
        }

        $vacaciones = new Vacaciones($this->db);
        $result = $vacaciones->getVacacionesById($id);

        if (!$result) {
            throw new RestException(404, 'Solicitud no encontrada');
        }

        return $result;
    }

    /**
     * Create vacation request
     *
     * @param array $request_data   Request data
     * @return array
     *
     * @url POST /vacaciones/crear
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 404 Not found
     * @throws RestException 500 Error creating vacation request
     */
    public function createVacacion($request_data = null)
    {
        if (!isset($request_data)) {
            throw new RestException(400, 'Datos de solicitud requeridos');
        }

        if (empty($request_data['usuario']) || empty($request_data['fecha_inicio']) || empty($request_data['fecha_fin'])) {
            throw new RestException(400, 'Faltan datos requeridos (usuario, fecha_inicio, fecha_fin)');
        }

        $vacaciones = new Vacaciones($this->db);
        $tipo = isset($request_data['tipo']) ? $request_data['tipo'] : 'vacaciones';

        $result = $vacaciones->registrarVacaciones(
            $request_data['usuario'],
            $request_data['fecha_inicio'],
            $request_data['fecha_fin'],
            isset($request_data['comentarios']) ? $request_data['comentarios'] : '',
            $tipo
        );

        if ($result < 0) {
            // Validation errors should return 400 Bad Request, not 500
            $errorMsg = !empty($vacaciones->errors) ? join('. ', $vacaciones->errors) : 'Error al crear la solicitud';
            throw new RestException(400, $errorMsg);
        }

        return array(
            'id' => $result,
            'message' => 'Solicitud creada correctamente'
        );
    }

    /**
     * Approve vacation request
     *
     * @param int $id ID of vacation request
     * @param array $request_data Request data
     * @return array
     *
     * @url POST /vacaciones/{id}/aprobar
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 404 Not found
     * @throws RestException 500 Error approving vacation request
     */
    public function aprobarVacacion($id, $request_data = null)
    {
        // Comprobar permiso específico del módulo para aprobar/rechazar vacaciones
        if (empty(DolibarrApiAccess::$user->rights->fichajestrabajadores->vacacionesapprove)) {
            throw new RestException(401, 'No tienes permiso para aprobar vacaciones');
        }

        if (!isset($request_data) || !isset($request_data['supervisor'])) {
            throw new RestException(400, 'Supervisor requerido');
        }

        $vacaciones = new Vacaciones($this->db);
        $result = $vacaciones->aprobarSolicitud(
            $id,
            $request_data['supervisor'],
            isset($request_data['comentarios']) ? $request_data['comentarios'] : ''
        );

        if ($result < 0) {
            throw new RestException(500, 'Error al aprobar la solicitud: ' . join(', ', $vacaciones->errors));
        }

        return array(
            'message' => 'Solicitud aprobada correctamente'
        );
    }

    /**
     * Reject vacation request
     *
     * @param int $id ID of vacation request
     * @param array $request_data Request data
     * @return array
     *
     * @url POST /vacaciones/{id}/rechazar
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 404 Not found
     * @throws RestException 500 Error rejecting vacation request
     */
    public function rechazarVacacion($id, $request_data = null)
    {
        // Comprobar permiso específico del módulo para aprobar/rechazar vacaciones
        if (empty(DolibarrApiAccess::$user->rights->fichajestrabajadores->vacacionesapprove)) {
            throw new RestException(401, 'No tienes permiso para rechazar vacaciones');
        }

        if (!isset($request_data) || !isset($request_data['supervisor'])) {
            throw new RestException(400, 'Supervisor requerido');
        }

        $vacaciones = new Vacaciones($this->db);
        $result = $vacaciones->rechazarSolicitud(
            $id,
            $request_data['supervisor'],
            isset($request_data['comentarios']) ? $request_data['comentarios'] : ''
        );

        if ($result < 0) {
            throw new RestException(500, 'Error al rechazar la solicitud: ' . join(', ', $vacaciones->errors));
        }

        return array(
            'message' => 'Solicitud rechazada correctamente'
        );
    }

    /**
     * Delete vacation request
     *
     * @param int $id ID of vacation request
     * @return array
     *
     * @url DELETE /vacaciones/{id}
     * 
     * @throws RestException 401 Not authenticated
     * @throws RestException 404 Not found
     * @throws RestException 500 Error deleting vacation request
     */
    public function deleteVacacion($id)
    {
        if (!$id) {
            throw new RestException(400, 'ID de solicitud requerido');
        }

        $vacaciones = new Vacaciones($this->db);
        $result = $vacaciones->eliminarSolicitud($id);

        if ($result < 0) {
            throw new RestException(500, 'Error al eliminar la solicitud: ' . join(', ', $vacaciones->errors));
        }

        return array(
            'message' => 'Solicitud eliminada correctamente'
        );
    }

    /**
     * Listar días de vacaciones permitidos por usuario para un año
     *
     * @param int $anio Año (opcional; por defecto, año actual)
     * @return array
     *
     * @url GET /vacaciones/dias
     */
    public function listVacacionesDias($anio = 0)
    {
        global $conf;
        $anio = (int) ($anio ?: date('Y'));
        $svc = new VacacionesDias($this->db);
        $svc->backfillForYear($anio, $conf->entity);
        $rows = $svc->listByYear($anio, $conf->entity);
        if (!is_array($rows)) {
            throw new RestException(500, 'Error al listar días de vacaciones');
        }
        return $rows;
    }

    /**
     * Actualizar días de vacaciones de un usuario para un año
     *
     * @param array $request_data { fk_user, anio, dias }
     * @return array
     *
     * @url POST /vacaciones/dias/set
     */
    public function setVacacionesDias($request_data = null)
    {
        global $user, $conf;
        if (empty($user->rights->fichajestrabajadores->vacacioneseditdays)) {
            throw new RestException(401, 'No tienes permiso para modificar días de vacaciones');
        }
        if (!is_array($request_data)) {
            throw new RestException(400, 'Cuerpo de la petición requerido');
        }
        $fk_user = isset($request_data['fk_user']) ? (int) $request_data['fk_user'] : 0;
        $anio = isset($request_data['anio']) ? (int) $request_data['anio'] : (int) date('Y');
        $dias = isset($request_data['dias']) ? (int) $request_data['dias'] : null;
        if ($fk_user <= 0 || $dias === null) {
            throw new RestException(400, 'Parámetros inválidos (fk_user, dias)');
        }
        $svc = new VacacionesDias($this->db);
        $res = $svc->setDays($fk_user, $anio, $dias, $conf->entity);
        if ($res < 0) {
            throw new RestException(500, 'No se pudo actualizar');
        }
        return array('success' => true);
    }

    /**
     * Actualizar días de vacaciones (versión PUT)
     *
     * @param array $request_data { fk_user, anio, dias }
     * @return array
     *
     * @url PUT /vacaciones/dias
     */
    public function putVacacionesDias($request_data = null)
    {
        // Reutilizamos la misma lógica del POST
        return $this->setVacacionesDias($request_data);
    }

    /**
     * List snapshots of original jornadas before modifications
     *
     * @param int    $id_jornada   Filter by jornada id
     * @param int    $usuario_id   Filter by user id
     * @param string $desde        Filter from date (YYYY-MM-DD)
     * @param string $hasta        Filter to date (YYYY-MM-DD)
     * @param int    $limit        Limit results
     * @param int    $page         Page number (1-based)
     * @return array               Array of snapshot rows
     *
     * @url GET /fichajes-originales-modificados
     *
     * @throws RestException
     */
    public function listarFichajesOriginalesModificados($id_jornada = 0, $usuario_id = 0, $desde = '', $hasta = '', $limit = 100, $page = 0)
    {
        global $db;

        $rows = array();

        // Verificar existencia de la tabla
        $sql_check = "SHOW TABLES LIKE '" . MAIN_DB_PREFIX . "fichajes_originales_modificados'";
        $resql_check = $db->query($sql_check);
        $tabla_existe = ($resql_check && $db->num_rows($resql_check) > 0);

        if (!$tabla_existe) {
            throw new RestException(500, 'La tabla de fichajes_originales_modificados no existe en la base de datos');
        }

        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajes_originales_modificados WHERE 1=1";
        if ($id_jornada > 0) {
            $sql .= " AND id_jornada = " . (int) $id_jornada;
        }
        if ($usuario_id > 0) {
            $sql .= " AND usuario_id = " . (int) $usuario_id;
        }
        if (!empty($desde)) {
            $sql .= " AND modificado_en >= '" . $db->escape($desde) . " 00:00:00'";
        }
        if (!empty($hasta)) {
            $sql .= " AND modificado_en <= '" . $db->escape($hasta) . " 23:59:59'";
        }
        $sql .= " ORDER BY modificado_en DESC";

        // Paginación
        if ($limit > 0) {
            if ($page > 0) {
                $offset = ($limit * ($page - 1));
            } else {
                $offset = 0;
            }
            $sql .= " LIMIT " . (int) $limit . " OFFSET " . (int) $offset;
        }

        $resql = $db->query($sql);
        if ($resql) {
            while ($obj = $db->fetch_object($resql)) {
                $rows[] = $obj;
            }
            $db->free($resql);
            return $rows;
        }

        throw new RestException(500, 'Error al obtener el historial: ' . $db->lasterror());
    }

    /**
     * Get current user info
     *
     * @return array
     *
     * @url GET /info
     */
    public function info()
    {
        global $user;
        if (empty($user->id)) {
            throw new RestException(401, 'Usuario no autenticado');
        }

        // Obtener configuración de centro de trabajo
        dol_include_once('/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php');
        $config = new FichajesTrabajadoresConfig($this->db);
        $work_center_id = $config->getParamValue('work_center_id', $user->id);
        $work_centers_ids = $config->getParamValue('work_centers_ids', $user->id);

        return array(
            'id' => $user->id,
            'login' => $user->login,
            'firstname' => $user->firstname,
            'lastname' => $user->lastname,
            'email' => $user->email,
            'admin' => !empty($user->admin) ? true : false,
            'entity' => $user->entity,
            'workplace_center_id' => $work_center_id ? (int) $work_center_id : null,
            'work_centers_ids' => $work_centers_ids ? $work_centers_ids : null
        );
    }

    // ENDPOINTS DE CONFIGURACIÓN DE USUARIO

    /**
     * Get user configuration
     *
     * @param int $id User ID
     * @return array
     *
     * @url GET /userconfig/{id}
     */
    public function getUserConfig($id)
    {
        global $db, $conf;

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php';
        $confClass = new FichajesTrabajadoresConfig($db);

        $config = array();
        $allowed = $confClass->getAllowedParams();

        foreach ($allowed as $param) {
            // getParamValue resuelve: Usuario > Global > Default
            // Esto asegura que el frontend reciba el valor EFECTIVO que se usará en la lógica
            $val = $confClass->getParamValue($param, $id);
            if ($val !== false) {
                $config[$param] = $val;
            }
        }

        return $config;
    }

    /**
     * Set user configuration
     *
     * @param int $id User ID
     * @param array $request_data { param_name, value }
     * @return array
     *
     * @url POST /users/{id}/config
     */
    public function setUserConfig($id, $request_data = null)
    {
        global $db;

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php';

        if (!is_array($request_data)) {
            throw new RestException(400, 'Bad Request');
        }

        $param_name = isset($request_data['param_name']) ? $request_data['param_name'] : '';
        $value = isset($request_data['value']) ? $request_data['value'] : '';

        $confClass = new FichajesTrabajadoresConfig($db);
        $res = $confClass->setUserParamValue($id, $param_name, $value);

        if ($res > 0) {
            return array('success' => true, 'message' => 'Configurada actualizada', 'debug_value' => $value);
        }

        throw new RestException(500, 'Error al actualizar configuración');
    }

    // --- CENTERS OPERATIONS ---

    /**
     * Get list of centers
     *
     * @return array List of centers
     *
     * @url GET /centers
     */
    public function getCenters()
    {
        $sql = "SELECT rowid, label, latitude, longitude, radius FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_centers";
        $resql = $this->db->query($sql);

        $centers = array();
        if ($resql) {
            while ($obj = $this->db->fetch_object($resql)) {
                $centers[] = $obj;
            }
        }
        return $centers;
    }

    /**
     * Create a new center
     *
     * @param array $request_data   Center data (label, latitude, longitude, radius)
     * @return int Center ID or 0 if error
     *
     * @url POST /centers
     */
    public function createCenter($request_data = null)
    {
        if (!is_array($request_data)) {
            return 0;
        }
        $label = isset($request_data['label']) ? $request_data['label'] : '';
        $latitude = isset($request_data['latitude']) ? $request_data['latitude'] : 0;
        $longitude = isset($request_data['longitude']) ? $request_data['longitude'] : 0;
        $radius = isset($request_data['radius']) ? $request_data['radius'] : 100;

        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_centers (label, latitude, longitude, radius) VALUES ('" . $this->db->escape($label) . "', " . $latitude . ", " . $longitude . ", " . $radius . ")";
        $resql = $this->db->query($sql);
        if ($resql) {
            return $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores_centers");
        }
        return 0;
    }

    /**
     * Update center
     *
     * @param int $id Center ID
     * @param array $request_data   Center data (label, latitude, longitude, radius)
     * @return int 1 if success, 0 error
     *
     * @url PUT /centers/{id}
     */
    public function updateCenter($id, $request_data = null)
    {
        if (!is_array($request_data)) {
            return 0;
        }

        $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_centers SET ";
        $updates = array();

        if (isset($request_data['label']))
            $updates[] = "label = '" . $this->db->escape($request_data['label']) . "'";
        if (isset($request_data['latitude']))
            $updates[] = "latitude = " . $request_data['latitude'];
        if (isset($request_data['longitude']))
            $updates[] = "longitude = " . $request_data['longitude'];
        if (isset($request_data['radius']))
            $updates[] = "radius = " . $request_data['radius'];

        if (empty($updates)) {
            return 1; // Nothing to update
        }

        $sql .= implode(", ", $updates);
        $sql .= " WHERE rowid = " . $id;

        $resql = $this->db->query($sql);
        if ($resql) {
            return 1;
        }
        return 0;
    }

    /**
     * Delete a center
     *
     * @param int $id Center ID
     * @return int 1 if success, 0 error
     *
     * @url DELETE /centers/{id}
     */
    public function deleteCenter($id)
    {
        $sql = "DELETE FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_centers WHERE rowid = " . $id;
        $resql = $this->db->query($sql);
        if ($resql) {
            return 1;
        }
        return 0;
    }



    // ENDPOINTS DE CORRECCIONES (SOLICITUDES DE EDICIÓN)

    /**
     * List correction requests
     *
     * @param int $fk_user Filter by user ID
     * @param string $estado Filter by status (pendiente, aprobada, rechazada)
     * @return array
     *
     * @url GET /corrections
     */
    public function listCorrections($fk_user = 0, $estado = '')
    {
        global $user;
        // Normal user can only see their own
        if (!$user->admin) {
            if ($fk_user > 0 && $fk_user != $user->id) {
                throw new RestException(401, 'No puedes ver correcciones de otros usuarios');
            }
            $fk_user = $user->id;
        }

        dol_include_once('/fichajestrabajadores/class/fichajescorrections.class.php');
        $corrections = new FichajesCorrections($this->db);
        return $corrections->listCorrections($fk_user, $estado);
    }

    /**
     * Create correction request
     *
     * @param array $request_data { fk_user, fecha_jornada, hora_entrada, hora_salida, pausas, observaciones }
     * @return array
     *
     * @url POST /corrections
     */
    public function createCorrection($request_data = null)
    {
        global $user;

        $fk_user = isset($request_data['fk_user']) ? $request_data['fk_user'] : $user->id;

        // Validation: user can only create for self unless admin
        if ($fk_user != $user->id && !$user->admin) {
            throw new RestException(401, 'No puedes solicitar correcciones para otros');
        }

        dol_include_once('/fichajestrabajadores/class/fichajescorrections.class.php');
        $correction = new FichajesCorrections($this->db);

        $res = $correction->create(
            $fk_user,
            $request_data['fecha_jornada'],
            $request_data['hora_entrada'],
            $request_data['hora_salida'],
            isset($request_data['pausas']) ? $request_data['pausas'] : array(),
            isset($request_data['observaciones']) ? $request_data['observaciones'] : ''
        );

        if ($res > 0) {
            return array('success' => true, 'id' => $res);
        }
        throw new RestException(500, 'Error creando solicitud: ' . implode(', ', $correction->errors));
    }

    /**
     * Approve correction request
     *
     * @param int $id Correction ID
     * @return array
     *
     * @url POST /corrections/{id}/approve
     */
    public function approveCorrection($id)
    {
        global $user;
        if (!$user->admin && empty($user->rights->fichajestrabajadores->config)) {
            throw new RestException(401, 'No tienes permiso para aprobar correcciones');
        }

        dol_include_once('/fichajestrabajadores/class/fichajescorrections.class.php');
        $correction = new FichajesCorrections($this->db);

        $res = $correction->approve($id, $user->id);
        if ($res > 0) {
            return array('success' => true);
        }
        throw new RestException(500, 'Error aprobando corrección: ' . implode(', ', $correction->errors));
    }

    /**
     * Reject correction request
     *
     * @param int $id Correction ID
     * @return array
     *
     * @url POST /corrections/{id}/reject
     */
    public function rejectCorrection($id)
    {
        global $user;
        if (!$user->admin && empty($user->rights->fichajestrabajadores->config)) {
            throw new RestException(401, 'No tienes permiso para rechazar correcciones');
        }

        dol_include_once('/fichajestrabajadores/class/fichajescorrections.class.php');
        $correction = new FichajesCorrections($this->db);

        $res = $correction->reject($id, $user->id);
        if ($res > 0) {
            return array('success' => true);
        }
        throw new RestException(500, 'Error rechazando corrección: ' . implode(', ', $correction->errors));
    }

    /**
     * Get snapshot by id
     *
     * @param int $id Snapshot rowid
     * @return array
     *
     * @url GET /fichajes-originales-modificados/{id}
     *
     * @throws RestException
     */
    public function getFichajeOriginalModificado($id)
    {
        global $db;

        if (empty($id)) {
            throw new RestException(400, 'ID requerido');
        }

        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajes_originales_modificados WHERE rowid = " . (int) $id;
        $resql = $db->query($sql);
        if ($resql) {
            $obj = $db->fetch_object($resql);
            $db->free($resql);
            if ($obj)
                return $obj;
            throw new RestException(404, 'No encontrado');
        }

        throw new RestException(500, 'Error al obtener el registro: ' . $db->lasterror());
    }

    /**
     * Get pending validation fichajes for current user
     *
     * @return array
     *
     * @url GET /fichajes/pending
     *
     * @throws RestException
     */
    public function getPendingValidation()
    {
        global $db, $user;

        if (!$user->id) {
            throw new RestException(401, 'Unauthorized');
        }

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadores.class.php';
        $fichaje = new FichajeTrabajador($db);

        $res = $fichaje->getPendingValidationFichajes($user->id);

        if (is_array($res)) {
            return $res;
        } else {
            throw new RestException(500, 'Error getting pending fichajes: ' . $fichaje->error);
        }
    }

    /**
     * Accept admin change
     *
     * @param int $id Fichaje ID
     * @return array
     *
     * @url POST /fichajes/{id}/accept
     *
     * @throws RestException
     */
    public function acceptChange($id)
    {
        global $db, $user;

        if (!$user->id) {
            throw new RestException(401, 'Unauthorized');
        }

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadores.class.php';
        $fichaje = new FichajeTrabajador($db);

        // Verify ownership
        $sql = "SELECT fk_user FROM " . MAIN_DB_PREFIX . "fichajestrabajadores WHERE rowid = " . (int) $id;
        $res = $db->query($sql);
        if ($res && $db->num_rows($res) > 0) {
            $obj = $db->fetch_object($res);
            if ($obj->fk_user != $user->id) {
                throw new RestException(403, 'Forbidden: You can only accept changes for your own records');
            }
        } else {
            throw new RestException(404, 'Record not found');
        }

        $res = $fichaje->update($id, array('estado_aceptacion' => 'aceptado'), 'Cambio aceptado por el trabajador');
        if ($res > 0) {
            return array('success' => true, 'message' => 'Cambio aceptado correctamente');
        } else {
            throw new RestException(500, 'Error updating record: ' . $fichaje->error);
        }
    }

    /**
     * Reject admin change
     *
     * @param int $id Fichaje ID
     * @return array
     *
     * @url POST /fichajes/{id}/reject
     * 
     * @throws RestException
     */
    public function rejectChange($id)
    {
        global $db, $user;

        if (!$user->id) {
            throw new RestException(401, 'Unauthorized');
        }

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajestrabajadores.class.php';
        $fichaje = new FichajeTrabajador($db);

        // Verify ownership
        $sql = "SELECT fk_user FROM " . MAIN_DB_PREFIX . "fichajestrabajadores WHERE rowid = " . (int) $id;
        $res = $db->query($sql);
        if ($res && $db->num_rows($res) > 0) {
            $obj = $db->fetch_object($res);
            if ($obj->fk_user != $user->id) {
                throw new RestException(403, 'Forbidden: You can only reject changes for your own records');
            }
        } else {
            throw new RestException(404, 'Record not found');
        }

        $res = $fichaje->update($id, array('estado_aceptacion' => 'rechazado'), 'Cambio rechazado por el trabajador');
        if ($res > 0) {
            return array('success' => true, 'message' => 'Cambio rechazado correctamente');
        } else {
            throw new RestException(500, 'Error updating record: ' . $fichaje->error);
        }
    }

    /**
     * Get history of changes for a fichaje
     *
     * @param int $id Fichaje ID
     * @return array
     *
     * @url GET /fichajes/{id}/history
     *
     * @throws RestException
     */
    public function getHistory($id)
    {
        global $db, $user;

        if (!$user->id) {
            throw new RestException(401, 'Unauthorized');
        }

        // Verify ownership or admin
        $sql = "SELECT fk_user FROM " . MAIN_DB_PREFIX . "fichajestrabajadores WHERE rowid = " . (int) $id;
        $res = $db->query($sql);
        if ($res && $db->num_rows($res) > 0) {
            $obj = $db->fetch_object($res);
            if ($obj->fk_user != $user->id && !$user->admin) {
                throw new RestException(403, 'Forbidden: You can only view history for your own records');
            }
        } else {
            throw new RestException(404, 'Record not found');
        }

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajelog.class.php';
        $log = new FichajeLog($db);

        $res = $log->getAllLogs($id);

        if (is_array($res)) {
            return $res;
        } else {
            throw new RestException(500, 'Error getting history: ' . $log->error);
        }
    }

    /**
     * Get global audit logs (filtered by user for workers, all for admins)
     *
     * @param int $id_user Optional user filter for admins
     * @return array
     *
     * @url GET /fichajes/history
     *
     * @throws RestException
     */
    public function getAuditLogs($id_user = 0)
    {
        global $db, $user;

        if (!$user->id) {
            throw new RestException(401, 'Unauthorized');
        }

        require_once DOL_DOCUMENT_ROOT . '/custom/fichajestrabajadores/class/fichajelog.class.php';
        $log = new FichajeLog($db);

        $filterUser = 0;
        if (!$user->admin) {
            $filterUser = $user->id;
        } elseif ($id_user > 0) {
            $filterUser = $id_user;
        }

        $res = $log->getAllLogs(0, 0, $filterUser);

        if (is_array($res)) {
            return $res;
        } else {
            throw new RestException(500, 'Error getting audit logs: ' . $log->error);
        }
    }
}