<?php
/* Copyright (C) 2024
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

require_once DOL_DOCUMENT_ROOT . '/core/lib/functions.lib.php';

/**
 * Class FichajesTrabajadoresCenters
 * 
 * Manage Work Centers
 */
class FichajesTrabajadoresCenters
{
    /** @var DoliDB */
    public $db;

    public $error;
    public $errors = array();

    public $id;
    public $label;
    public $latitude;
    public $longitude;
    public $radius; // meters

    public function __construct($db)
    {
        $this->db = $db;
    }

    /**
     * Create a new center
     */
    public function create($label, $lat, $lon, $radius = 100)
    {
        $this->errors = array();

        $sql = "INSERT INTO " . MAIN_DB_PREFIX . "fichajestrabajadores_centers (label, latitude, longitude, radius)";
        $sql .= " VALUES ('" . $this->db->escape($label) . "', " . (float) $lat . ", " . (float) $lon . ", " . (int) $radius . ")";

        dol_syslog(__METHOD__ . " - SQL: " . $sql, LOG_DEBUG);

        if ($this->db->query($sql)) {
            $this->id = $this->db->last_insert_id(MAIN_DB_PREFIX . "fichajestrabajadores_centers");
            return $this->id;
        } else {
            $this->error = $this->db->lasterror();
            $this->errors[] = $this->error;
            return -1;
        }
    }

    /**
     * Fetch a center
     */
    public function fetch($id)
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_centers WHERE rowid=" . (int) $id;
        $res = $this->db->query($sql);
        if ($res && $this->db->num_rows($res) > 0) {
            $obj = $this->db->fetch_object($res);
            $this->id = $obj->rowid;
            $this->label = $obj->label;
            $this->latitude = $obj->latitude;
            $this->longitude = $obj->longitude;
            $this->radius = $obj->radius;
            return 1;
        }
        return -1;
    }

    /**
     * Get all centers
     */
    public function fetchAll()
    {
        $sql = "SELECT * FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_centers ORDER BY label ASC";
        $res = $this->db->query($sql);
        $centers = array();
        if ($res) {
            while ($obj = $this->db->fetch_object($res)) {
                $centers[] = array(
                    'id' => $obj->rowid,
                    'label' => $obj->label,
                    'latitude' => $obj->latitude,
                    'longitude' => $obj->longitude,
                    'radius' => $obj->radius
                );
            }
        }
        return $centers;
    }

    /**
     * Check if coordinates are within any center
     * @return array {'inside': bool, 'center': object|null}
     */
    public function checkLocation($lat, $lon)
    {
        $centers = $this->fetchAll();
        foreach ($centers as $c) {
            $dist = $this->haversineGreatCircleDistance($lat, $lon, $c['latitude'], $c['longitude']);
            if ($dist <= $c['radius']) {
                return array('inside' => true, 'center' => $c);
            }
        }
        return array('inside' => false, 'center' => null);
    }

    /**
     * Calculates the great-circle distance between two points, with
     * the Haversine formula.
     * @param float $latitudeFrom Latitude of start point in [deg decimal]
     * @param float $longitudeFrom Longitude of start point in [deg decimal]
     * @param float $latitudeTo Latitude of target point in [deg decimal]
     * @param float $longitudeTo Longitude of target point in [deg decimal]
     * @param float $earthRadius Earth mean radius in [m]
     * @return float Distance between points in [m] (same as earthRadius)
     */
    private function haversineGreatCircleDistance(
        $latitudeFrom,
        $longitudeFrom,
        $latitudeTo,
        $longitudeTo,
        $earthRadius = 6371000
    ) {
        // convert from degrees to radians
        $latFrom = deg2rad($latitudeFrom);
        $lonFrom = deg2rad($longitudeFrom);
        $latTo = deg2rad($latitudeTo);
        $lonTo = deg2rad($longitudeTo);

        $latDelta = $latTo - $latFrom;
        $lonDelta = $lonTo - $lonFrom;

        $angle = 2 * asin(sqrt(pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lonDelta / 2), 2)));
        return $angle * $earthRadius;
    }
}
