<?php
require __DIR__ . '/_config.php';
require __DIR__ . '/_vavi.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: carrinho.php');
    exit;
}

$campo = fn($nome, $max) => mb_substr(trim((string)($_POST[$nome] ?? '')), 0, $max);
$cliente = [
    'nome' => $campo('nome', 120), 'telefone' => $campo('telefone', 30), 'email' => $campo('email', 120),
    'cpf' => preg_replace('/\D/', '', $campo('cpf', 14)),
    'cep' => $campo('cep', 10), 'endereco' => $campo('endereco', 255), 'numero' => $campo('numero', 20),
    'complemento' => $campo('complemento', 80), 'bairro' => $campo('bairro', 80), 'cidade' => $campo('cidade', 80),
    'uf' => strtoupper($campo('uf', 2)), 'observacoes' => $campo('observacoes', 1000),
];

// Preço e nome vêm sempre do banco — o carrinho só informa id, opções e quantidade.
$itens = [];
$total = 0;
foreach ((array)json_decode($_POST['itens'] ?? '[]', true) as $item) {
    $p = loja_produto((int)($item['id'] ?? 0));
    $qtd = max(1, min(50, (int)($item['qtd'] ?? 1)));
    if (!$p || !$p['ativo']) continue;
    $tamanho = in_array($item['tamanho'] ?? '', loja_lista($p['tamanhos']), true) ? $item['tamanho'] : '';
    $cor = in_array($item['cor'] ?? '', loja_lista($p['cores']), true) ? $item['cor'] : '';
    $itens[] = [
        'id' => (int)$p['id'], 'nome' => $p['nome'], 'tamanho' => $tamanho, 'cor' => $cor,
        'qtd' => $qtd, 'preco' => (float)$p['preco'],
        'fornecedor' => $p['fornecedor'], 'sku_fornecedor' => $p['sku_fornecedor'],
    ];
    $total += $qtd * (float)$p['preco'];
}

$erro = '';
if (!$itens) $erro = 'Seu carrinho está vazio ou os produtos não estão mais disponíveis.';
elseif ($cliente['nome'] === '' || $cliente['telefone'] === '' || $cliente['endereco'] === '' || $cliente['numero'] === ''
    || $cliente['bairro'] === '' || $cliente['cidade'] === '') $erro = 'Preencha nome, WhatsApp e endereço completo.';
elseif (strlen($cliente['cpf']) !== 11) $erro = 'Informe um CPF válido (11 dígitos). Ele é exigido na etiqueta de envio.';

// Cupom: confere de novo no servidor e reserva um uso (o limite não estoura com dois pedidos ao mesmo tempo).
$cupom = '';
$desconto = 0.0;
if ($erro === '' && trim((string)($_POST['cupom'] ?? '')) !== '') {
    $rc = loja_cupom_validar($_POST['cupom'], $total);
    if (!$rc['ok']) {
        $erro = $rc['mensagem'] . ' Volte ao carrinho e tente de novo sem ele.';
    } else {
        $stmt = mysqli_prepare(loja_bd(), 'UPDATE loja_cupons SET usos = usos + 1 WHERE id = ? AND (limite_usos IS NULL OR usos < limite_usos)');
        mysqli_stmt_bind_param($stmt, 'i', $rc['cupom']['id']);
        mysqli_stmt_execute($stmt);
        if (mysqli_stmt_affected_rows($stmt) === 1) {
            $cupom = $rc['cupom']['codigo'];
            $desconto = $rc['desconto'];
        } else {
            $erro = 'Este cupom acabou de atingir o limite de usos. Volte ao carrinho e tente de novo sem ele.';
        }
    }
}

