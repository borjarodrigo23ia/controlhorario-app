<?php
// Fix for invalid pause in correction #26
// Usage: php fix_correction_26.php

require_once __DIR__ . '/main.inc.php';
require_once __DIR__ . '/core/lib/admin.lib.php';

$correctionsTable = MAIN_DB_PREFIX . "fichajestrabajadores_corrections";
$id = 26;

// Fetch current data
$sql = "SELECT * FROM $correctionsTable WHERE rowid = $id";
$res = $db->query($sql);
if ($res && $db->num_rows($res) > 0) {
    $obj = $db->fetch_object($res);
    echo "Current invalid data for #$id:\n";
    print_r($obj);

    // Parse bad JSON
    $pausas = json_decode($obj->pausas, true);
    if (is_array($pausas) && count($pausas) > 0) {
        $badPause = $pausas[0];
        $start = isset($badPause['inicio_iso']) ? $badPause['inicio_iso'] : (isset($badPause['start']) ? $badPause['start'] : null);

        // Fix: Add 15 mins to end time if it equals start time
        if ($start) {
            $startDate = new DateTime($start);
            $endDate = clone $startDate;
            $endDate->modify('+15 minutes'); // Add 15 mins

            $newPausas = array(
                array(
                    'inicio_iso' => $startDate->format('c'), // ISO 8601
                    'fin_iso' => $endDate->format('c')
                )
            );

            $newJson = json_encode($newPausas);
            echo "\nNew JSON payload: $newJson\n";

            // Update DB
            $updSql = "UPDATE $correctionsTable SET pausas = '" . $db->escape($newJson) . "' WHERE rowid = $id";
            if ($db->query($updSql)) {
                echo "SUCCESS: Correction #$id updated. Try approving again.\n";
            } else {
                echo "ERROR: Failed to update DB: " . $db->lasterror() . "\n";
            }
        } else {
            echo "ERROR: Could not parse start time from JSON.\n";
        }
    } else {
        echo "ERROR: JSON pausas is empty or invalid.\n";
    }
} else {
    echo "Correction #$id not found.\n";
}
