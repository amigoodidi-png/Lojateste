<?php
require __DIR__ . '/_config.php';
require __DIR__ . '/_vavi.php';
require __DIR__ . '/_login.php';

$bd = loja_bd();
$aba = in_array($_GET['aba'] ?? '', ['produtos', 'cupons'], true) ? $_GET['aba'] : 'pedidos';
$msg = '';
$erro = '';
const STATUS_PEDIDO = ['novo', 'pago', 'enviado-ao-fornecedor', 'entregue', 'cancelado'];

// Upload de foto do produto para loja/uploads (somente imagens).
function salvar_upload($campo = 'foto') {
    if (empty($_FILES[$campo]['tmp_name']) || $_FILES[$campo]['error'] !== UPLOAD_ERR_OK) return null;
    $tipos = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    $tipo = mime_content_type($_FILES[$campo]['tmp_name']);
    if (!isset($tipos[$tipo])) return null;
    if (!is_dir(__DIR__ . '/uploads')) mkdir(__DIR__ . '/uploads');
    $nome = 'uploads/' . date('YmdHis') . '-' . bin2hex(random_bytes(3)) . '.' . $tipos[$tipo];
    move_uploaded_file($_FILES[$campo]['tmp_name'], __DIR__ . '/' . $nome);
    return $nome;
}

