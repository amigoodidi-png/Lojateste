<?php
require __DIR__ . '/_config.php';

$p = loja_produto((int)($_GET['id'] ?? 0));
if (!$p || !$p['ativo']) {
    http_response_code(404);
    $titulo = 'Produto não encontrado';
    $pagina = 'loja';
    include __DIR__ . '/_topo.php';
    echo '<div class="page-head compact"><div class="container"><h1>Produto não encontrado</h1><p><a href="index.php">← Voltar para a loja</a></p></div></div>';
    include __DIR__ . '/_rodape.php';
    exit;
}

$tamanhos = loja_lista($p['tamanhos']);
$cores = loja_lista($p['cores']);
// Imagem por cor (mockup muda de cor; foto real fica igual).
$imagensPorCor = [];
foreach ($cores as $cor) $imagensPorCor[$cor] = loja_imagem($p, $cor);

$titulo = $p['nome'];
$pagina = 'loja';
include __DIR__ . '/_topo.php';
?>
<div class="page-head compact">
<div class="container">
<a class="eyebrow" href="index.php?categoria=<?= e($p['categoria']) ?>">← <?= e(LOJA_CATEGORIAS[$p['categoria']] ?? 'Loja') ?></a>
</div>
</div>
<section class="section">
<div class="container product-detail">
<div>
<img id="productImage" src="<?= e(loja_imagem($p)) ?>" alt="<?= e($p['nome']) ?>">
<?php if (!empty($p['imagem_costas'])): ?>
<div class="thumbs">
<button type="button" class="active" data-foto="<?= e(loja_imagem($p)) ?>"><img src="<?= e(loja_imagem($p)) ?>" alt="Estampa principal"><span>Principal</span></button>
<button type="button" data-foto="<?= e($p['imagem_costas']) ?>"><img src="<?= e($p['imagem_costas']) ?>" alt="Outro lado da camisa"><span>Outro lado</span></button>
</div>
<?php endif; ?>
</div>
<div>
<span class="eyebrow"><?= e(LOJA_CATEGORIAS[$p['categoria']] ?? '') ?></span>
<?php if ($p['lado_estampa']): ?><span class="selo-lado inline">Estampa só <?= $p['lado_estampa'] === 'costas' ? 'nas costas' : 'na frente' ?></span><?php endif; ?>
<h1><?= e($p['nome']) ?></h1>
<div class="price"><?= loja_preco($p['preco']) ?></div>
<p class="desc"><?= nl2br(e($p['descricao'])) ?></p>

<form id="addForm"
      data-id="<?= (int)$p['id'] ?>"
      data-nome="<?= e($p['nome']) ?>"
      data-preco="<?= e($p['preco']) ?>"
      data-imagem="<?= e(loja_imagem($p)) ?>"
      data-imagens='<?= e(json_encode($imagensPorCor)) ?>'>
<?php if ($tamanhos): ?>
<div class="option-group">
<span class="label">Tamanho</span>
<div class="options">
<?php foreach ($tamanhos as $t): ?>
<label><input type="radio" name="tamanho" value="<?= e($t) ?>" required><span><?= e($t) ?></span></label>
<?php endforeach; ?>
</div>
</div>
<?php endif; ?>
<?php if ($cores): ?>
<div class="option-group">
<span class="label">Cor</span>
<div class="options">
<?php foreach ($cores as $i => $c): ?>
<label><input type="radio" name="cor" value="<?= e($c) ?>" <?= $i === 0 ? 'checked' : '' ?>><span><?= e($c) ?></span></label>
<?php endforeach; ?>
</div>
</div>
<?php endif; ?>
<div class="option-group">
<span class="label">Quantidade</span>
<div class="buy-row">
<div class="qty">
<button type="button" data-qty="-1" aria-label="Diminuir">−</button>
<input type="number" name="qtd" value="1" min="1" max="50" aria-label="Quantidade">
<button type="button" data-qty="1" aria-label="Aumentar">+</button>
</div>
<button class="btn btn-primary" type="submit">Adicionar ao carrinho</button>
</div>
</div>
</form>

<div class="perks">
<div><strong>Produzido sob demanda.</strong> Sua peça é impressa depois do pedido, por isso o prazo de produção é de 3 a 7 dias úteis antes do envio.</div>
<div><strong>Envio para todo o Brasil.</strong> O frete é calculado e confirmado com você pelo WhatsApp ao fechar o pedido.</div>
<?php if (str_starts_with($p['categoria'], 'camisa')): ?>
<div><strong>Dúvida no tamanho?</strong> Mande sua altura e peso no WhatsApp que a equipe indica o melhor tamanho.</div>
<?php endif; ?>
</div>
</div>
</div>
</section>
<?php include __DIR__ . '/_rodape.php'; ?>
