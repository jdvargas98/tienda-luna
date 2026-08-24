<?php
declare(strict_types=1);

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

require_once __DIR__ . '/backend_path.php';

const VISIT_NOTIFICATION_EMAIL = 'ventas@lunacreativa.com.co';
const VISIT_RATE_LIMIT = 3;
const VISIT_RATE_WINDOW = 3600;

function visitRespond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function visitCleanText(mixed $value, int $maxLength, bool $preserveLines = false): string
{
    $text = trim((string) $value);
    $pattern = $preserveLines ? '/[^\S\r\n]+/u' : '/\s+/u';
    $text = (string) preg_replace($pattern, ' ', $text);
    return mb_substr($text, 0, $maxLength);
}

function visitOriginIsAllowed(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    if ($origin === '') {
        return true;
    }

    $parts = parse_url($origin);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    $productionHosts = [
        'lunacreativa.com.co',
        'www.lunacreativa.com.co',
        'tienda.lunacreativa.com.co',
    ];
    $localHosts = ['127.0.0.1', 'localhost', 'tienda.test'];

    return ($scheme === 'https' && in_array($host, $productionHosts, true))
        || (in_array($scheme, ['http', 'https'], true) && in_array($host, $localHosts, true));
}

function visitRateLimitAllows(string $ip): bool
{
    $file = sys_get_temp_dir() . '/luna_visit_' . hash('sha256', $ip) . '.json';
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return true;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return true;
        }

        $raw = stream_get_contents($handle);
        $attempts = json_decode($raw ?: '[]', true);
        $attempts = is_array($attempts) ? $attempts : [];
        $minimum = time() - VISIT_RATE_WINDOW;
        $attempts = array_values(array_filter(
            $attempts,
            static fn ($time): bool => (int) $time >= $minimum
        ));

        if (count($attempts) >= VISIT_RATE_LIMIT) {
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

function visitSendNotification(PDO $pdo, string $smtpHelper, array $visit): bool
{
    require_once $smtpHelper;

    $subject = 'Solicitud de visita: ' . $visit['date_label'] . ' · ' . $visit['name'];
    $plain = implode("\n", [
        'Se recibió una solicitud de visita desde la tienda de Luna Creativa.',
        '',
        'IMPORTANTE: la fecha todavía no está confirmada.',
        '',
        'Fecha solicitada: ' . $visit['date_label'],
        'Hora solicitada: ' . $visit['time_label'],
        'Nombre: ' . $visit['name'],
        'Empresa o marca: ' . ($visit['company'] !== '' ? $visit['company'] : 'No indicada'),
        'Correo: ' . $visit['email'],
        'Celular: ' . $visit['phone'],
        'Ciudad: ' . $visit['city'],
        'Dirección de la visita: ' . $visit['address'],
        'Servicio: ' . $visit['service'],
        '',
        'Detalles:',
        $visit['message'],
        '',
        'La persona fue informada de que la visita requiere confirmación de Ventas y aceptó que cualquier cambio de fecha u hora debe confirmarse nuevamente.',
    ]);

    $escape = static fn (string $value): string => htmlspecialchars(
        $value,
        ENT_QUOTES | ENT_SUBSTITUTE,
        'UTF-8'
    );
    $html = '<h2>Nueva solicitud de visita</h2>'
        . '<p style="padding:12px;background:#fff3cd;border-radius:8px"><strong>Pendiente de confirmación:</strong> '
        . 'la fecha y hora solicitadas no están reservadas hasta que Ventas responda al cliente.</p>'
        . '<p><strong>Fecha solicitada:</strong> ' . $escape($visit['date_label']) . '</p>'
        . '<p><strong>Hora solicitada:</strong> ' . $escape($visit['time_label']) . '</p>'
        . '<p><strong>Nombre:</strong> ' . $escape($visit['name']) . '</p>'
        . '<p><strong>Empresa o marca:</strong> '
        . $escape($visit['company'] !== '' ? $visit['company'] : 'No indicada') . '</p>'
        . '<p><strong>Correo:</strong> ' . $escape($visit['email']) . '</p>'
        . '<p><strong>Celular:</strong> ' . $escape($visit['phone']) . '</p>'
        . '<p><strong>Ciudad:</strong> ' . $escape($visit['city']) . '</p>'
        . '<p><strong>Dirección:</strong> ' . $escape($visit['address']) . '</p>'
        . '<p><strong>Servicio:</strong> ' . $escape($visit['service']) . '</p>'
        . '<p><strong>Detalles:</strong><br>' . nl2br($escape($visit['message'])) . '</p>'
        . '<p><small>El solicitante fue informado de la confirmación pendiente y aceptó las condiciones para cambios de agenda.</small></p>';

    try {
        $smtp = smtpCargarConfiguracionCanal($pdo, null, 'transaccional');
        if (($smtp['smtp_activo'] ?? false) === true) {
            $result = smtpEnviarCorreo(
                $smtp,
                VISIT_NOTIFICATION_EMAIL,
                $subject,
                $plain,
                ['html' => $html]
            );
            if (($result['status'] ?? '') === 'success') {
                return true;
            }
        }
    } catch (Throwable $exception) {
        error_log('[Visita tienda] SMTP no disponible: ' . $exception->getMessage());
    }

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset=UTF-8',
        'From: Luna Creativa <no-reply@lunacreativa.com.co>',
        'Reply-To: ' . $visit['name'] . ' <' . $visit['email'] . '>',
    ];
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    return @mail(VISIT_NOTIFICATION_EMAIL, $encodedSubject, $html, implode("\r\n", $headers));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    visitRespond(405, ['status' => 'error', 'message' => 'Método no permitido.']);
}

