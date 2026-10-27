<?php
// ============================================================
// Preços buscados da planilha do Google Sheets (publicada como CSV).
// Cache local de alguns minutos: evita bater no Google a cada acesso
// e mantém a página no ar mesmo se o Google estiver fora do ar.
// ============================================================
$csv_url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScWOfdZJsfha6GBVUz5YVLta5KEzHnFT8ADWIFf2bbz53ikTbXDDPsRmOXyH8QQpgQDC-_gz_4uuAF/pub?gid=327046408&single=true&output=csv';
$cache_file = 'C:\\Bases\\lumiar-precos-cache.csv';
$cache_ttl = 300; // 5 minutos

function buscarCsvPlanilha($url) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 6);
    $conteudo = curl_exec($ch);
    $codigo = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $erro = curl_errno($ch);
    curl_close($ch);
    return (!$erro && $codigo === 200 && $conteudo) ? $conteudo : null;
}

$csv = null;
$usando_cache_antigo = false;

if (file_exists($cache_file) && (time() - filemtime($cache_file)) < $cache_ttl) {
    $csv = file_get_contents($cache_file);
} else {
    $csv = buscarCsvPlanilha($csv_url);
    if ($csv !== null) {
        file_put_contents($cache_file, $csv);
    } elseif (file_exists($cache_file)) {
        $csv = file_get_contents($cache_file);
        $usando_cache_antigo = true;
    }
}

// ------------------------------------------------------------
// Parser: coluna A = categoria (só na 1a linha do grupo),
// coluna B = valor, coluna C = "# Nome do item".
// Ignora linhas em branco e linhas sem valor (ex: texto solto
// no fim da planilha, tipo "Faça sua pré-reserva...").
// ------------------------------------------------------------
function formatarPreco($valor) {
    $valor = trim($valor);
    $semPrefixo = trim(preg_replace('/r\$/i', '', $valor));
    if ($semPrefixo === '' || stripos($semPrefixo, 'consultar') !== false) {
        return ['texto' => 'A CONSULTAR', 'classe' => 'tbc'];
    }
    return ['texto' => 'R$ ' . $semPrefixo, 'classe' => 'price'];
}

$grupos = []; // ['Categoria' => [['nome' => ..., 'preco' => ..., 'classe' => ...], ...]]
$categoria_atual = null;

