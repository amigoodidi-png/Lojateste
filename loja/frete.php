<?php
// Cotação de frete da VAVI para o carrinho. Recebe JSON {cep, itens:[{id,qtd}]}.
require __DIR__ . '/_config.php';
require __DIR__ . '/_vavi.php';
header('Content-Type: application/json; charset=utf-8');

$entrada = json_decode(file_get_contents('php://input'), true) ?: [];
[$valor, $pecas] = loja_somar_itens($entrada['itens'] ?? []);
$cep = preg_replace('/\D/', '', (string)($entrada['cep'] ?? ''));

$opcoes = (strlen($cep) === 8 && $pecas > 0) ? vavi_cotar_frete($cep, $valor, $pecas) : null;
echo json_encode(['opcoes' => $opcoes ?: []], JSON_UNESCAPED_UNICODE);
