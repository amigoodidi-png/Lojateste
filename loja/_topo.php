<?php
// Cabeçalho comum das páginas da loja. Defina $titulo e $pagina antes do include.
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= e($titulo) ?> — Loja Lumiar Aventura</title>
<meta name="description" content="Camisas de algodão e lycra, canecas e lembrancinhas da Lumiar Aventura, turismo de aventura em Lumiar desde 1990.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="loja.css?v=<?= filemtime(__DIR__ . "/loja.css") ?>">
<?php if (basename($_SERVER['SCRIPT_NAME']) !== 'admin.php'): ?>
<!-- Google Analytics 4 (não mede no localhost); evento clique_whatsapp em todo link de WhatsApp -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-10DSYJQFKB"></script>
<script>
window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
gtag('js',new Date());gtag('config','G-10DSYJQFKB');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*="wa.me"],a[href*="whatsapp"]');if(a)gtag('event','clique_whatsapp',{link_url:a.href,pagina:location.pathname});});
}
</script>
<!-- Pixel da Meta (não mede no localhost); evento Contact em todo link de WhatsApp -->
<script>
if(!/^(localhost|127\.0\.0\.1)$/.test(location.hostname)){
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','2321495908661362');fbq('track','PageView');
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href*="wa.me"],a[href*="whatsapp"]');if(a)fbq('track','Contact');});
}
</script>
<?php endif; ?>
</head>
<body>
<header>
<div class="container">
<nav>
<a class="logo" href="<?= e(LOJA_SITE_HOME) ?>"><img src="img/logo.png" alt="Lumiar Aventura"></a>
<div class="nav-links">
<?php if (LOJA_LOCAL): ?>
<a href="../index.html#atividades">Atividades</a>
<a href="../precos.php">Preços</a>
<?php else: ?>
<a href="<?= e(LOJA_SITE_HOME) ?>">Site Lumiar Aventura</a>
<?php endif; ?>
<a href="index.php" class="<?= $pagina === 'loja' ? 'active' : '' ?>">Loja</a>
<a href="https://wa.me/<?= LOJA_WHATSAPP ?>" target="_blank" rel="noopener">Contato</a>
</div>
<a class="btn btn-primary cart-btn" href="carrinho.php">Carrinho <span class="cart-count" data-cart-count>0</span></a>
</nav>
</div>
</header>
