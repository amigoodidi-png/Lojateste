// Carrinho da Loja Lumiar Aventura — guardado no navegador (localStorage).
const CHAVE = 'lumiarCarrinho';

function lerCarrinho() {
  try { return JSON.parse(localStorage.getItem(CHAVE)) || []; } catch (e) { return []; }
}
function salvarCarrinho(itens) {
  try { localStorage.setItem(CHAVE, JSON.stringify(itens)); } catch (e) {}
  atualizarContador();
}
function formatarPreco(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
function atualizarContador() {
  const n = lerCarrinho().reduce((s, i) => s + i.qtd, 0);
  document.querySelectorAll('[data-cart-count]').forEach(el => el.textContent = n);
}
function avisar(html) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.innerHTML = html;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3500);
}

// Página de produto
const form = document.getElementById('addForm');
if (form) {
  const imagens = JSON.parse(form.dataset.imagens || '{}');
  const img = document.getElementById('productImage');
  const qtdInput = form.querySelector('[name=qtd]');
  form.querySelectorAll('[data-qty]').forEach(b => b.addEventListener('click', () => {
    qtdInput.value = Math.max(1, Math.min(50, (parseInt(qtdInput.value) || 1) + parseInt(b.dataset.qty)));
  }));
  document.querySelectorAll('.thumbs button').forEach(b => b.addEventListener('click', () => {
    img.src = b.dataset.foto;
    document.querySelectorAll('.thumbs button').forEach(x => x.classList.toggle('active', x === b));
  }));
  form.querySelectorAll('[name=cor]').forEach(r => r.addEventListener('change', () => {
    if (imagens[r.value]) img.src = imagens[r.value];
  }));
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    const dados = new FormData(form);
    const cor = dados.get('cor') || '';
    const item = {
      id: parseInt(form.dataset.id), nome: form.dataset.nome, preco: parseFloat(form.dataset.preco),
      imagem: imagens[cor] || form.dataset.imagem,
      tamanho: dados.get('tamanho') || '', cor: cor,
      qtd: Math.max(1, Math.min(50, parseInt(dados.get('qtd')) || 1)),
    };
    const itens = lerCarrinho();
    const igual = itens.find(i => i.id === item.id && i.tamanho === item.tamanho && i.cor === item.cor);
    if (igual) igual.qtd = Math.min(50, igual.qtd + item.qtd); else itens.push(item);
    salvarCarrinho(itens);
    avisar('Adicionado ao carrinho. <a href="carrinho.php">Ver carrinho →</a>');
  });
}

