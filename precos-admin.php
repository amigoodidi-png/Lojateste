<?php
// [CLAUDE 2026-10-22] __DIR__ em vez de DOCUMENT_ROOT: o DOCUMENT_ROOT do localhost agora e a loja Chaparral.
require __DIR__ . '/../auth/check.php';
require_once 'C:\\Bases\\lumiar-db-config.php';

$pdo_like = lumiar_conectar_bd();
$msg = '';
$erro = '';

// Adicionar novo item
if (isset($_POST['novo_categoria']) && isset($_POST['novo_item'])) {
    $categoria = trim($_POST['novo_categoria']);
    $item = trim($_POST['novo_item']);
    $valor = trim($_POST['novo_valor']);
    $ordem = (int)($_POST['novo_ordem'] ?? 0);

    if ($categoria === '' || $item === '' || $valor === '') {
        $erro = 'Preencha categoria, item e valor.';
    } else {
        $stmt = mysqli_prepare($pdo_like, 'INSERT INTO precos (categoria, item, valor, ordem) VALUES (?, ?, ?, ?)');
        mysqli_stmt_bind_param($stmt, 'sssi', $categoria, $item, $valor, $ordem);
        mysqli_stmt_execute($stmt);
        $msg = 'Item adicionado.';
    }
}

// Salvar edição
if (isset($_POST['salvar_id'])) {
    $id = (int)$_POST['salvar_id'];
    $categoria = trim($_POST['categoria']);
    $item = trim($_POST['item']);
    $valor = trim($_POST['valor']);
    $ordem = (int)($_POST['ordem'] ?? 0);

    if ($categoria === '' || $item === '' || $valor === '') {
        $erro = 'Preencha categoria, item e valor.';
    } else {
        $stmt = mysqli_prepare($pdo_like, 'UPDATE precos SET categoria = ?, item = ?, valor = ?, ordem = ? WHERE id = ?');
        mysqli_stmt_bind_param($stmt, 'sssii', $categoria, $item, $valor, $ordem, $id);
        mysqli_stmt_execute($stmt);
        $msg = 'Item atualizado.';
    }
}

