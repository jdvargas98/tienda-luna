<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
$baseUrl = 'https://api-colombia.com/api/v1';

if ($action === 'departamentos') {
    colombia_proxy_json($baseUrl . '/Department');
}

if ($action === 'municipios') {
    $departmentId = intval($_GET['department_id'] ?? 0);
    if ($departmentId <= 0) {
        http_response_code(422);
        echo json_encode(['status' => 'error', 'message' => 'Departamento requerido']);
        exit;
    }
    colombia_proxy_json($baseUrl . '/Department/' . $departmentId . '/cities');
}

http_response_code(400);
echo json_encode(['status' => 'error', 'message' => 'Accion invalida']);
exit;

function colombia_proxy_json(string $url): void {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "Accept: application/json\r\nUser-Agent: LunaCreativaStore/1.0\r\n",
            'timeout' => 8,
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if ($response === false || trim($response) === '') {
        http_response_code(502);
        echo json_encode(['status' => 'error', 'message' => 'No fue posible cargar ubicaciones de Colombia']);
        exit;
    }

    echo $response;
    exit;
}
