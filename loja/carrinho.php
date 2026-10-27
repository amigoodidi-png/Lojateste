<?php
require __DIR__ . '/_config.php';
$titulo = 'Carrinho';
$pagina = 'carrinho';
include __DIR__ . '/_topo.php';
?>
<div class="page-head compact">
<div class="container">
<span class="eyebrow">Seu pedido</span>
<h1>Carrinho</h1>
</div>
</div>
<section class="section">
<div class="container cart-layout">
<div>
<div id="cartItems"></div>
<div id="cartEmpty" class="empty" hidden>Seu carrinho está vazio. <a href="index.php" style="color:var(--river-500)">Ver produtos →</a></div>
</div>
<form class="box" id="checkoutForm" method="post" action="finalizar.php" hidden>
<h2>Finalizar pedido</h2>
<div class="summary-line"><span>Subtotal</span><span id="cartSubtotal">R$ 0,00</span></div>
<div class="summary-line" id="linhaDesconto" hidden><span>Desconto (<span id="cupomNome"></span>)</span><span id="cartDesconto">− R$ 0,00</span></div>
<div class="cupom-box">
<label for="cupomCodigo" class="sr-only">Cupom de desconto</label>
<input id="cupomCodigo" placeholder="Cupom de desconto" maxlength="30" autocomplete="off">
<button type="button" class="btn btn-line" id="cupomAplicar">Aplicar</button>
</div>
<p class="cupom-msg" id="cupomMsg" role="status"></p>
<input type="hidden" name="cupom" id="cupomInput">
<div class="summary-line"><span>Frete</span><span id="cartFrete">informe o CEP</span></div>
<div class="summary-line total"><span>Total</span><span id="cartTotal">R$ 0,00</span></div>
<div id="freteOpcoes" class="frete-opcoes"></div>
<input type="hidden" name="itens" id="cartItensInput">
<div class="form-grid">
<div class="field full"><label for="nome">Nome completo</label><input id="nome" name="nome" required maxlength="120" autocomplete="name"></div>
<div class="field"><label for="telefone">WhatsApp</label><input id="telefone" name="telefone" required maxlength="30" inputmode="tel" autocomplete="tel" placeholder="(22) 90000-0000"></div>
<div class="field"><label for="email">E-mail</label><input id="email" name="email" type="email" maxlength="120" autocomplete="email"></div>
<div class="field"><label for="cpf">CPF (para a etiqueta de envio)</label><input id="cpf" name="cpf" required maxlength="14" inputmode="numeric" placeholder="000.000.000-00"></div>
<div class="field"><label for="cep">CEP</label><input id="cep" name="cep" required maxlength="9" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000"></div>
<div class="field full"><label for="endereco">Rua</label><input id="endereco" name="endereco" required maxlength="255" autocomplete="address-line1"></div>
<div class="field"><label for="numero">Número</label><input id="numero" name="numero" required maxlength="20"></div>
<div class="field"><label for="complemento">Complemento</label><input id="complemento" name="complemento" maxlength="80" autocomplete="address-line2"></div>
<div class="field full"><label for="bairro">Bairro</label><input id="bairro" name="bairro" required maxlength="80"></div>
<div class="field"><label for="cidade">Cidade</label><input id="cidade" name="cidade" required maxlength="80" autocomplete="address-level2"></div>
<div class="field"><label for="uf">UF</label><input id="uf" name="uf" required maxlength="2" autocomplete="address-level1"></div>
<div class="field full"><label for="observacoes">Observações</label><textarea id="observacoes" name="observacoes" rows="3" maxlength="1000"></textarea></div>
</div>
<button class="btn btn-primary" type="submit" style="width:100%;margin-top:18px;">Enviar pedido</button>
<p class="hint">Ao enviar, o pedido fica registrado e abrimos o WhatsApp para confirmar frete e forma de pagamento.</p>
</form>
</div>
</section>
<?php include __DIR__ . '/_rodape.php'; ?>