// Página do carrinho
const lista = document.getElementById('cartItems');
if (lista) {
  const vazio = document.getElementById('cartEmpty');
  const checkout = document.getElementById('checkoutForm');
  const cep = document.getElementById('cep');
  const freteBox = document.getElementById('freteOpcoes');
  const freteTxt = document.getElementById('cartFrete');
  let subtotal = 0;
  let cotacao = 0;
  let desconto = 0;
  const cupomCampo = document.getElementById('cupomCodigo');
  const cupomMsg = document.getElementById('cupomMsg');

  function atualizarTotal() {
    const marcado = freteBox.querySelector('input:checked');
    const frete = marcado ? parseFloat(marcado.dataset.preco) : 0;
    if (marcado) freteTxt.textContent = formatarPreco(frete);
    document.getElementById('cartTotal').textContent = formatarPreco(subtotal - desconto + frete);
  }

  // Cupom: o servidor confere e calcula o desconto (e confere de novo ao finalizar).
  function aplicarCupom(silencioso) {
    const codigo = cupomCampo.value.trim().toUpperCase();
    if (!codigo) { removerCupom(); return; }
    const itens = lerCarrinho().map(i => ({ id: i.id, qtd: i.qtd }));
    fetch('cupom.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo, itens }) })
      .then(r => r.json())
      .then(d => {
        if (!d.ok) { removerCupom(); if (!silencioso || codigo) mostrarCupom(d.mensagem, true); return; }
        desconto = d.desconto;
        document.getElementById('cupomInput').value = d.codigo;
        document.getElementById('cupomNome').textContent = d.codigo;
        document.getElementById('cartDesconto').textContent = '− ' + formatarPreco(desconto);
        document.getElementById('linhaDesconto').hidden = false;
        mostrarCupom(d.mensagem, false);
        atualizarTotal();
      })
      .catch(() => mostrarCupom('Não foi possível conferir o cupom agora.', true));
  }
  function removerCupom() {
    desconto = 0;
    document.getElementById('cupomInput').value = '';
    document.getElementById('linhaDesconto').hidden = true;
    mostrarCupom('', false);
    atualizarTotal();
  }
  function mostrarCupom(texto, erro) {
    cupomMsg.textContent = texto;
    cupomMsg.classList.toggle('erro', erro);
  }
  document.getElementById('cupomAplicar').addEventListener('click', () => aplicarCupom(false));
  cupomCampo.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); aplicarCupom(false); } });

  // Frete real da VAVI pelo CEP; sem cotação, fica "a combinar no WhatsApp".
  function cotarFrete() {
    const n = cep.value.replace(/\D/g, '');
    freteBox.innerHTML = '';
    if (n.length !== 8) { freteTxt.textContent = 'informe o CEP'; atualizarTotal(); return; }
    freteTxt.textContent = 'calculando…';
    const minha = ++cotacao;
    const itens = lerCarrinho().map(i => ({ id: i.id, qtd: i.qtd }));
    fetch('frete.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cep: n, itens }) })
      .then(r => r.json())
      .then(d => {
        if (minha !== cotacao) return;
        if (!d.opcoes || !d.opcoes.length) { freteTxt.textContent = 'a combinar no WhatsApp'; atualizarTotal(); return; }
        d.opcoes.forEach((o, idx) => {
          const l = document.createElement('label');
          l.innerHTML = '<input type="radio" name="frete_id" required><span><strong></strong><br><span class="info"></span></span><span class="preco"></span>';
          const r = l.querySelector('input');
          r.value = o.id; r.dataset.preco = o.preco; r.checked = idx === 0;
          r.addEventListener('change', atualizarTotal);
          l.querySelector('strong').textContent = o.nome;
          l.querySelector('.info').textContent = o.prazo + ' dias úteis de entrega, após 3 a 5 dias de produção';
          l.querySelector('.preco').textContent = formatarPreco(o.preco);
          freteBox.appendChild(l);
        });
        atualizarTotal();
      })
      .catch(() => { if (minha === cotacao) { freteTxt.textContent = 'a combinar no WhatsApp'; atualizarTotal(); } });
  }

  function desenhar() {
    const itens = lerCarrinho();
    vazio.hidden = itens.length > 0;
    checkout.hidden = itens.length === 0;
    lista.innerHTML = '';
    let total = 0;
    itens.forEach((i, idx) => {
      total += i.preco * i.qtd;
      const el = document.createElement('div');
      el.className = 'cart-item';
      const opcoes = [i.tamanho && 'Tam. ' + i.tamanho, i.cor].filter(Boolean).join(' · ');
      el.innerHTML = `
        <img alt="">
        <div><h3></h3><div class="meta"></div></div>
        <div class="right">
          <div class="qty"><button type="button" data-d="-1" aria-label="Diminuir">−</button><input type="number" min="1" max="50" aria-label="Quantidade"><button type="button" data-d="1" aria-label="Aumentar">+</button></div>
          <strong class="sub"></strong>
          <button type="button" class="remove">Remover</button>
        </div>`;
      el.querySelector('img').src = i.imagem;
      el.querySelector('h3').textContent = i.nome;
      el.querySelector('.meta').textContent = opcoes + (opcoes ? ' · ' : '') + formatarPreco(i.preco) + ' cada';
      el.querySelector('.sub').textContent = formatarPreco(i.preco * i.qtd);
      const input = el.querySelector('input');
      input.value = i.qtd;
      const mudar = q => { itens[idx].qtd = Math.max(1, Math.min(50, q || 1)); salvarCarrinho(itens); desenhar(); cotarFrete(); if (document.getElementById("cupomInput").value) aplicarCupom(true); };
      el.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => mudar(i.qtd + parseInt(b.dataset.d))));
      input.addEventListener('change', () => mudar(parseInt(input.value)));
      el.querySelector('.remove').addEventListener('click', () => { itens.splice(idx, 1); salvarCarrinho(itens); desenhar(); cotarFrete(); if (document.getElementById("cupomInput").value) aplicarCupom(true); });
      lista.appendChild(el);
    });
    document.getElementById('cartSubtotal').textContent = formatarPreco(total);
    subtotal = total;
    atualizarTotal();
    document.getElementById('cartItensInput').value = JSON.stringify(itens.map(i => ({ id: i.id, tamanho: i.tamanho, cor: i.cor, qtd: i.qtd })));
  }
  desenhar();

  // Preenche cidade/UF/endereço pelo CEP (ViaCEP).
  cep.addEventListener('blur', () => {
    cotarFrete();
    const n = cep.value.replace(/\D/g, '');
    if (n.length !== 8) return;
    fetch('https://viacep.com.br/ws/' + n + '/json/').then(r => r.json()).then(d => {
      if (d.erro) return;
      const f = (id, v) => { const el = document.getElementById(id); if (!el.value && v) el.value = v; };
      f('cidade', d.localidade); f('uf', d.uf);
      f('endereco', d.logradouro); f('bairro', d.bairro);
    }).catch(() => {});
  });
}

atualizarContador();

// Vitrine: bolinhas dos cards com frente e costas (no celular, o toque troca a foto sem abrir o produto).
document.querySelectorAll('.card-fotos').forEach(box => {
  box.querySelectorAll('.dot').forEach((dot, idx) => {
    const trocar = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      box.classList.toggle('outro-lado', idx === 1);
      box.classList.add('fixo');
    };
    dot.addEventListener('click', trocar);
    dot.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') trocar(ev); });
  });
  box.closest('.product-card').addEventListener('mouseleave', () => box.classList.remove('fixo', 'outro-lado'));
});
