<?php
// proxy.php - Proxy para evitar CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$url = $_GET['url'] ?? '';

if (empty($url)) {
    http_response_code(400);
    echo "URL no proporcionada";
    exit;
}

// Validar que sea una URL de la UTB
if (strpos($url, 'utb.edu.ec') === false && strpos($url, 'salutb.edu.ec') === false) {
    http_response_code(403);
    echo "URL no permitida";
    exit;
}

$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'header' => 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'timeout' => 10
    ]
]);

try {
    $content = file_get_contents($url, false, $context);
    
    if ($content === false) {
        http_response_code(500);
        echo "Error al obtener el contenido";
        exit;
    }
    
    echo $content;
    
} catch (Exception $e) {
    http_response_code(500);
    echo "Error: " . $e->getMessage();
}
?>