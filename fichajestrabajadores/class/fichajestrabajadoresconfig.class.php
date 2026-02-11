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
 *  \file       htdocs/custom/fichajestrabajadores/class/fichajestrabajadoresconfig.class.php
 *  \ingroup    fichajestrabajadores
 *  \brief      Clase para gestionar la configuración del módulo
 */

require_once DOL_DOCUMENT_ROOT . '/core/lib/admin.lib.php';

/**
 * Class for managing module configuration
 */
class FichajesTrabajadoresConfig
{
    /**
     * @var DoliDB Database handler
     */
    public $db;

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
     * Get parameter value (Global or User specific)
     *
     * @param string $param_name Parameter name
     * @param int $fk_user User ID (optional, if set checks user config first)
     * @return string|false Parameter value or false if not found
     */
    public function getParamValue($param_name, $fk_user = 0)
    {
        global $conf;

        // Validar nombre del parámetro
        if (!$this->isValidParamName($param_name)) {
            return false;
        }

        // Si se especifica usuario, buscar configuración específica
        if ($fk_user > 0) {
            $userValue = $this->getUserParamValue($fk_user, $param_name);
            if ($userValue !== false && $userValue !== null) {
                return $userValue;
            }
        }

        // Construir nombre completo del parámetro global
        $full_param_name = 'FICHAJESTRABAJADORES_' . strtoupper($param_name);

        // Obtener valor global
        $value = dolibarr_get_const($this->db, $full_param_name);

        // Si el valor está vacío o es false, devolver valor por defecto
        if ($value === false || $value === '' || $value === null) {
            // Valores por defecto para parámetros conocidos
            if ($param_name === 'require_geolocation') {
                return '1'; // Por defecto activada
            }
            if ($param_name === 'logout_after_clock') {
                return '0'; // Por defecto desactivado
            }
            return false;
        }

        return $value;
    }

    /**
     * Set parameter value (Global)
     *
     * @param string $param_name Parameter name
     * @param string $value Parameter value
     * @param User $user User making the change
     * @return int >0 if OK, <0 if KO
     */
    public function setParamValue($param_name, $value, $user)
    {
        global $conf;

        // Validar nombre del parámetro
        if (!$this->isValidParamName($param_name)) {
            return -1;
        }

        // Construir nombre completo del parámetro
        $full_param_name = 'FICHAJESTRABAJADORES_' . strtoupper($param_name);

        // Guardar valor
        return dolibarr_set_const($this->db, $full_param_name, $value, 'chaine', 0, '', $conf->entity);
    }

    /**
     * Get user specific parameter value
     * 
     * @param int $fk_user User ID
     * @param string $param_name Parameter name
     * @return string|null|false Value, null if not set, false if error
     */
    public function getUserParamValue($fk_user, $param_name)
    {
        global $conf;

        $sql = "SELECT param_value FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_user_config";
        $sql .= " WHERE fk_user = " . (int) $fk_user;
        $sql .= " AND param_name = '" . $this->db->escape($param_name) . "'";
        $sql .= " AND entity = " . (int) $conf->entity;

        $resql = $this->db->query($sql);
        if ($resql) {
            if ($this->db->num_rows($resql) > 0) {
                $obj = $this->db->fetch_object($resql);
                return $obj->param_value;
            }
            return null; // No configurado para este usuario
        }
        return false;
    }

    /**
     * Set user specific parameter value
     * 
     * @param int $fk_user User ID
     * @param string $param_name Parameter name
     * @param string $value Parameter value
     * @return int >0 if OK, <0 if KO
     */
    public function setUserParamValue($fk_user, $param_name, $value)
    {
        global $conf;

        if (!$this->isValidParamName($param_name)) {
            return -1;
        }

        // Check if exists
        $current = $this->getUserParamValue($fk_user, $param_name);

        if ($current === null) {
            $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_user_config";
            $sql .= " (fk_user, param_name, param_value, entity)";
            $sql .= " VALUES (" . (int) $fk_user . ", '" . $this->db->escape($param_name) . "', '" . $this->db->escape($value) . "', " . (int) $conf->entity . ")";
        } else {
            $sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_user_config";
            $sql .= " SET param_value = '" . $this->db->escape($value) . "'";
            $sql .= " WHERE fk_user = " . (int) $fk_user;
            $sql .= " AND param_name = '" . $this->db->escape($param_name) . "'";
            $sql .= " AND entity = " . (int) $conf->entity;
        }

        $resql = $this->db->query($sql);
        if ($resql) {
            return 1;
        }
        return -1;
    }

    /**
     * Get list of allowed parameters
     * @return array
     */
    public function getAllowedParams()
    {
        return array(
            'require_geolocation',
            'logout_after_clock',
            // Nuevos parametros para configuración de usuario
            'schedule_type',     // intesiva/partida
            'shift_type',        // fijo/rotativo
            'work_hours_daily',  // 8
            'entry_time_margin', // margen entrada en minutos
            // Parametros para geolocalizacion y horarios especificos
            'geolocation_lat',
            'geolocation_lon',
            'geolocation_radius',
            'schedule_start_1',
            'schedule_end_1',
            'schedule_start_2',
            'schedule_end_2',
            // Work Centers
            'work_centers_ids',
            'work_center_id'
        );
    }

    /**
     * Validate parameter name
     *
     * @param string $param_name Parameter name
     * @return bool True if valid, false otherwise
     */
    private function isValidParamName($param_name)
    {
        return in_array($param_name, $this->getAllowedParams());
    }
}