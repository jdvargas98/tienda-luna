<?php
declare(strict_types=1);

function tienda_backend_path(string $relativePath)
{
    $relativePath = ltrim($relativePath, '/');
    $candidates = [
        __DIR__ . '/../../cotizador-luna/' . $relativePath,
        __DIR__ . '/../../cotizador/' . $relativePath,
    ];

    foreach ($candidates as $candidate) {
        $resolved = realpath($candidate);
        if ($resolved !== false) {
            return $resolved;
        }
    }

    return false;
}
