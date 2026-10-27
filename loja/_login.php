<?php
// Login do painel da loja.
// No computador do Diego usa o login do site (htdocs/auth). Na hospedagem,
// onde esse sistema não existe, usa usuário e senha próprios definidos em
// LOJA_PRIVADO/loja-admin-config.php:
//   define('LOJA_ADMIN_USUARIO', 'diego');
//   define('LOJA_ADMIN_SENHA_HASH', '...'); // password_hash('senha', PASSWORD_DEFAULT)
$authSite = __DIR__ . '/../../auth/check.php';
if (LOJA_LOCAL && file_exists($authSite)) {
    require $authSite;
    return;
}

require_once LOJA_PRIVADO . '/loja-admin-config.php';
session_start(['cookie_httponly' => true, 'cookie_samesite' => 'Lax', 'cookie_secure' => !empty($_SERVER['HTTPS'])]);

if (isset($_GET['sair'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: admin.php');
    exit;
}
if (!empty($_SESSION['loja_admin'])) return;

$erroLogin = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login_usuario'])) {
    sleep(1); // atrasa tentativas de adivinhar a senha
    if (hash_equals(LOJA_ADMIN_USUARIO, (string)$_POST['login_usuario'])
        && password_verify((string)($_POST['login_senha'] ?? ''), LOJA_ADMIN_SENHA_HASH)) {
        session_regenerate_id(true);
        $_SESSION['loja_admin'] = 1;
        header('Location: admin.php');
        exit;
    }
    $erroLogin = 'Usuário ou senha incorretos.';
}

$titulo = 'Entrar no painel';
$pagina = 'admin';
include __DIR__ . '/_topo.php';
?>
<div class="page-head compact"><div class="container"><span class="eyebrow">Área restrita</span><h1>Painel da loja</h1></div></div>
<section class="section">
<div class="container" style="max-width:420px;">
<form class="box" method="post">
<h2>Entrar</h2>
<?php if ($erroLogin): ?><p class="cupom-msg erro"><?= e($erroLogin) ?></p><?php endif; ?>
<div class="form-grid">
<div class="field full"><label for="login_usuario">Usuário</label><input id="login_usuario" name="login_usuario" required autocomplete="username"></div>
<div class="field full"><label for="login_senha">Senha</label><input id="login_senha" name="login_senha" type="password" required autocomplete="current-password"></div>
</div>
<button class="btn btn-primary" type="submit" style="width:100%;margin-top:18px;">Entrar</button>
</form>
</div>
</section>
<footer><div class="container">PAINEL DA LOJA</div></footer>
</body>
</html>
<?php
exit;
