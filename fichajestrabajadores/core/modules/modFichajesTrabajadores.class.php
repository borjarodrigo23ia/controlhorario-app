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
 * \file    htdocs/custom/fichajestrabajadores/core/modules/modFichajesTrabajadores.class.php
 * \ingroup fichajestrabajadores
 * \brief   Archivo de descripción y activación del módulo FichajesTrabajadores.
 */
include_once DOL_DOCUMENT_ROOT . '/core/modules/DolibarrModules.class.php';

/**
 * Clase de descripción y activación del módulo FichajesTrabajadores
 */
class modFichajesTrabajadores extends DolibarrModules
{
    /**
     * Constructor. Define nombres, constantes, directorios, cajas, permisos
     *
     * @param DoliDB $db Manejador de la base de datos
     */
    public function __construct($db)
    {
        global $langs, $conf;

        $this->db = $db;

        // Id para el módulo (debe ser único).
        $this->numero = 447000; // Número elegido arbitrariamente
        // Clave para identificar el módulo (para permisos, menús, etc.)
        $this->rights_class = 'fichajestrabajadores';

        // Familia a la que pertenece el módulo
        $this->family = "hr";
        // Posición del módulo en la familia (01, 10, 20, ...)
        $this->module_position = '90';

        // Nombre del módulo
        $this->name = preg_replace('/^mod/i', '', get_class($this));
        // Descripción del módulo
        $this->description = "Módulo sencillo para el registro de fichajes de trabajadores";

        // Versión del módulo
        $this->version = '2.7';

        // Clave utilizada en la tabla llx_const para guardar el estado habilitado/deshabilitado del módulo
        $this->const_name = 'MAIN_MODULE_' . strtoupper($this->name);

        // Where to store the module in setup page (0=common, 1=interface, 2=others, 3=very specific)
        $this->special = 1;

        // Name of the image file used for this module.
        // If file is in theme/yourtheme/img directory, path is 'theme/yourtheme/img/object_fichajestrabajadores.png'
        // If file is in module/img directory, path is 'img/object_fichajestrabajadores.png'
        $this->picto = 'technic';

        // Data arrays to define the generated tables
        // (See the README file for structure)
        $this->module_parts = array(
            'css' => array(),
            'js' => array(),
            'hooks' => array('toprightmenu')
        );

        // Definición de tablas
        $this->tables_sql = array(
            'llx_fichajestrabajadores_registros.sql',
            'llx_jornadas_laborales.sql',
            'llx_fichajestrabajadores_user_config.sql',
            'llx_fichajestrabajadores_centers.sql'
        );
        // Definir algunas características soportadas por el módulo (triggers, login, sustituciones, menús, css, etc...)
        $this->module_parts = array(
            'triggers' => 0,                            // Set this to 1 if module has its own trigger directory
            'login' => 0,                               // Set this to 1 if module has its own login method
            'css' => array(),                            // No CSS files - this is API only module
            'hooks' => array(),                         // Set here all hooks context managed by module
            'moduleforexternal' => 0,                   // Set this to 1 if features of module are opened to external users
            'api' => array(
                'class' => array('FichajestrabajadoresApi'),
                'path' => array('/fichajestrabajadores/class/'),
            ),
        );

        // Directorios de datos para crear cuando se habilita el módulo
        $this->dirs = array();

        // Configuración de páginas para la configuración del módulo
        $this->config_page_url = array();

        // Dependencias
        $this->hidden = false;             // El módulo aparece en el listado para activar/desactivar
        $this->depends = array();          // Lista de nombres de clase de módulos que deben estar habilitados
        $this->requiredby = array();       // Lista de nombres de clase de módulos para deshabilitar si este está deshabilitado
        $this->conflictwith = array();     // Lista de nombres de clase de módulos con los que este módulo está en conflicto
        $this->langfiles = array("fichajestrabajadores@fichajestrabajadores");

        // Constantes
        $this->const = array();

        // Menús - Este módulo es solo API, no tiene interfaz de usuario
        $this->menu = array();

        // Permisos
        $this->rights = array();
        $r = 0;

        // Permiso para leer fichajes
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Leer fichajes';     // Descripción
        $this->rights[$r][3] = 0;                   // Permiso por defecto para nuevos usuarios (0/1)
        $this->rights[$r][4] = 'read';              // En código PHP, el permiso se verificará con test if ($user->rights->fichajestrabajadores->read)
        $r++;

        // Permiso para registrar fichajes
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Registrar fichajes'; // Descripción
        $this->rights[$r][3] = 0;                   // Permiso por defecto para nuevos usuarios (0/1)
        $this->rights[$r][4] = 'write';             // En código PHP, el permiso se verificará con test if ($user->rights->fichajestrabajadores->write)
        $r++;

        // Permiso para eliminar fichajes/jornadas
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Eliminar fichajes y jornadas'; // Descripción
        $this->rights[$r][3] = 0;                   // Permiso por defecto para nuevos usuarios (0/1)
        $this->rights[$r][4] = 'delete';            // En código PHP, el permiso se verificará con test if ($user->rights->fichajestrabajadores->delete)
        $r++;

        // Permiso para configurar el módulo (geolocalización, etc.)
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Configurar módulo'; // Descripción
        $this->rights[$r][3] = 0;                   // Permiso por defecto para nuevos usuarios (0/1)
        $this->rights[$r][4] = 'config';            // En código PHP, el permiso se verificará con test if ($user->rights->fichajestrabajadores->config)
        $r++;

        // Permiso para asignar/modificar los días de vacaciones por usuario
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Asignar días de vacaciones'; // Descripción que aparece en la ficha de usuario
        $this->rights[$r][3] = 0;                   // Desactivado por defecto
        $this->rights[$r][4] = 'vacacioneseditdays';
        $r++;

        // Permiso para aprobar/rechazar solicitudes de vacaciones
        $this->rights[$r][0] = $this->numero + $r;  // Id del permiso
        $this->rights[$r][1] = 'Aprobar solicitudes de vacaciones'; // Descripción
        $this->rights[$r][3] = 0;                   // Desactivado por defecto
        $this->rights[$r][4] = 'vacacionesapprove'; // Se comprobará con $user->rights->fichajestrabajadores->vacacionesapprove
        $r++;
    }

    /**
     * Función llamada cuando el módulo está habilitado.
     * El constructor es llamado por el constructor.
     *
     * @param  string $options Opciones (opciones cuando el módulo está habilitado)
     * @return int             1 si OK, 0 si KO
     */
    public function init($options = '')
    {
        // Creamos tablas durante la primera instalación
        $sql = array();

        $result = $this->_load_tables('/fichajestrabajadores/sql/');

        return $this->_init($sql, $options);
    }

    /**
     * Función llamada cuando el módulo está deshabilitado.
     *
     * @param  string $options Opciones (opciones cuando el módulo está deshabilitado)
     * @return int             1 si OK, 0 si KO
     */
    public function remove($options = '')
    {
        $sql = array();
        return $this->_remove($sql, $options);
    }
}