// Remover
if (isset($_POST['remover_id'])) {
    $stmt = mysqli_prepare($pdo_like, 'DELETE FROM precos WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $_POST['remover_id']);
    mysqli_stmt_execute($stmt);
    $msg = 'Item removido.';
}

// Item em edição (se veio ?editar=ID)
$item_editando = null;
if (isset($_GET['editar'])) {
    $stmt = mysqli_prepare($pdo_like, 'SELECT * FROM precos WHERE id = ?');
    mysqli_stmt_bind_param($stmt, 'i', $_GET['editar']);
    mysqli_stmt_execute($stmt);
    $resultado = mysqli_stmt_get_result($stmt);
    $item_editando = mysqli_fetch_assoc($resultado);
}

$todos = mysqli_query($pdo_like, 'SELECT * FROM precos ORDER BY ordem ASC, id ASC');
$grupos = [];
while ($linha = mysqli_fetch_assoc($todos)) {
    $grupos[$linha['categoria']][] = $linha;
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Editar Preços — Lumiar Aventura</title>
<style>
:root{ --bg:#0d1117; --panel:#161b22; --border:#30363d; --text:#e6edf3; --text-dim:#8b949e; --blue:#58a6ff; --green:#3fb950; --red:#f85149; }
*{box-sizing:border-box;margin:0;padding:0;}
body{ background:var(--bg); color:var(--text); font-family:-apple-system,'Segoe UI',Roboto,sans-serif; padding:48px 24px; }
.wrap{ max-width:800px; margin:0 auto; }
a.back{ color:var(--text-dim); font-size:0.85rem; text-decoration:none; margin-right:16px; }
a.back:hover{ color:var(--blue); }
h1{ font-size:1.5rem; margin:20px 0 24px; }
h2.grupo{ font-size:1.1rem; margin:32px 0 12px; color:var(--blue); }
.card{ background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:22px; margin-bottom:20px; }
label{ display:block; font-size:0.8rem; margin-bottom:5px; color:var(--text-dim); }
input{ width:100%; padding:9px 12px; margin-bottom:14px; background:#0d1117; border:1px solid var(--border); border-radius:6px; color:var(--text); font-size:0.92rem; }
input:focus{ outline:none; border-color:var(--blue); }
.linha-form{ display:grid; grid-template-columns:1.4fr 1.4fr 0.8fr 0.5fr; gap:10px; align-items:end; }
button{ padding:9px 18px; background:var(--blue); color:#0d1117; border:none; border-radius:6px; font-weight:600; cursor:pointer; font-size:0.88rem; }
button:hover{ opacity:0.9; }
.msg{ padding:10px 14px; border-radius:6px; margin-bottom:16px; font-size:0.85rem; }
.msg.ok{ background:rgba(63,185,80,0.15); border:1px solid var(--green); color:var(--green); }
.msg.err{ background:rgba(248,81,73,0.15); border:1px solid var(--red); color:var(--red); }
table{ width:100%; border-collapse:collapse; font-size:0.88rem; }
th{ text-align:left; color:var(--text-dim); font-weight:500; padding:8px; border-bottom:1px solid var(--border); font-size:0.72rem; text-transform:uppercase; }
td{ padding:9px 8px; border-bottom:1px solid var(--border); }
.acoes{ display:flex; gap:6px; }
.acoes a, .acoes button{ font-size:0.78rem; padding:5px 10px; }
.btn-editar{ background:var(--border); color:var(--text); text-decoration:none; border-radius:6px; display:inline-block; }
.btn-editar:hover{ background:#3d4450; }
.btn-remover{ background:var(--red); color:#fff; }
</style>
</head>
<body>
<div class="wrap">
  <a href="precos.php" class="back">← Voltar ao site</a>
  <a href="/auth/logout.php" class="back">Sair</a>
  <h1>Editar Preços</h1>

  <?php if ($msg): ?><div class="msg ok"><?= htmlspecialchars($msg) ?></div><?php endif; ?>
  <?php if ($erro): ?><div class="msg err"><?= htmlspecialchars($erro) ?></div><?php endif; ?>

  <div class="card">
    <h2 style="font-size:1rem;margin-bottom:14px;"><?= $item_editando ? 'Editar item' : 'Adicionar item novo' ?></h2>
    <form method="POST">
      <?php if ($item_editando): ?>
        <input type="hidden" name="salvar_id" value="<?= (int)$item_editando['id'] ?>">
      <?php endif; ?>
      <div class="linha-form">
        <div>
          <label>Categoria</label>
          <input type="text" name="<?= $item_editando ? 'categoria' : 'novo_categoria' ?>" value="<?= htmlspecialchars($item_editando['categoria'] ?? '') ?>" required>
        </div>
        <div>
          <label>Item / Roteiro</label>
          <input type="text" name="<?= $item_editando ? 'item' : 'novo_item' ?>" value="<?= htmlspecialchars($item_editando['item'] ?? '') ?>" required>
        </div>
        <div>
          <label>Valor</label>
          <input type="text" name="<?= $item_editando ? 'valor' : 'novo_valor' ?>" value="<?= htmlspecialchars($item_editando['valor'] ?? '') ?>" placeholder="180,00 ou A consultar" required>
        </div>
        <div>
          <label>Ordem</label>
          <input type="number" name="<?= $item_editando ? 'ordem' : 'novo_ordem' ?>" value="<?= htmlspecialchars($item_editando['ordem'] ?? 0) ?>">
        </div>
      </div>
      <button type="submit"><?= $item_editando ? 'Salvar alterações' : 'Adicionar' ?></button>
      <?php if ($item_editando): ?>
        <a href="precos-admin.php" class="btn-editar" style="margin-left:8px;">Cancelar</a>
      <?php endif; ?>
    </form>
  </div>

  <?php foreach ($grupos as $nomeGrupo => $itens): ?>
    <h2 class="grupo"><?= htmlspecialchars($nomeGrupo) ?></h2>
    <table>
      <tr><th>Item</th><th>Valor</th><th>Ordem</th><th></th></tr>
      <?php foreach ($itens as $linha): ?>
      <tr>
        <td><?= htmlspecialchars($linha['item']) ?></td>
        <td><?= htmlspecialchars($linha['valor']) ?></td>
        <td><?= (int)$linha['ordem'] ?></td>
        <td class="acoes">
          <a href="?editar=<?= (int)$linha['id'] ?>" class="btn-editar">Editar</a>
          <form method="POST" onsubmit="return confirm('Remover este item?');" style="display:inline;">
            <input type="hidden" name="remover_id" value="<?= (int)$linha['id'] ?>">
            <button type="submit" class="btn-remover">Remover</button>
          </form>
        </td>
      </tr>
      <?php endforeach; ?>
    </table>
  <?php endforeach; ?>

</div>
</body>
</html>
