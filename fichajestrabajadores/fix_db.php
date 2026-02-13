<?php
require_once '../../main.inc.php';
global $db;

echo "<h2>Fix DB - Legal Compliance Migration</h2><pre>\n";

// 1. Ensure admin_note column exists on corrections
$db->query("ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ADD COLUMN IF NOT EXISTS admin_note TEXT NULL");
echo "OK: admin_note column ready.\n";

// 2. Ensure fecha_original column exists on fichajes (Legal Compliance)
$sql = "ALTER TABLE " . MAIN_DB_PREFIX . "fichajestrabajadores ADD COLUMN IF NOT EXISTS fecha_original DATETIME DEFAULT NULL";
$db->query($sql);
echo "OK: fecha_original column ready (legal compliance).\n";

// 3. Reset all non-pending corrections for re-testing
$sql = "UPDATE " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections SET estado = 'pendiente', fk_approver = NULL, date_approval = NULL WHERE estado != 'pendiente'";
$resql = $db->query($sql);
$affected = $db->affected_rows($resql);
echo "OK: $affected corrections reset to pendiente.\n";

// 4. Show corrections
$sql = "SELECT rowid, fk_user, fecha_jornada, hora_entrada, hora_salida, estado FROM " . MAIN_DB_PREFIX . "fichajestrabajadores_corrections ORDER BY rowid DESC LIMIT 10";
$resql = $db->query($sql);
echo "\n--- Corrections ---\n";
while ($obj = $db->fetch_object($resql)) {
    echo "ID:{$obj->rowid} | user:{$obj->fk_user} | fecha:{$obj->fecha_jornada} | estado:{$obj->estado} | entrada:{$obj->hora_entrada} | salida:{$obj->hora_salida}\n";
}

// 5. Show recent fichajes with fecha_original
$sql = "SELECT rowid, fk_user, tipo, fecha_creacion, fecha_original, observaciones FROM " . MAIN_DB_PREFIX . "fichajestrabajadores WHERE fecha_original IS NOT NULL ORDER BY rowid DESC LIMIT 10";
$resql = $db->query($sql);
echo "\n--- Fichajes with fecha_original ---\n";
$count = 0;
while ($obj = $db->fetch_object($resql)) {
    echo "ID:{$obj->rowid} | tipo:{$obj->tipo} | creacion:{$obj->fecha_creacion} | original:{$obj->fecha_original}\n";
    $count++;
}
if ($count == 0)
    echo "(none yet)\n";

echo "</pre>";
?>