if ($erro === '') {
    // Frete: refaz a cotação no servidor e aceita só uma opção que a VAVI devolveu.
    $frete = 0.0;
    $freteServico = '';
    $escolhido = (string)($_POST['frete_id'] ?? '');
    if ($escolhido !== '') {
        $pecas = array_sum(array_column($itens, 'qtd'));
        foreach ((array)vavi_cotar_frete($cliente['cep'], $total, $pecas) as $o) {
            if ($o['id'] === $escolhido) {
                $frete = $o['preco'];
                $freteServico = "{$o['nome']} ({$o['prazo']} dias úteis após a produção)";
            }
        }
    }

    $codigo = 'LA' . date('ymd') . strtoupper(bin2hex(random_bytes(2)));
    $itensJson = json_encode($itens, JSON_UNESCAPED_UNICODE);
    $stmt = mysqli_prepare(loja_bd(), 'INSERT INTO loja_pedidos (codigo, nome, telefone, email, cpf, cep, endereco, numero, complemento, bairro, cidade, uf, observacoes, itens, total, cupom, desconto, frete, frete_servico) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    mysqli_stmt_bind_param($stmt, 'ssssssssssssssdsdds', $codigo, $cliente['nome'], $cliente['telefone'], $cliente['email'], $cliente['cpf'],
        $cliente['cep'], $cliente['endereco'], $cliente['numero'], $cliente['complemento'], $cliente['bairro'],
        $cliente['cidade'], $cliente['uf'], $cliente['observacoes'], $itensJson, $total, $cupom, $desconto, $frete, $freteServico);
    mysqli_stmt_execute($stmt);

    $linhas = ["Olá! Fiz o pedido *$codigo* na loja do site:"];
    foreach ($itens as $i) {
        $opcoes = implode(' / ', array_filter([$i['tamanho'], $i['cor']]));
        $linhas[] = "• {$i['qtd']}x {$i['nome']}" . ($opcoes ? " ($opcoes)" : '') . ' — ' . loja_preco($i['qtd'] * $i['preco']);
    }
    $linhas[] = 'Total dos produtos: ' . loja_preco($total);
    if ($desconto > 0) $linhas[] = "Cupom $cupom: − " . loja_preco($desconto);
    $linhas[] = "Entrega: {$cliente['cidade']}/{$cliente['uf']} — CEP {$cliente['cep']}";
    if ($freteServico !== '') {
        $linhas[] = 'Frete: ' . loja_preco($frete) . " — $freteServico";
        $linhas[] = '*Total a pagar: ' . loja_preco($total - $desconto + $frete) . '*';
        $linhas[] = 'Como faço o pagamento?';
    } else {
        $linhas[] = 'Pode me passar o frete e a forma de pagamento?';
    }
    $linkWhats = 'https://wa.me/' . LOJA_WHATSAPP . '?text=' . rawurlencode(implode("\n", $linhas));
}

$titulo = $erro ? 'Pedido não enviado' : 'Pedido recebido';
$pagina = 'carrinho';
include __DIR__ . '/_topo.php';
?>
<div class="page-head compact"><div class="container"><span class="eyebrow">Loja Lumiar Aventura</span><h1><?= e($titulo) ?></h1></div></div>
<section class="section">
<div class="container success">
<?php if ($erro): ?>
<p><?= e($erro) ?></p>
<p style="margin-top:24px;"><a class="btn btn-dark" href="carrinho.php">Voltar ao carrinho</a></p>
<?php else: ?>
<p>Obrigado, <?= e(explode(' ', $cliente['nome'])[0]) ?>! Seu pedido foi registrado com o código:</p>
<div class="code"><?= e($codigo) ?></div>
<?php if ($freteServico !== ""): ?>
<p>Produtos <?= loja_preco($total) ?><?= $desconto > 0 ? ' − cupom ' . e($cupom) . ' ' . loja_preco($desconto) : '' ?> + frete <?= loja_preco($frete) ?> = <strong><?= loja_preco($total - $desconto + $frete) ?></strong>. Agora é só combinar o pagamento com a nossa equipe pelo WhatsApp.</p>
<?php else: ?>
<p>Total dos produtos: <strong><?= loja_preco($total - $desconto) ?></strong><?= $desconto > 0 ? ' (já com o cupom ' . e($cupom) . ')' : '' ?>. Agora é só confirmar o frete e o pagamento com a nossa equipe pelo WhatsApp.</p>
<?php endif; ?>
<p style="margin-top:28px;"><a class="btn btn-primary" id="whatsLink" href="<?= e($linkWhats) ?>" target="_blank" rel="noopener">Confirmar pelo WhatsApp</a></p>
<script>try { localStorage.removeItem('lumiarCarrinho'); } catch (e) {}</script>
<?php endif; ?>
</div>
</section>
<?php include __DIR__ . '/_rodape.php'; ?>