if ($csv !== null) {
    $linhas = str_getcsv($csv, "\n");
    array_shift($linhas); // remove a linha de cabeçalho ("Atividade,Valor,")
    foreach ($linhas as $linha) {
        $colunas = str_getcsv($linha);
        $categoria = trim($colunas[0] ?? '');
        $valor = trim($colunas[1] ?? '');
        $nome = trim(preg_replace('/^#\s*/', '', $colunas[2] ?? ''));

        if ($categoria !== '') {
            $categoria_atual = $categoria;
        }
        if ($valor === '' || $categoria_atual === null) {
            continue; // linha em branco ou texto solto (sem preço) - ignora
        }
        $preco = formatarPreco($valor);
        $grupos[$categoria_atual][] = [
            'nome' => $nome !== '' ? $nome : '—',
            'texto' => $preco['texto'],
            'classe' => $preco['classe'],
        ];
    }
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Preços — Lumiar Aventura</title>
<meta name="description" content="Tabela de preços das atividades de turismo de aventura da Lumiar Aventura em Lumiar, Nova Friburgo.">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lumiar Aventura">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Preços — Lumiar Aventura">
<meta property="og:description" content="Tabela de preços das atividades de turismo de aventura da Lumiar Aventura em Lumiar, Nova Friburgo.">
<meta property="og:url" content="https://www.lumiaraventura.com.br/precos.php">
<meta property="og:image" content="https://www.lumiaraventura.com.br/fotos/web/gopr3447.jpg">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="https://www.lumiaraventura.com.br/precos.php">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fjalla+One&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
:root{
--forest-950:#0d1f16; --forest-800:#163829; --forest-600:#245c40;
--river-500:#2e7d8c; --river-300:#7fc4cf;
--stone-100:#f2ece0; --stone-200:#e7ddc9; --stone-700:#463d31;
--amber-500:#e2a53d; --amber-400:#f0bd5f; --white:#fdfaf4;
--display:'Fjalla One', sans-serif;
--body:'Work Sans', sans-serif;
--mono:'IBM Plex Mono', monospace;
}
*{margin:0;padding:0;box-sizing:border-box;} html{scroll-behavior:smooth;}
body{font-family:var(--body);background:var(--stone-100);color:var(--stone-700);line-height:1.5;}
a{color:inherit;text-decoration:none;} h1,h2,h3{font-family:var(--display);font-weight:400;letter-spacing:0.01em;}
.eyebrow{font-family:var(--mono);font-size:0.72rem;letter-spacing:0.14em;text-transform:uppercase;color:var(--river-500);}
.container{max-width:1120px;margin:0 auto;padding:0 24px;}
.btn{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:0.85rem;font-weight:600;letter-spacing:0.02em;padding:14px 26px;border-radius:2px;border:1.5px solid transparent;cursor:pointer;transition:transform .18s ease, background .18s ease;}
.btn:hover{transform:translateY(-2px);}
.btn-primary{background:var(--amber-500);color:var(--forest-950);} .btn-primary:hover{background:var(--amber-400);}
header{position:fixed;top:0;left:0;right:0;z-index:50;padding:14px 0;background:rgba(13,31,22,0.95);backdrop-filter:blur(6px);box-shadow:0 2px 20px rgba(0,0,0,0.15);}
nav{display:flex;justify-content:space-between;align-items:center;}
.logo{display:flex;align-items:center;}
.logo img{height:44px;width:auto;display:block;}
.logo span{color:var(--amber-500);}
.nav-links{display:flex;gap:32px;align-items:center;}
.nav-links a{font-family:var(--mono);font-size:0.78rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--stone-200);transition:color .2s;}
.nav-links a:hover, .nav-links a.active{color:var(--amber-500);}
.nav-cta{display:none;} @media(min-width:720px){.nav-cta{display:inline-flex;}}
@media(max-width:719px){.nav-links{display:none;}}
.page-head{ background:linear-gradient(rgba(13,31,22,0.6), rgba(13,31,22,0.93)), url('fotos/web/gopr3403.jpg') center/cover no-repeat; color:var(--white);padding:160px 0 70px; }
.page-head .eyebrow{color:var(--river-300);}
.page-head h1{font-size:clamp(2.2rem,5vw,3.4rem);margin-top:10px;}
.page-head p{margin-top:14px;max-width:60ch;color:var(--stone-200);}
.notice{ background:var(--amber-500);color:var(--forest-950); padding:14px 0;font-family:var(--mono);font-size:0.82rem; }
.notice.alert{background:#c9542f;color:var(--white);}
.section{padding:70px 0;}
.group-title{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.group-title h2{font-size:1.6rem;color:var(--forest-950);}
.group-title .rule{flex:1;height:1px;background:var(--stone-200);}
table{width:100%;border-collapse:collapse;margin-bottom:56px;background:var(--white);}
th,td{text-align:left;padding:14px 16px;border-bottom:1px solid var(--stone-200);font-size:0.92rem;}
th{font-family:var(--mono);font-size:0.72rem;letter-spacing:0.06em;text-transform:uppercase;color:var(--river-500);background:var(--stone-200);}
td.price{font-family:var(--mono);font-weight:600;color:var(--forest-950);white-space:nowrap;}
td.tbc{font-family:var(--mono);font-size:0.78rem;color:var(--amber-500);font-style:normal;white-space:nowrap;}
tr:last-child td{border-bottom:none;}
.cta-band{background:var(--amber-500);padding:60px 0;text-align:center;}
.cta-band h2{color:var(--forest-950);font-size:clamp(1.6rem,3.5vw,2.2rem);}
.cta-band p{margin-top:10px;color:var(--forest-950);opacity:0.85;}
.cta-band .btn-primary{background:var(--forest-950);color:var(--white);margin-top:24px;} .cta-band .btn-primary:hover{background:var(--forest-800);}
footer{background:var(--forest-950);color:var(--stone-200);padding:40px 0 24px;text-align:center;font-family:var(--mono);font-size:0.78rem;opacity:0.6;}
</style>
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
</head>
<body>
<header>
<div class="container">
<nav>
<a class="logo" href="index.html"><img src="logo-lumiar-aventura.png" alt="Lumiar Aventura"></a>
<div class="nav-links">
<a href="index.html#atividades">Atividades</a>
<a href="precos.php" class="active">Preços</a>
<a href="loja/">Loja</a>
<a href="profissionais.html">Profissionais</a>
<a href="index.html#historia">Nossa História</a>
<a href="index.html#contato">Contato</a>
<a href="https://instagram.com/lumiaraventura" target="_blank" rel="noopener">@lumiaraventura</a>
</div>
<a class="btn btn-primary nav-cta" href="https://wa.me/5522981316768" target="_blank" rel="noopener">Reservar</a>
</nav>
</div>
</header>
<div class="page-head">
<div class="container">
<span class="eyebrow">Tabela de preços</span>
<h1>Valores por atividade, direto e sem letra miúda.</h1>
<p>Preços por pessoa, sujeitos a confirmação de data e disponibilidade. Grupos maiores e pacotes combinando atividades: fale direto com a gente pelo WhatsApp.</p>
</div>
</div>
<?php if ($csv === null): ?>
<div class="notice alert">
<div class="container">⚠️ Não foi possível carregar os preços agora. Tente de novo em alguns minutos ou fale direto pelo WhatsApp.</div>
</div>
<?php else: ?>
<div class="notice">
<div class="container">
✅ Valores atualizados automaticamente a partir da nossa planilha de preços<?= $usando_cache_antigo ? ' (mostrando a última versão salva, o Google não respondeu agora)' : '' ?>.
</div>
</div>
<?php endif; ?>
<section class="section">
<div class="container">

<?php foreach ($grupos as $nomeGrupo => $itens): ?>
<div class="group-title"><h2><?= htmlspecialchars($nomeGrupo) ?></h2><div class="rule"></div></div>
<table>
  <tr><th>Roteiro</th><th>Preço</th></tr>
  <?php foreach ($itens as $item): ?>
  <tr><td><?= htmlspecialchars($item['nome']) ?></td><td class="<?= $item['classe'] ?>"><?= htmlspecialchars($item['texto']) ?></td></tr>
  <?php endforeach; ?>
</table>

<?php endforeach; ?>

<a href="precos-admin.php" style="display:inline-block;margin-top:16px;color:var(--river-500);font-family:var(--mono);font-size:0.78rem;">✎ Editar preços</a>

</div>
</section>
<div class="cta-band">
<div class="container">
<h2>Confirme data e valores pelo WhatsApp</h2>
<p>Grupos, pacotes combinados e hospedagem parceira: a equipe fecha tudo direto com você.</p>
<a class="btn btn-primary" href="https://wa.me/5522981316768" target="_blank" rel="noopener">Chamar no WhatsApp</a>
</div>
</div>
<footer>
<div class="container">© 1990–2026 LUMIAR AVENTURA — PROJETO DE SITE EM DESENVOLVIMENTO (PÁGINA PILOTO)</div>
</footer>
</body>
</html>
