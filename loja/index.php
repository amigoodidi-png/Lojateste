<?php
require __DIR__ . '/_config.php';

$categoria = $_GET['categoria'] ?? null;
if ($categoria !== null && !isset(LOJA_CATEGORIAS[$categoria])) $categoria = null;
$produtos = loja_produtos($categoria);

$titulo = $categoria ? LOJA_CATEGORIAS[$categoria] : 'Loja';
$pagina = 'loja';
include __DIR__ . '/_topo.php';
?>
<div class="page-head">
<div class="container">
<span class="eyebrow">Loja oficial · produzido sob demanda</span>
<h1>Leve a aventura <em>pra casa</em>.</h1>
<p>Camisas de algodão e de lycra com proteção UV, canecas e lembrancinhas com as estampas da Lumiar Aventura. Cada peça é produzida sob encomenda e enviada para todo o Brasil.</p>
</div>
</div>
<section class="section">
<div class="container">
<div class="filters">
<a href="index.php" class="<?= $categoria === null ? 'active' : '' ?>">Tudo</a>
<?php foreach (LOJA_CATEGORIAS as $slug => $nome): ?>
<a href="index.php?categoria=<?= $slug ?>" class="<?= $categoria === $slug ? 'active' : '' ?>"><?= e($nome) ?></a>
<?php endforeach; ?>
</div>
<?php if (!$produtos): ?>
<div class="empty">Nenhum produto nesta categoria ainda.</div>
<?php else: ?>
<div class="products">
<?php foreach ($produtos as $p): ?>
<a class="product-card" href="produto.php?id=<?= (int)$p['id'] ?>">
<?php if ($p['destaque']): ?><span class="badge">Destaque</span><?php endif; ?>
<?php if ($p['lado_estampa']): ?><span class="selo-lado">Estampa <?= $p['lado_estampa'] === 'costas' ? 'nas costas' : 'na frente' ?></span><?php endif; ?>
<?php if (!empty($p['imagem_costas'])): ?>
<div class="card-fotos">
<img src="<?= e(loja_imagem($p)) ?>" alt="<?= e($p['nome']) ?>" loading="lazy">
<img class="foto-2" src="<?= e($p['imagem_costas']) ?>" alt="<?= e($p['nome']) ?>, outro lado" loading="lazy">
<span class="card-dots"><span class="dot" role="button" tabindex="0" aria-label="Ver foto principal"></span><span class="dot" role="button" tabindex="0" aria-label="Ver outro lado"></span></span>
</div>
<?php else: ?>
<img src="<?= e(loja_imagem($p)) ?>" alt="<?= e($p['nome']) ?>" loading="lazy">
<?php endif; ?>
<div class="info">
<span class="tag"><?= e(LOJA_CATEGORIAS[$p['categoria']] ?? $p['categoria']) ?></span>
<h3><?= e($p['nome']) ?></h3>
<span class="price"><?= loja_preco($p['preco']) ?></span>
</div>
</a>
<?php endforeach; ?>
</div>
<?php endif; ?>
</div>
</section>
<?php include __DIR__ . '/_rodape.php'; ?>
