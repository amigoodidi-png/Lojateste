<?php
// ============================================================
// Loja Lumiar Aventura — configuração e funções compartilhadas.
// Modelo Print on Demand / Dropshipping: a loja vende, o pedido
// fica registrado aqui e é repassado ao fornecedor (campo
// "fornecedor" + "SKU do fornecedor" de cada produto).
// Configurações com senha ficam fora do site:
//  - no computador do Diego (XAMPP): C:\Bases
//  - na hospedagem: pasta _privado ao lado da loja (bloqueada por .htaccess;
//    os arquivos são .php sem saída, então nada vaza nem se o bloqueio falhar)
// ============================================================
// LOJA_FORCAR_HOSPEDAGEM=1 simula a hospedagem no próprio computador (para testes).
define('LOJA_LOCAL', is_dir('C:\\Bases') && !getenv('LOJA_FORCAR_HOSPEDAGEM'));
define('LOJA_PRIVADO', LOJA_LOCAL ? 'C:\\Bases' : dirname(__DIR__) . '/_privado');
require_once LOJA_PRIVADO . '/lumiar-db-config.php';

// Para onde o logo e o "Site" do menu levam.
define('LOJA_SITE_HOME', LOJA_LOCAL ? '../index.html' : 'https://www.lumiaraventura.com.br/');

const LOJA_WHATSAPP = '5522999468812';
const LOJA_EMAIL = 'lumiaraventura@gmail.com';

const LOJA_CATEGORIAS = [
    'camisa-algodao' => 'Camisas de Algodão',
    'camisa-lycra'   => 'Camisas DryFit e Malha Fria',
    'caneca'         => 'Canecas',
    'lembrancinha'   => 'Lembrancinhas',
];

function loja_bd() {
    static $bd = null;
    if ($bd === null) {
        $bd = lumiar_conectar_bd();
        mysqli_set_charset($bd, 'utf8mb4');
        loja_verificar_tabelas($bd);
    }
    return $bd;
}

// As tabelas são criadas pelo instalar.sql (o usuário do site não tem
// permissão de CREATE). Se ainda não existirem, mostra como instalar.
function loja_verificar_tabelas($bd) {
    if (mysqli_num_rows(mysqli_query($bd, "SHOW TABLES LIKE 'loja_pedidos'")) > 0) return;
    http_response_code(503);
    echo '<!DOCTYPE html><meta charset="UTF-8"><title>Loja em instalação</title>'
       . '<body style="font-family:sans-serif;background:#f2ece0;color:#0d1f16;padding:40px;max-width:640px;margin:auto">'
       . '<h1>Loja ainda não instalada</h1><p>Abra o <a href="/phpmyadmin/">phpMyAdmin</a> como <b>root</b>, selecione o banco '
       . '<b>lumiar_aventura</b>, vá na aba <b>SQL</b> e rode o conteúdo do arquivo <code>loja/instalar.sql</code>. Depois recarregue esta página.</p>';
    exit;
}

function loja_produtos($categoria = null, $somenteAtivos = true) {
    $sql = 'SELECT * FROM loja_produtos WHERE 1=1';
    if ($somenteAtivos) $sql .= ' AND ativo = 1';
    if ($categoria !== null) $sql .= " AND categoria = '" . mysqli_real_escape_string(loja_bd(), $categoria) . "'";
    $sql .= ' ORDER BY destaque DESC, id ASC';
    return mysqli_fetch_all(mysqli_query(loja_bd(), $sql), MYSQLI_ASSOC);
}

function loja_produto($id) {
    $stmt = mysqli_prepare(loja_bd(), 'SELECT * FROM loja_produtos WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    return mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
}

// Valor e número de peças de uma lista [{id, qtd}], com preços sempre do banco.
function loja_somar_itens($itens) {
    $valor = 0; $pecas = 0;
    foreach ((array)$itens as $item) {
        $p = loja_produto((int)($item['id'] ?? 0));
        if (!$p || !$p['ativo']) continue;
        $qtd = max(1, min(50, (int)($item['qtd'] ?? 1)));
        $valor += $qtd * (float)$p['preco'];
        $pecas += $qtd;
    }
    return [$valor, $pecas];
}

// Confere um cupom para um subtotal de produtos (o desconto não vale sobre o frete).
// Devolve ['ok' => bool, 'cupom' => array, 'desconto' => float, 'mensagem' => string].
function loja_cupom_validar($codigo, $subtotal) {
    $codigo = strtoupper(trim((string)$codigo));
    if ($codigo === '') return ['ok' => false, 'mensagem' => 'Digite o código do cupom.'];
    $stmt = mysqli_prepare(loja_bd(), 'SELECT * FROM loja_cupons WHERE codigo = ?');
    mysqli_stmt_bind_param($stmt, 's', $codigo);
    mysqli_stmt_execute($stmt);
    $c = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));

    if (!$c || !$c['ativo']) return ['ok' => false, 'mensagem' => 'Cupom inválido.'];
    if ($c['validade'] && $c['validade'] < date('Y-m-d')) return ['ok' => false, 'mensagem' => 'Este cupom expirou.'];
    if ($c['limite_usos'] !== null && (int)$c['usos'] >= (int)$c['limite_usos']) return ['ok' => false, 'mensagem' => 'Este cupom já atingiu o limite de usos.'];
    if ($subtotal < (float)$c['minimo']) return ['ok' => false, 'mensagem' => 'Este cupom vale para compras a partir de ' . loja_preco($c['minimo']) . '.'];

    $desconto = $c['tipo'] === 'valor' ? (float)$c['valor'] : $subtotal * (float)$c['valor'] / 100;
    $desconto = round(min($desconto, $subtotal), 2);
    $rotulo = $c['tipo'] === 'valor' ? loja_preco($c['valor']) : rtrim(rtrim(number_format($c['valor'], 2, ',', ''), '0'), ',') . '%';
    return ['ok' => true, 'cupom' => $c, 'desconto' => $desconto, 'mensagem' => "Cupom {$c['codigo']} aplicado: $rotulo de desconto."];
}