if (!visitOriginIsAllowed()) {
    visitRespond(403, ['status' => 'error', 'message' => 'Origen no permitido.']);
}

if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 32768) {
    visitRespond(413, ['status' => 'error', 'message' => 'La solicitud es demasiado grande.']);
}

$payload = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($payload)) {
    visitRespond(400, ['status' => 'error', 'message' => 'Solicitud inválida.']);
}

if (visitCleanText($payload['website'] ?? '', 100) !== '') {
    visitRespond(200, [
        'status' => 'success',
        'message' => 'Recibimos tu solicitud. La fecha sigue pendiente de confirmación.',
    ]);
}

$visit = [
    'name' => visitCleanText($payload['name'] ?? '', 120),
    'company' => visitCleanText($payload['company'] ?? '', 140),
    'email' => strtolower(visitCleanText($payload['email'] ?? '', 190)),
    'phone' => visitCleanText($payload['phone'] ?? '', 30),
    'city' => visitCleanText($payload['city'] ?? '', 100),
    'address' => visitCleanText($payload['address'] ?? '', 220),
    'date' => visitCleanText($payload['date'] ?? '', 10),
    'time' => visitCleanText($payload['time'] ?? '', 5),
    'service' => visitCleanText($payload['service'] ?? '', 140),
    'message' => visitCleanText($payload['message'] ?? '', 2000, true),
];

if (mb_strlen($visit['name']) < 2
    || !filter_var($visit['email'], FILTER_VALIDATE_EMAIL)
    || !preg_match('/^[0-9+()\s.-]{7,30}$/', $visit['phone'])
    || mb_strlen($visit['city']) < 2
    || mb_strlen($visit['address']) < 5
    || mb_strlen($visit['service']) < 2
    || mb_strlen($visit['message']) < 10
    || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $visit['date'])
    || !preg_match('/^\d{2}:\d{2}$/', $visit['time'])
) {
    visitRespond(422, [
        'status' => 'error',
        'message' => 'Revisa los campos obligatorios e inténtalo nuevamente.',
    ]);
}

if (($payload['privacy_accepted'] ?? false) !== true
    || ($payload['change_acknowledged'] ?? false) !== true
) {
    visitRespond(422, [
        'status' => 'error',
        'message' => 'Debes aceptar la privacidad y las condiciones de confirmación de la visita.',
    ]);
}

$timezone = new DateTimeZone('America/Bogota');
$requested = DateTimeImmutable::createFromFormat(
    '!Y-m-d H:i',
    $visit['date'] . ' ' . $visit['time'],
    $timezone
);
$dateErrors = DateTimeImmutable::getLastErrors();
$invalidDate = $requested === false
    || (is_array($dateErrors) && ($dateErrors['warning_count'] > 0 || $dateErrors['error_count'] > 0))
    || ($requested !== false && $requested->format('Y-m-d H:i') !== $visit['date'] . ' ' . $visit['time']);

if ($invalidDate) {
    visitRespond(422, ['status' => 'error', 'message' => 'La fecha u hora no es válida.']);
}

$requestedTime = $requested->format('H:i');
$requestedMinute = $requested->format('i');
if ($requestedTime < '07:00'
    || $requestedTime > '19:00'
    || !in_array($requestedMinute, ['00', '30'], true)
) {
    visitRespond(422, [
        'status' => 'error',
        'message' => 'Selecciona un horario laboral entre las 7:00 a. m. y las 7:00 p. m., en intervalos de 30 minutos.',
    ]);
}

$today = new DateTimeImmutable('today', $timezone);
$minimumDate = $today->modify('+1 day');
$maximumDate = $today->modify('+90 days')->setTime(23, 59);
if ($requested < $minimumDate || $requested > $maximumDate) {
    visitRespond(422, [
        'status' => 'error',
        'message' => 'Selecciona una fecha desde mañana y dentro de los próximos 90 días.',
    ]);
}

if (!visitRateLimitAllows((string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'))) {
    visitRespond(429, [
        'status' => 'error',
        'message' => 'Alcanzaste el límite de solicitudes. Inténtalo más tarde.',
    ]);
}

$configPath = tienda_backend_path('api/config.php');
$smtpHelper = tienda_backend_path('api/smtp.php');
if ($configPath === false || $smtpHelper === false) {
    error_log('[Visita tienda] No se encontró la configuración del cotizador.');
    visitRespond(503, [
        'status' => 'error',
        'message' => 'El servicio de agenda no está disponible temporalmente.',
    ]);
}

try {
    require $configPath;
    if (!isset($pdo) || !($pdo instanceof PDO)) {
        throw new RuntimeException('La conexión del cotizador no está disponible.');
    }

    $visit['date_label'] = $requested->format('d/m/Y');
    $visit['time_label'] = $requested->format('h:i a');
    if (!visitSendNotification($pdo, $smtpHelper, $visit)) {
        throw new RuntimeException('No fue posible entregar la notificación.');
    }

    visitRespond(200, [
        'status' => 'success',
        'message' => 'Solicitud enviada. Nuestro equipo de Ventas se pondrá en contacto contigo para confirmar la disponibilidad y dejar la visita agendada.',
    ]);
} catch (Throwable $exception) {
    error_log('[Visita tienda] ' . $exception->getMessage());
    visitRespond(500, [
        'status' => 'error',
        'message' => 'No pudimos enviar la solicitud. Inténtalo nuevamente o contacta a Ventas.',
    ]);
}