// Salvar produto (novo ou edição)
if (isset($_POST['salvar_produto'])) {
    $id = (int)$_POST['id'];
    $f = fn($k) => trim((string)($_POST[$k] ?? ''));
    $nome = $f('nome'); $categoria = $f('categoria'); $descricao = $f('descricao');
    $preco = (float)str_replace(',', '.', $f('preco'));
    $tamanhos = $f('tamanhos'); $cores = $f('cores');
    $imagem = salvar_upload() ?? $f('imagem');
    $imagemCostas = salvar_upload('foto_costas') ?? $f('imagem_costas');
    $lado = in_array($_POST['lado_estampa'] ?? '', ['frente', 'costas'], true) ? $_POST['lado_estampa'] : '';
    $fornecedor = $f('fornecedor'); $sku = $f('sku_fornecedor');
    $custo = (float)str_replace(',', '.', $f('custo'));
    $destaque = isset($_POST['destaque']) ? 1 : 0;
    $ativo = isset($_POST['ativo']) ? 1 : 0;

    if ($nome === '' || !isset(LOJA_CATEGORIAS[$categoria]) || $preco <= 0) {
        $erro = 'Preencha nome, categoria e preço.';
    } elseif ($id > 0) {
        $stmt = mysqli_prepare($bd, 'UPDATE loja_produtos SET nome=?, categoria=?, descricao=?, preco=?, tamanhos=?, cores=?, imagem=?, imagem_costas=?, lado_estampa=?, fornecedor=?, sku_fornecedor=?, custo=?, destaque=?, ativo=? WHERE id=?');
        mysqli_stmt_bind_param($stmt, 'sssdsssssssdiii', $nome, $categoria, $descricao, $preco, $tamanhos, $cores, $imagem, $imagemCostas, $lado, $fornecedor, $sku, $custo, $destaque, $ativo, $id);
        mysqli_stmt_execute($stmt);
        $msg = 'Produto atualizado.';
    } else {
        $stmt = mysqli_prepare($bd, 'INSERT INTO loja_produtos (nome, categoria, descricao, preco, tamanhos, cores, imagem, imagem_costas, lado_estampa, fornecedor, sku_fornecedor, custo, destaque, ativo) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
        mysqli_stmt_bind_param($stmt, 'sssdsssssssdii', $nome, $categoria, $descricao, $preco, $tamanhos, $cores, $imagem, $imagemCostas, $lado, $fornecedor, $sku, $custo, $destaque, $ativo);
        mysqli_stmt_execute($stmt);
        $msg = 'Produto cadastrado.';
    }
    $aba = 'produtos';
}

// Remover produto
if (isset($_POST['remover_produto'])) {
    $stmt = mysqli_prepare($bd, 'DELETE FROM loja_produtos WHERE id = ?');
    $id = (int)$_POST['remover_produto'];
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $msg = 'Produto removido.';
    $aba = 'produtos';
}

// Enviar pedido à VAVI (fica como rascunho no portal VAVI até você confirmar e pagar)
if (isset($_POST['enviar_vavi'])) {
    $stmt = mysqli_prepare($bd, 'SELECT * FROM loja_pedidos WHERE id = ?');
    $id = (int)$_POST['enviar_vavi'];
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $pedido = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    $r = $pedido ? vavi_enviar_pedido($pedido) : ['ok' => false, 'erro' => 'pedido não encontrado'];
    if ($r['ok']) {
        $stmt = mysqli_prepare($bd, "UPDATE loja_pedidos SET vavi_draft = ?, vavi_enviado_em = NOW(), status = 'enviado-ao-fornecedor' WHERE id = ?");
        mysqli_stmt_bind_param($stmt, 'si', $r['draft'], $id);
        mysqli_stmt_execute($stmt);
        $msg = "Pedido {$pedido['codigo']} enviado à VAVI. Agora confirme a arte e pague no portal VAVI (Integrações → Pedidos).";
    } else {
        $erro = 'Não foi possível enviar à VAVI: ' . $r['erro'];
    }
}

// Atualizar situação e rastreio na VAVI (com o nº BEE... informado, quando o rascunho já virou pedido)
if (isset($_POST['acompanhar_vavi'])) {
    $id = (int)$_POST['acompanhar_vavi'];
    $stmt = mysqli_prepare($bd, 'SELECT * FROM loja_pedidos WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $pedido = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    $nsu = strtoupper(trim((string)($_POST['vavi_nsu'] ?? '')));
    if ($pedido && $nsu !== '') $pedido['vavi_nsu'] = $nsu;
    $r = $pedido ? vavi_acompanhar_pedido($pedido) : ['ok' => false, 'erro' => 'pedido não encontrado'];
    if ($r['ok']) {
        $c = $r['campos'] + ['vavi_nsu' => $pedido['vavi_nsu'], 'rastreio_codigo' => $pedido['rastreio_codigo'], 'rastreio_url' => $pedido['rastreio_url'], 'transportadora' => $pedido['transportadora']];
        $status = $pedido['status'];
        if ($c['vavi_status'] === 'DELIVERED') $status = 'entregue';
        if ($c['vavi_status'] === 'CANCELED' || $c['vavi_status'] === 'Discarded') $status = 'cancelado';
        $stmt = mysqli_prepare($bd, 'UPDATE loja_pedidos SET vavi_status = ?, vavi_nsu = ?, rastreio_codigo = ?, rastreio_url = ?, transportadora = ?, status = ? WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'ssssssi', $c['vavi_status'], $c['vavi_nsu'], $c['rastreio_codigo'], $c['rastreio_url'], $c['transportadora'], $status, $id);
        mysqli_stmt_execute($stmt);
        $msg = "Pedido {$pedido['codigo']}: " . vavi_status_texto($c['vavi_status']) . ($c['rastreio_codigo'] ? ", rastreio {$c['rastreio_codigo']}" : ', ainda sem código de rastreio') . '.';
    } else {
        $erro = 'Não foi possível consultar a VAVI: ' . $r['erro'];
    }
}

// Cupons: salvar (novo ou edição) e remover
if (isset($_POST['salvar_cupom'])) {
    $id = (int)$_POST['id'];
    $codigo = strtoupper(preg_replace('/\s+/', '', (string)($_POST['codigo'] ?? '')));
    $tipo = ($_POST['tipo'] ?? '') === 'valor' ? 'valor' : 'percentual';
    $valor = (float)str_replace(',', '.', (string)($_POST['valor'] ?? ''));
    $minimo = (float)str_replace(',', '.', (string)($_POST['minimo'] ?? '0'));
    $validade = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_POST['validade'] ?? '') ? $_POST['validade'] : null;
    $limite = (int)($_POST['limite_usos'] ?? 0) > 0 ? (int)$_POST['limite_usos'] : null;
    $ativo = isset($_POST['ativo']) ? 1 : 0;

    if ($codigo === '' || $valor <= 0 || ($tipo === 'percentual' && $valor > 100)) {
        $erro = 'Preencha o código e um desconto válido (porcentagem de 1 a 100, ou valor em R$).';
    } else {
        $sql = $id > 0
            ? 'UPDATE loja_cupons SET codigo=?, tipo=?, valor=?, minimo=?, validade=?, limite_usos=?, ativo=? WHERE id=?'
            : 'INSERT INTO loja_cupons (codigo, tipo, valor, minimo, validade, limite_usos, ativo) VALUES (?,?,?,?,?,?,?)';
        $stmt = mysqli_prepare($bd, $sql);
        if ($id > 0) mysqli_stmt_bind_param($stmt, 'ssddsiii', $codigo, $tipo, $valor, $minimo, $validade, $limite, $ativo, $id);
        else mysqli_stmt_bind_param($stmt, 'ssddsii', $codigo, $tipo, $valor, $minimo, $validade, $limite, $ativo);
        try {
            mysqli_stmt_execute($stmt);
            $msg = $id > 0 ? "Cupom $codigo atualizado." : "Cupom $codigo criado.";
        } catch (mysqli_sql_exception $ex) {
            $erro = "Já existe um cupom com o código $codigo.";
        }
    }
    $aba = 'cupons';
}
if (isset($_POST['remover_cupom'])) {
    $stmt = mysqli_prepare($bd, 'DELETE FROM loja_cupons WHERE id = ?');
    $id = (int)$_POST['remover_cupom'];
    mysqli_stmt_bind_param($stmt, 'i', $id);
    mysqli_stmt_execute($stmt);
    $msg = 'Cupom removido.';
    $aba = 'cupons';
}

// Mudar status do pedido
if (isset($_POST['status_pedido']) && in_array($_POST['status'] ?? '', STATUS_PEDIDO, true)) {
    $stmt = mysqli_prepare($bd, 'UPDATE loja_pedidos SET status = ? WHERE id = ?');
    $id = (int)$_POST['status_pedido'];
    mysqli_stmt_bind_param($stmt, 'si', $_POST['status'], $id);
    mysqli_stmt_execute($stmt);
    $msg = 'Status do pedido atualizado.';
}

$editando = isset($_GET['editar']) ? loja_produto((int)$_GET['editar']) : null;
if ($editando) $aba = 'produtos';
$produtos = loja_produtos(null, false);
$cupons = mysqli_fetch_all(mysqli_query($bd, 'SELECT * FROM loja_cupons ORDER BY ativo DESC, id DESC'), MYSQLI_ASSOC);
$cupomEditando = null;
if (isset($_GET['editar_cupom'])) {
    $stmt = mysqli_prepare($bd, 'SELECT * FROM loja_cupons WHERE id = ?');
    $idc = (int)$_GET['editar_cupom'];
    mysqli_stmt_bind_param($stmt, 'i', $idc);
    mysqli_stmt_execute($stmt);
    $cupomEditando = mysqli_fetch_assoc(mysqli_stmt_get_result($stmt));
    if ($cupomEditando) $aba = 'cupons';
}
$pedidos = mysqli_fetch_all(mysqli_query($bd, 'SELECT * FROM loja_pedidos ORDER BY id DESC LIMIT 200'), MYSQLI_ASSOC);

$titulo = 'Painel da loja';
$pagina = 'admin';
include __DIR__ . '/_topo.php';
?>
<div class="page-head compact"><div class="container"><span class="eyebrow">Área restrita</span><h1>Painel da loja</h1></div></div>
<?php if ($msg): ?><div class="notice"><div class="container">✅ <?= e($msg) ?></div></div><?php endif; ?>
<?php if ($erro): ?><div class="notice alert"><div class="container">⚠️ <?= e($erro) ?></div></div><?php endif; ?>
<section class="section">
<div class="container">
<div class="admin-tabs filters">
<a href="admin.php?aba=pedidos" class="<?= $aba === 'pedidos' ? 'active' : '' ?>">Pedidos (<?= count($pedidos) ?>)</a>
<a href="admin.php?aba=produtos" class="<?= $aba === 'produtos' ? 'active' : '' ?>">Produtos (<?= count($produtos) ?>)</a>
<a href="admin.php?aba=cupons" class="<?= $aba === 'cupons' ? 'active' : '' ?>">Cupons (<?= count($cupons) ?>)</a>
</div>

<?php if ($aba === 'pedidos'): ?>
<p class="hint" style="margin-bottom:16px;">Fluxo sob demanda: confirme o pagamento com o cliente no WhatsApp, marque como <b>pago</b> e clique em <b>Enviar à VAVI</b>. O pedido chega como rascunho no portal VAVI, onde você confirma a arte e paga a produção. <?= vavi_configurada() ? "" : "<b style=\"color:var(--danger)\">Chave de API da VAVI ainda não configurada (" . e(VAVI_CONFIG) . ").</b>" ?></p>
<?php if (!$pedidos): ?>
<div class="empty">Nenhum pedido ainda.</div>
<?php else: ?>
<div class="table-wrap">
<table>
<tr><th>Pedido</th><th>Cliente</th><th>Entrega</th><th>Itens (fornecedor · SKU)</th><th>Total</th><th>Status</th></tr>
<?php foreach ($pedidos as $o): ?>
<tr>
<td><strong><?= e($o['codigo']) ?></strong><br><span class="hint"><?= e(date('d/m/Y H:i', strtotime($o['criado_em']))) ?></span></td>
<td><?= e($o['nome']) ?><br><a style="color:var(--river-500)" href="https://wa.me/55<?= e(preg_replace('/\D/', '', $o['telefone'])) ?>" target="_blank" rel="noopener"><?= e($o['telefone']) ?></a><br><?= e($o['email']) ?></td>
<td><?= e(implode(', ', array_filter([$o['endereco'], $o['numero'], $o['complemento']]))) ?><br><?= e($o['bairro']) ?><?= $o['cpf'] ? ' · CPF ' . e($o['cpf']) : '' ?><br><?= e($o['cidade']) ?>/<?= e($o['uf']) ?> · <?= e($o['cep']) ?><?= $o['observacoes'] ? '<br><em>' . e($o['observacoes']) . '</em>' : '' ?></td>
<td>
<?php foreach ((array)json_decode($o['itens'], true) as $i): ?>
<?= (int)$i['qtd'] ?>x <?= e($i['nome']) ?><?= ($i['tamanho'] || $i['cor']) ? ' (' . e(implode(' / ', array_filter([$i['tamanho'], $i['cor']]))) . ')' : '' ?>
<br><span class="hint"><?= e($i['fornecedor'] ?: 'sem fornecedor') ?> · <?= e($i['sku_fornecedor'] ?: 'sem SKU') ?></span><br>
<?php endforeach; ?>
</td>
<td style="font-family:var(--mono);white-space:nowrap;"><?= loja_preco($o['total']) ?><?php if ($o['desconto'] > 0): ?><br><span class="hint">− cupom <?= e($o['cupom']) ?> <?= loja_preco($o['desconto']) ?></span><?php endif; ?><?php if ($o['frete'] > 0): ?><br><span class="hint">+ frete <?= loja_preco($o['frete']) ?></span><?php endif; ?><?= $o['frete_servico'] ? '<br><span class="hint">' . e($o['frete_servico']) . '</span>' : '' ?></td>
<td>
<span class="status <?= e($o['status']) ?>"><?= e(str_replace('-', ' ', $o['status'])) ?></span>
<?php if ($o['vavi_draft']): ?>
<div class="hint" style="margin-top:6px;">VAVI: enviado em <?= e(date('d/m H:i', strtotime($o['vavi_enviado_em']))) ?><?= $o['vavi_status'] ? '<br>Situação: <b>' . e(vavi_status_texto($o['vavi_status'])) . '</b>' : '' ?><?= $o['vavi_nsu'] ? '<br>Pedido VAVI ' . e($o['vavi_nsu']) : '' ?></div>
<?php if ($o['rastreio_codigo']): ?>
<div class="hint" style="margin-top:4px;">Rastreio: <?= $o['rastreio_url'] ? '<a style="color:var(--river-500)" href="' . e($o['rastreio_url']) . '" target="_blank" rel="noopener">' . e($o['rastreio_codigo']) . '</a>' : e($o['rastreio_codigo']) ?><?= $o['transportadora'] ? ' · ' . e($o['transportadora']) : '' ?></div>
<?php
$msgRastreio = "Olá, {$o['nome']}! Seu pedido {$o['codigo']} da Loja Lumiar Aventura foi enviado. Código de rastreio: {$o['rastreio_codigo']}"
    . ($o['transportadora'] ? " ({$o['transportadora']})" : '') . ($o['rastreio_url'] ? "\nAcompanhe aqui: {$o['rastreio_url']}" : '');
?>
<a class="link-btn" style="display:inline-block;margin-top:4px;" target="_blank" rel="noopener" href="https://wa.me/55<?= e(preg_replace('/\D/', '', $o['telefone'])) ?>?text=<?= rawurlencode($msgRastreio) ?>">Mandar rastreio ao cliente →</a>
<?php endif; ?>
<form method="post" style="margin-top:8px;">
<input type="hidden" name="acompanhar_vavi" value="<?= (int)$o['id'] ?>">
<?php if (!$o['vavi_nsu']): ?><input name="vavi_nsu" placeholder="Nº VAVI (BEE...)" aria-label="Número do pedido na VAVI" style="width:130px;font-size:0.75rem;padding:4px;"><?php endif; ?>
<button class="link-btn" type="submit">Atualizar rastreio ↻</button>
</form>
<?php elseif ($o['status'] !== 'cancelado'): ?>
<form method="post" style="margin-top:8px;" onsubmit="return confirm('Enviar este pedido para a VAVI? Ele chega como rascunho no portal VAVI.')">
<input type="hidden" name="enviar_vavi" value="<?= (int)$o['id'] ?>">
<button class="link-btn" type="submit">Enviar à VAVI →</button>
</form>
<?php endif; ?>
<form method="post" style="margin-top:8px;">
<input type="hidden" name="status_pedido" value="<?= (int)$o['id'] ?>">
<select name="status" onchange="this.form.submit()" aria-label="Mudar status">
<?php foreach (STATUS_PEDIDO as $s): ?><option value="<?= $s ?>" <?= $s === $o['status'] ? 'selected' : '' ?>><?= str_replace('-', ' ', $s) ?></option><?php endforeach; ?>
</select>
</form>
</td>
</tr>
<?php endforeach; ?>
</table>
</div>
<?php endif; ?>

<?php elseif ($aba === 'cupons'): ?>
<form class="box" method="post" style="margin-bottom:40px;">
<h2><?= $cupomEditando ? 'Editar cupom' : 'Novo cupom' ?></h2>
<input type="hidden" name="salvar_cupom" value="1">
<input type="hidden" name="id" value="<?= (int)($cupomEditando['id'] ?? 0) ?>">
<div class="form-grid">
<div class="field"><label>Código (o que o cliente digita)</label><input name="codigo" required maxlength="30" placeholder="Ex.: LUMIAR10" style="text-transform:uppercase" value="<?= e($cupomEditando['codigo'] ?? '') ?>"></div>
<div class="field"><label>Tipo de desconto</label><select name="tipo">
<option value="percentual" <?= ($cupomEditando['tipo'] ?? '') === 'percentual' ? 'selected' : '' ?>>Porcentagem (%)</option>
<option value="valor" <?= ($cupomEditando['tipo'] ?? '') === 'valor' ? 'selected' : '' ?>>Valor fixo (R$)</option>
</select></div>
<div class="field"><label>Desconto (% ou R$)</label><input name="valor" required inputmode="decimal" value="<?= e($cupomEditando ? number_format($cupomEditando['valor'], 2, ',', '') : '') ?>"></div>
<div class="field"><label>Compra mínima em produtos (R$, opcional)</label><input name="minimo" inputmode="decimal" value="<?= e($cupomEditando && $cupomEditando['minimo'] > 0 ? number_format($cupomEditando['minimo'], 2, ',', '') : '') ?>"></div>
<div class="field"><label>Válido até (opcional)</label><input type="date" name="validade" value="<?= e($cupomEditando['validade'] ?? '') ?>"></div>
<div class="field"><label>Limite de usos (opcional)</label><input type="number" min="1" name="limite_usos" value="<?= e($cupomEditando['limite_usos'] ?? '') ?>"></div>
<div class="field"><label><input type="checkbox" name="ativo" <?= ($cupomEditando['ativo'] ?? 1) ? 'checked' : '' ?>> Ativo</label></div>
</div>
<p class="hint">O desconto vale só sobre os produtos, não sobre o frete. O que você paga à VAVI não muda: o desconto sai da sua margem.</p>
<div class="buy-row" style="margin-top:18px;">
<button class="btn btn-primary" type="submit"><?= $cupomEditando ? 'Salvar alterações' : 'Criar cupom' ?></button>
<?php if ($cupomEditando): ?><a class="btn btn-line" href="admin.php?aba=cupons">Cancelar</a><?php endif; ?>
</div>
</form>
<?php if (!$cupons): ?>
<div class="empty">Nenhum cupom criado ainda.</div>
<?php else: ?>
<div class="table-wrap">
<table>
<tr><th>Código</th><th>Desconto</th><th>Mínimo</th><th>Validade</th><th>Usos</th><th>Situação</th><th></th></tr>
<?php foreach ($cupons as $c):
    $vencido = $c['validade'] && $c['validade'] < date('Y-m-d');
    $esgotado = $c['limite_usos'] !== null && $c['usos'] >= $c['limite_usos'];
?>
<tr style="<?= $c['ativo'] && !$vencido && !$esgotado ? '' : 'opacity:0.55' ?>">
<td style="font-family:var(--mono);"><strong><?= e($c['codigo']) ?></strong></td>
<td style="font-family:var(--mono);"><?= $c['tipo'] === 'valor' ? loja_preco($c['valor']) : e(rtrim(rtrim(number_format($c['valor'], 2, ',', ''), '0'), ',')) . '%' ?></td>
<td style="font-family:var(--mono);"><?= $c['minimo'] > 0 ? loja_preco($c['minimo']) : '—' ?></td>
<td><?= $c['validade'] ? e(date('d/m/Y', strtotime($c['validade']))) : 'sem validade' ?></td>
<td><?= (int)$c['usos'] ?><?= $c['limite_usos'] !== null ? ' de ' . (int)$c['limite_usos'] : '' ?></td>
<td><?= !$c['ativo'] ? 'inativo' : ($vencido ? 'vencido' : ($esgotado ? 'esgotado' : 'ativo')) ?></td>
<td style="white-space:nowrap;">
<a class="link-btn" href="admin.php?aba=cupons&editar_cupom=<?= (int)$c['id'] ?>">Editar</a>
<form method="post" style="display:inline" onsubmit="return confirm('Remover este cupom?')">
<input type="hidden" name="remover_cupom" value="<?= (int)$c['id'] ?>">
<button class="link-btn danger" type="submit">Remover</button>
</form>
</td>
</tr>
<?php endforeach; ?>
</table>
</div>
<?php endif; ?>
<?php else: ?>
<form class="box" method="post" enctype="multipart/form-data" style="margin-bottom:40px;">
<h2><?= $editando ? 'Editar produto' : 'Novo produto' ?></h2>
<input type="hidden" name="salvar_produto" value="1">
<input type="hidden" name="id" value="<?= (int)($editando['id'] ?? 0) ?>">
<div class="form-grid">
<div class="field"><label>Nome</label><input name="nome" required value="<?= e($editando['nome'] ?? '') ?>"></div>
<div class="field"><label>Categoria</label><select name="categoria"><?php foreach (LOJA_CATEGORIAS as $slug => $n): ?><option value="<?= $slug ?>" <?= ($editando['categoria'] ?? '') === $slug ? 'selected' : '' ?>><?= e($n) ?></option><?php endforeach; ?></select></div>
<div class="field full"><label>Descrição</label><textarea name="descricao" rows="3"><?= e($editando['descricao'] ?? '') ?></textarea></div>
<div class="field"><label>Preço de venda (R$)</label><input name="preco" required inputmode="decimal" value="<?= e(isset($editando) ? number_format($editando['preco'], 2, ',', '') : '') ?>"></div>
<div class="field"><label>Custo no fornecedor (R$)</label><input name="custo" inputmode="decimal" value="<?= e(isset($editando) ? number_format($editando['custo'], 2, ',', '') : '') ?>"></div>
<div class="field"><label>Tamanhos (separados por vírgula)</label><input name="tamanhos" placeholder="P,M,G,GG" value="<?= e($editando['tamanhos'] ?? '') ?>"></div>
<div class="field"><label>Cores (separadas por vírgula)</label><input name="cores" placeholder="Preto,Branco,Verde-mata" value="<?= e($editando['cores'] ?? '') ?>"></div>
<div class="field"><label>Fornecedor (POD / dropshipping)</label><input name="fornecedor" placeholder="Ex.: Dimona, Printful" value="<?= e($editando['fornecedor'] ?? '') ?>"></div>
<div class="field"><label>SKU no fornecedor</label><input name="sku_fornecedor" value="<?= e($editando['sku_fornecedor'] ?? '') ?>"></div>
<div class="field"><label>Foto da frente (enviar arquivo)</label><input type="file" name="foto" accept="image/jpeg,image/png,image/webp"></div>
<div class="field"><label>…ou endereço da foto</label><input name="imagem" placeholder="vazio = mockup automático" value="<?= e($editando['imagem'] ?? '') ?>"></div>
<div class="field"><label>Foto das costas (opcional)</label><input type="file" name="foto_costas" accept="image/jpeg,image/png,image/webp"></div>
<div class="field"><label>…ou endereço da foto das costas</label><input name="imagem_costas" value="<?= e($editando['imagem_costas'] ?? '') ?>"></div>
<div class="field"><label>Estampa de um lado só? (mostra um selo)</label><select name="lado_estampa"><option value="">Não / frente e costas</option><option value="frente" <?= ($editando['lado_estampa'] ?? '') === 'frente' ? 'selected' : '' ?>>Só na frente</option><option value="costas" <?= ($editando['lado_estampa'] ?? '') === 'costas' ? 'selected' : '' ?>>Só nas costas</option></select></div>
<div class="field"><label><input type="checkbox" name="destaque" <?= !empty($editando['destaque']) ? 'checked' : '' ?>> Destaque na vitrine</label></div>
<div class="field"><label><input type="checkbox" name="ativo" <?= ($editando['ativo'] ?? 1) ? 'checked' : '' ?>> Ativo (aparece na loja)</label></div>
</div>
<div class="buy-row" style="margin-top:18px;">
<button class="btn btn-primary" type="submit"><?= $editando ? 'Salvar alterações' : 'Cadastrar produto' ?></button>
<?php if ($editando): ?><a class="btn btn-line" href="admin.php?aba=produtos">Cancelar</a><?php endif; ?>
</div>
</form>

<div class="table-wrap">
<table>
<tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Custo · margem</th><th>Fornecedor</th><th></th></tr>
<?php foreach ($produtos as $p): ?>
<tr style="<?= $p['ativo'] ? '' : 'opacity:0.5' ?>">
<td><img src="<?= e(loja_imagem($p)) ?>" alt="" style="width:48px;height:48px;object-fit:cover;"></td>
<td><strong><?= e($p['nome']) ?></strong><?= $p['destaque'] ? ' ★' : '' ?><?= $p['ativo'] ? '' : ' (inativo)' ?></td>
<td><?= e(LOJA_CATEGORIAS[$p['categoria']] ?? $p['categoria']) ?></td>
<td style="font-family:var(--mono);white-space:nowrap;"><?= loja_preco($p['preco']) ?></td>
<td style="font-family:var(--mono);white-space:nowrap;"><?= $p['custo'] > 0 ? loja_preco($p['custo']) . ' · ' . loja_preco($p['preco'] - $p['custo']) : '—' ?></td>
<td><?= e($p['fornecedor'] ?: '—') ?><br><span class="hint"><?= e($p['sku_fornecedor']) ?></span></td>
<td style="white-space:nowrap;">
<a class="link-btn" href="admin.php?editar=<?= (int)$p['id'] ?>">Editar</a>
<form method="post" style="display:inline" onsubmit="return confirm('Remover este produto?')">
<input type="hidden" name="remover_produto" value="<?= (int)$p['id'] ?>">
<button class="link-btn danger" type="submit">Remover</button>
</form>
</td>
</tr>
<?php endforeach; ?>
</table>
</div>
<?php endif; ?>
</div>
</section>
<footer><div class="container">PAINEL DA LOJA · <a href="index.php">VER LOJA</a><?php if (!LOJA_LOCAL): ?> · <a href="admin.php?sair=1">SAIR</a><?php endif; ?></div></footer>
<script src="loja.js?v=<?= filemtime(__DIR__ . "/loja.js") ?>"></script>
</body>
</html>
