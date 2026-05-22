<?php
declare(strict_types=1);

require_once __DIR__ . '/backend_path.php';

$proxyTarget = tienda_backend_path('api/tienda_subir_personalizacion.php');

if ($proxyTarget === false || !is_file($proxyTarget)) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'API de personalizacion no disponible',
    ]);
    exit;
}

require $proxyTarget;