function loja_lista($texto) {
    return array_values(array_filter(array_map('trim', explode(',', (string)$texto)), 'strlen'));
}

function loja_preco($valor) {
    return 'R$ ' . number_format((float)$valor, 2, ',', '.');
}

function e($texto) {
    return htmlspecialchars((string)$texto, ENT_QUOTES, 'UTF-8');
}

// Cores nomeadas usadas nos mockups (quando o produto ainda não tem foto).
function loja_cor_hex($nome) {
    $mapa = [
        'verde-mata' => '#245c40', 'areia' => '#e7ddc9', 'preto' => '#1b1b1b',
        'branco' => '#fdfaf4', 'branca' => '#fdfaf4', 'azul-rio' => '#2e7d8c',
        // Cores da VAVI Estampas
        'azul-marinho' => '#0f2a4a', 'azul-royal' => '#1f3f8f', 'azul-celeste' => '#1fa0d8',
        'verde-musgo' => '#1f3d2b', 'verde-bandeira' => '#0f8a3c', 'cinza' => '#9a9a9a', 'off-white' => '#fdffe7', 'verde-oliva' => '#b6b88b',
    ];
    return $mapa[strtolower(trim($nome))] ?? '#245c40';
}

// Mockup em SVG por categoria — substituído pela foto quando "imagem" é preenchida.
function loja_mockup($produto, $cor = null) {
    $cores = loja_lista($produto['cores']);
    $hex = loja_cor_hex($cor ?? ($cores[0] ?? ''));
    $tinta = in_array($hex, ['#e7ddc9', '#fdfaf4']) ? '#163829' : '#e2a53d';
    switch ($produto['categoria']) {
        case 'caneca':
            $forma = "<path d='M110 90h150v170a30 30 0 0 1-30 30h-90a30 30 0 0 1-30-30z' fill='$hex' stroke='#163829' stroke-width='4'/>"
                   . "<path d='M260 130h20a35 35 0 0 1 0 70h-20' fill='none' stroke='#163829' stroke-width='12'/>"
                   . "<path d='M130 200 C160 170 190 230 240 190' stroke='$tinta' stroke-width='6' fill='none' stroke-dasharray='8 8'/>";
            break;
        case 'lembrancinha':
            $forma = "<rect x='120' y='110' width='160' height='160' rx='20' fill='$hex' stroke='#163829' stroke-width='4'/>"
                   . "<circle cx='200' cy='110' r='14' fill='none' stroke='#163829' stroke-width='5'/>"
                   . "<path d='M140 230 L180 170 L205 205 L225 180 L262 230z' fill='$tinta'/>";
            break;
        default: // camisas
            $forma = "<path d='M140 70 L100 90 L60 150 L105 175 L120 155 L120 330 L280 330 L280 155 L295 175 L340 150 L300 90 L260 70 C250 95 150 95 140 70z' fill='$hex' stroke='#163829' stroke-width='4' stroke-linejoin='round'/>"
                   . "<path d='M150 200 C180 170 210 240 250 200' stroke='$tinta' stroke-width='6' fill='none' stroke-dasharray='8 8'/>";
            if ($produto['categoria'] === 'camisa-lycra') {
                $forma .= "<text x='200' y='280' text-anchor='middle' font-family='monospace' font-size='18' fill='$tinta'>UV50+</text>";
            }
    }
    $svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'><rect width='400' height='400' fill='#f2ece0'/>$forma</svg>";
    return 'data:image/svg+xml;charset=utf-8,' . rawurlencode($svg);
}

function loja_imagem($produto, $cor = null) {
    return $produto['imagem'] !== '' ? $produto['imagem'] : loja_mockup($produto, $cor);
}
