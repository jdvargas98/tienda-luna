<?php
declare(strict_types=1);

require_once __DIR__ . '/backend_path.php';

$relativePath = trim((string)($_GET['path'] ?? ''));
$relativePath = ltrim($relativePath, '/');

if ($relativePath === '' || !str_starts_with($relativePath, 'assets/tienda/')) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Ruta de imagen invalida',
    ]);
    exit;
}

$assetPath = tienda_backend_path($relativePath);
$assetRoot = tienda_backend_path('assets/tienda');

if ($assetPath === false || $assetRoot === false || !str_starts_with($assetPath, $assetRoot) || !is_file($assetPath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Imagen no encontrada',
    ]);
    exit;
}

$mimeType = mime_content_type($assetPath) ?: 'application/octet-stream';
header('Content-Type: ' . $mimeType);
header('Content-Length: ' . (string) filesize($assetPath));
header('Cache-Control: public, max-age=3600');
readfile($assetPath);
exit;
