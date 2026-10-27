<?php
// ============================================================
// Integração com a VAVI Estampas (API PrintBee).
// Docs: https://developers.vaviestampas.com.br
// Credenciais ficam fora do site, em LOJA_PRIVADO/vavi-api-config.php:
//   <?php
//   define('VAVI_CLIENT_ID', '...');
//   define('VAVI_CLIENT_SECRET', '...');
// (gere em vaviestampas.com.br → Integrações → Chaves de API)
// ============================================================
const VAVI_API = 'https://api.printbee.com.br';
define('VAVI_CONFIG', LOJA_PRIVADO . '/vavi-api-config.php');
// .php com "exit" na 1ª linha: mesmo exposto na web, o token não aparece.
define('VAVI_TOKEN_CACHE', LOJA_PRIVADO . '/vavi-token-cache.php');
const VAVI_CACHE_CABECALHO = "<?php exit; ?>\n";

// Peso e caixa estimados por peça, usados na cotação de frete.
const VAVI_PESO_PECA_KG = 0.3;
const VAVI_ALTURA_PECA_MM = 30;

function vavi_configurada() {
    if (!defined('VAVI_CLIENT_ID') && file_exists(VAVI_CONFIG)) require_once VAVI_CONFIG;
    return defined('VAVI_CLIENT_ID') && VAVI_CLIENT_ID !== '' && defined('VAVI_CLIENT_SECRET');
}

// Chamada HTTP à API. Devolve ['status' => int, 'dados' => array|null].
function vavi_http($metodo, $caminho, $corpo = null, $token = null) {
    $ch = curl_init(VAVI_API . $caminho);
    $cabecalhos = ['Accept: application/json', 'Content-Type: application/json'];
    if ($token) $cabecalhos[] = 'Authorization: Bearer ' . $token;
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $metodo,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_HTTPHEADER => $cabecalhos,
    ]);
    if ($corpo !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($corpo, JSON_UNESCAPED_UNICODE));
    $resposta = curl_exec($ch);
    $status = curl_errno($ch) ? 0 : curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return ['status' => $status, 'dados' => json_decode((string)$resposta, true)];
}

// Token Bearer com cache em arquivo (vale 1h; renovamos 5 min antes).
function vavi_token() {
    if (!vavi_configurada()) return null;
    if (file_exists(VAVI_TOKEN_CACHE)) {
        $cache = json_decode(substr(file_get_contents(VAVI_TOKEN_CACHE), strlen(VAVI_CACHE_CABECALHO)), true);
        if (($cache['expira'] ?? 0) > time() + 300) return $cache['token'];
    }
    $r = vavi_http('POST', '/api/Auth/Token', [
        'grantType' => 'client_credentials', 'clientId' => VAVI_CLIENT_ID, 'clientSecret' => VAVI_CLIENT_SECRET,
    ]);
    $token = $r['dados']['data']['access_token'] ?? null;
    if (!$token) {
        $GLOBALS['vavi_erro_token'] = vavi_erro($r);
        return null;
    }
    file_put_contents(VAVI_TOKEN_CACHE, VAVI_CACHE_CABECALHO . json_encode([
        'token' => $token, 'expira' => time() + (int)($r['dados']['data']['expires_in'] ?? 3600),
    ]));
    return $token;
}

function vavi_erro($r) {
    $erros = $r['dados']['errors'] ?? [];
    if ($erros) return implode('; ', array_map(fn($e) => ($e['errorCode'] ?? '') . ' ' . ($e['message'] ?? ''), $erros));
    return $r['status'] ? "HTTP {$r['status']}" : 'sem resposta da VAVI';
}

// Opções de frete para um CEP. Devolve lista [id, nome, preco, prazo] ou null se indisponível.
function vavi_cotar_frete($cep, $valorProdutos, $qtdPecas) {
    $token = vavi_token();
    if (!$token) return null;
    $r = vavi_http('POST', '/api/Customers/Simulate', [
        'zipCode' => preg_replace('/\D/', '', $cep),
        'amount' => round($valorProdutos, 2),
        'weight' => round(VAVI_PESO_PECA_KG * $qtdPecas, 2),
        'height' => VAVI_ALTURA_PECA_MM * $qtdPecas, 'width' => 300, 'length' => 400,
    ], $token);
    if ($r['status'] !== 200 || !is_array($r['dados']['data'] ?? null)) return null;
    $opcoes = [];
    foreach ($r['dados']['data'] as $o) {
        if (isset($o['isActive']) && !$o['isActive']) continue;
        if (stripos($o['name'] ?? '', 'retirada') !== false) continue; // retirada na fábrica não serve ao cliente
        $opcoes[] = [
            'id' => (string)$o['id'],
            'nome' => trim(($o['companyName'] ?? '') . ' ' . ($o['name'] ?? '')),
            'preco' => round((float)$o['shippingCost'], 2),
            'prazo' => (int)$o['deliveryTime'],
        ];
    }
    return $opcoes;
}

