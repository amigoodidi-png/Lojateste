<?php
// Confere um cupom para o carrinho. Recebe JSON {codigo, itens:[{id,qtd}]}.
require __DIR__ . '/_config.php';
header('Content-Type: application/json; charset=utf-8');

$entrada = json_decode(file_get_contents('php://input'), true) ?: [];
[$valor] = loja_somar_itens($entrada['itens'] ?? []);
$r = loja_cupom_validar($entrada['codigo'] ?? '', $valor);
echo json_encode([
    'ok' => $r['ok'],
    'codigo' => $r['ok'] ? $r['cupom']['codigo'] : '',
    'desconto' => $r['desconto'] ?? 0,
    'mensagem' => $r['mensagem'],
], JSON_UNESCAPED_UNICODE);
