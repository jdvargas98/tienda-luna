<?php

declare(strict_types=1);

require_once __DIR__ . '/backend_path.php';

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

function subscriptionRespond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function subscriptionClean(mixed $value, int $maxLength): string
{
    $text = trim((string) $value);
    $text = (string) preg_replace('/\s+/u', ' ', $text);
    return mb_substr($text, 0, $maxLength);
}

function subscriptionOriginAllowed(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') return true;

    $parts = parse_url($origin);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    return ($scheme === 'https' && in_array($host, ['lunacreativa.com.co', 'www.lunacreativa.com.co'], true))
        || (in_array($scheme, ['http', 'https'], true) && in_array($host, ['127.0.0.1', 'localhost', 'tienda.test', 'home.test'], true));
}

function subscriptionRateLimitAllows(string $ip): bool
{
    $file = sys_get_temp_dir() . '/luna_subscription_' . hash('sha256', $ip) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) return true;

    try {
        if (!flock($handle, LOCK_EX)) return true;
        $attempts = json_decode((string) stream_get_contents($handle), true);
        $attempts = is_array($attempts) ? $attempts : [];
        $minimum = time() - 3600;
        $attempts = array_values(array_filter($attempts, static fn ($time): bool => (int) $time >= $minimum));
        if (count($attempts) >= 8) {
            flock($handle, LOCK_UN);
            return false;
        }
        $attempts[] = time();
        rewind($handle);
        ftruncate($handle, 0);
        fwrite($handle, (string) json_encode($attempts));
        fflush($handle);
        flock($handle, LOCK_UN);
        return true;
    } finally {
        fclose($handle);
    }
}

function subscriptionConfigPath(): ?string
{
    $path = tienda_backend_path('api/config.php');
    return $path !== false ? $path : null;
}

function subscriptionColumnExists(PDO $pdo, string $column): bool
{
    static $cache = [];
    if (array_key_exists($column, $cache)) return $cache[$column];
    $query = $pdo->prepare(
        'SELECT COUNT(*) FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?'
    );
    $query->execute(['contactos', $column]);
    $cache[$column] = (int) $query->fetchColumn() > 0;
    return $cache[$column];
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    subscriptionRespond(405, ['status' => 'error', 'message' => 'Método no permitido.']);
}

if (!subscriptionOriginAllowed()) {
    subscriptionRespond(403, ['status' => 'error', 'message' => 'Origen no permitido.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 8192) {
    subscriptionRespond(413, ['status' => 'error', 'message' => 'La solicitud es demasiado grande.']);
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    subscriptionRespond(400, ['status' => 'error', 'message' => 'Solicitud inválida.']);
}

if (subscriptionClean($payload['website'] ?? '', 100) !== '') {
    subscriptionRespond(200, ['status' => 'success', 'message' => 'Tu suscripción quedó registrada.']);
}

$email = strtolower(subscriptionClean($payload['email'] ?? '', 190));
$sourcePage = subscriptionClean($payload['source_page'] ?? '', 250);
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    subscriptionRespond(422, ['status' => 'error', 'message' => 'Escribe un correo electrónico válido.']);
}
if (($payload['privacy_accepted'] ?? false) !== true) {
    subscriptionRespond(422, ['status' => 'error', 'message' => 'Debes aceptar la Política de Privacidad.']);
}
if (!subscriptionRateLimitAllows((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'))) {
    subscriptionRespond(429, ['status' => 'error', 'message' => 'Alcanzaste el límite de intentos. Inténtalo más tarde.']);
}

$configPath = subscriptionConfigPath();
if ($configPath === null) {
    error_log('[Suscripción web] No se encontró la configuración del cotizador.');
    subscriptionRespond(503, ['status' => 'error', 'message' => 'La suscripción no está disponible temporalmente.']);
}

try {
    require $configPath;
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('La conexión del cotizador no está disponible.');
    }

    $pdo->beginTransaction();
    $lookup = $pdo->prepare(
        "SELECT id FROM contactos WHERE email IS NOT NULL AND LOWER(email) = LOWER(?) ORDER BY id DESC LIMIT 1"
    );
    $lookup->execute([$email]);
    $contactId = (int) ($lookup->fetchColumn() ?: 0);
    $note = 'Suscripción a novedades desde lunacreativa.com.co. Fecha: ' . date('Y-m-d H:i:s')
        . ($sourcePage !== '' ? '. Página: ' . $sourcePage : '');

    if ($contactId > 0) {
        $assignments = ['activo = 1'];
        $parameters = [];
        if (subscriptionColumnExists($pdo, 'acepta_email')) $assignments[] = 'acepta_email = 1';
        if (subscriptionColumnExists($pdo, 'consentimiento_email_fecha')) $assignments[] = 'consentimiento_email_fecha = NOW()';
        if (subscriptionColumnExists($pdo, 'email_desuscrito_en')) $assignments[] = 'email_desuscrito_en = NULL';
        if (subscriptionColumnExists($pdo, 'origen_principal')) $assignments[] = "origen_principal = COALESCE(NULLIF(origen_principal, ''), 'sitio_web')";
        if (subscriptionColumnExists($pdo, 'notas')) {
            $assignments[] = "notas = CONCAT_WS('\n\n', NULLIF(notas, ''), ?)";
            $parameters[] = $note;
        }
        $parameters[] = $contactId;
        $update = $pdo->prepare('UPDATE contactos SET ' . implode(', ', $assignments) . ' WHERE id = ?');
        $update->execute($parameters);
    } else {
        $columns = ['tipo', 'tipo_documento', 'tipo_persona', 'nombre', 'telefono', 'email', 'municipio', 'contacto', 'notas', 'activo'];
        $values = ['cliente', 'CC', 'natural', 'Suscriptor web', '', $email, 'Neiva', null, $note, 1];
        if (subscriptionColumnExists($pdo, 'origen_principal')) { $columns[] = 'origen_principal'; $values[] = 'sitio_web'; }
        if (subscriptionColumnExists($pdo, 'acepta_email')) { $columns[] = 'acepta_email'; $values[] = 1; }
        if (subscriptionColumnExists($pdo, 'consentimiento_email_fecha')) { $columns[] = 'consentimiento_email_fecha'; $values[] = date('Y-m-d H:i:s'); }
        if (subscriptionColumnExists($pdo, 'email_desuscrito_en')) { $columns[] = 'email_desuscrito_en'; $values[] = null; }
        $placeholders = implode(', ', array_fill(0, count($columns), '?'));
        $insert = $pdo->prepare('INSERT INTO contactos (`' . implode('`, `', $columns) . '`) VALUES (' . $placeholders . ')');
        $insert->execute($values);
    }

    $pdo->commit();
    subscriptionRespond(200, ['status' => 'success', 'message' => 'Listo. Te enviaremos novedades a este correo.']);
} catch (Throwable $exception) {
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) $pdo->rollBack();
    error_log('[Suscripción web] ' . $exception->getMessage());
    subscriptionRespond(500, ['status' => 'error', 'message' => 'No pudimos completar la suscripción. Inténtalo nuevamente.']);
}