// Envia o pedido como rascunho de integração. No portal VAVI você confirma arte/frete e paga.
// Reenviar o mesmo código não duplica (a VAVI devolve o rascunho existente).
function vavi_enviar_pedido($pedido) {
    $token = vavi_token();
    if (!$token) return ['ok' => false, 'erro' => vavi_configurada() ? 'não foi possível autenticar na VAVI (' . ($GLOBALS['vavi_erro_token'] ?? 'erro desconhecido') . ')' : 'chave de API da VAVI não configurada'];
    $itens = [];
    foreach ((array)json_decode($pedido['itens'], true) as $i) {
        $itens[] = [
            'name' => $i['nome'], 'sku' => $i['sku_fornecedor'] ?: null, 'quantity' => (int)$i['qtd'], 'unitPrice' => (float)$i['preco'],
            'properties' => array_values(array_filter([
                $i['tamanho'] ? ['key' => 'Tamanho', 'value' => $i['tamanho']] : null,
                $i['cor'] ? ['key' => 'Cor', 'value' => $i['cor']] : null,
            ])),
        ];
    }
    $r = vavi_http('POST', '/api/Customers/Integrations/Orders', [
        'code' => $pedido['codigo'],
        'requestClientId' => (string)$pedido['id'],
        'status' => $pedido['status'],
        'freightAmount' => (float)$pedido['frete'],
        'paidAmount' => (float)$pedido['total'] - (float)$pedido['desconto'] + (float)$pedido['frete'],
        'buyer' => [
            'name' => $pedido['nome'], 'email' => $pedido['email'],
            'phone' => preg_replace('/\D/', '', $pedido['telefone']), 'taxId' => preg_replace('/\D/', '', $pedido['cpf']),
            'zipCode' => preg_replace('/\D/', '', $pedido['cep']), 'street' => $pedido['endereco'], 'number' => $pedido['numero'],
            'complement' => $pedido['complemento'], 'neighborhood' => $pedido['bairro'], 'city' => $pedido['cidade'],
            'state' => $pedido['uf'], 'country' => 'BR',
        ],
        'items' => $itens,
        'properties' => array_values(array_filter([
            $pedido['cupom'] ? ['key' => 'Cupom', 'value' => $pedido['cupom'] . ' (−' . number_format($pedido['desconto'], 2, ',', '.') . ')'] : null,
            $pedido['frete_servico'] ? ['key' => 'Frete escolhido', 'value' => $pedido['frete_servico']] : null,
            $pedido['observacoes'] ? ['key' => 'Observações', 'value' => $pedido['observacoes']] : null,
        ])),
    ], $token);
    $draft = $r['dados']['data']['draftId'] ?? null;
    return $draft ? ['ok' => true, 'draft' => $draft] : ['ok' => false, 'erro' => vavi_erro($r)];
}

// Status de produção na VAVI (OrderStatus) em português para o painel.
const VAVI_STATUS = [
    'OPEN' => 'aberto', 'WAITINGPAYMENT' => 'aguardando pagamento', 'PAYMENTRECEIVED' => 'pagamento recebido',
    'PRODUCTIONQUEUE' => 'na fila de produção', 'PRODUCTION' => 'em produção', 'PRODUCTIONCOMPLETED' => 'produção concluída',
    'WAITINGFINALPAYMENT' => 'aguardando pagamento final', 'DISPATCH' => 'em expedição', 'TRANSIT' => 'em trânsito',
    'DELIVERED' => 'entregue', 'ATTENDED' => 'atendido', 'LOST' => 'extraviado', 'RETURNED' => 'devolvido',
    'CANCELED' => 'cancelado', 'UNDERREVIEW' => 'em revisão',
    // status do rascunho de integração
    'Pending' => 'rascunho pendente', 'Reviewing' => 'rascunho em revisão', 'Ready' => 'rascunho pronto',
    'Converted' => 'convertido em pedido', 'Discarded' => 'rascunho descartado', 'Failed' => 'rascunho com falha',
];

function vavi_status_texto($status) {
    return VAVI_STATUS[$status] ?? strtolower((string)$status);
}

// Consulta a VAVI e devolve os campos de acompanhamento do pedido.
// Usa o NSU (BEE...) quando já informado; senão tenta pelo código do pedido e mostra o status do rascunho.
function vavi_acompanhar_pedido($pedido) {
    $token = vavi_token();
    if (!$token) return ['ok' => false, 'erro' => 'não foi possível autenticar na VAVI (' . ($GLOBALS['vavi_erro_token'] ?? 'chave não configurada') . ')'];

    foreach (array_filter([$pedido['vavi_nsu'], $pedido['codigo']]) as $id) {
        $r = vavi_http('GET', '/api/Customers/Orders/' . rawurlencode($id), null, $token);
        $t = $r['dados']['data'] ?? $r['dados'] ?? null;
        if ($r['status'] === 200 && !empty($t['orderNSU'])) {
            return ['ok' => true, 'campos' => [
                'vavi_status' => (string)$t['orderStatus'], 'vavi_nsu' => (string)$t['orderNSU'],
                'rastreio_codigo' => (string)($t['trackingCode'] ?? ''), 'rastreio_url' => (string)($t['trackingUrl'] ?? ''),
                'transportadora' => trim(($t['carrierName'] ?? '') . ' ' . ($t['serviceName'] ?? '')),
            ]];
        }
    }
    // Ainda não virou pedido de produção: mostra o status do rascunho.
    $r = vavi_http('GET', '/api/Customers/Integrations/Orders/' . rawurlencode($pedido['codigo']), null, $token);
    if ($r['status'] === 200 && !empty($r['dados']['status'])) {
        return ['ok' => true, 'campos' => ['vavi_status' => (string)$r['dados']['status']]];
    }
    return ['ok' => false, 'erro' => vavi_erro($r)];
}
