/* OakAppWare — comportamento compartilhado. Tudo aqui é melhoria progressiva:
   sem este arquivo, a página continua legível e navegável. */
(function () {
  'use strict';

  var reduz = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function modo() { return reduz.matches ? 'auto' : 'smooth'; }
  function todos(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  /* Cabeçalho: borda ao rolar; menu compacto no celular */
  var topo = document.querySelector('.topo');
  if (topo) {
    var marcaTopo = function () { topo.classList.toggle('is-rolado', window.scrollY > 8); };
    marcaTopo();
    window.addEventListener('scroll', marcaTopo, { passive: true });

    var nav = topo.querySelector('.nav');
    var botao = topo.querySelector('.nav-menu');
    if (nav && botao) {
      var fecha = function (devolveFoco) {
        nav.classList.remove('is-aberta');
        botao.setAttribute('aria-expanded', 'false');
        if (devolveFoco) botao.focus();
      };
      botao.addEventListener('click', function () {
        var abre = !nav.classList.contains('is-aberta');
        nav.classList.toggle('is-aberta', abre);
        botao.setAttribute('aria-expanded', abre ? 'true' : 'false');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('is-aberta')) fecha(true);
      });
      document.addEventListener('click', function (e) {
        if (nav.classList.contains('is-aberta') && !nav.contains(e.target)) fecha(false);
      });
      nav.addEventListener('focusout', function (e) {
        if (nav.classList.contains('is-aberta') && e.relatedTarget && !nav.contains(e.relatedTarget)) fecha(false);
      });
      todos('.nav-links a', nav).forEach(function (a) { a.addEventListener('click', function () { fecha(false); }); });
    }
  }

  /* Vitrine: o seletor controla o trilho (scroll-snap nativo); /#janela-<app> abre no app certo */
  todos('[data-vitrine]').forEach(function (caixa) {
    var trilho = caixa.querySelector('[data-trilho]');
    if (!trilho) return;
    var janelas = todos('.janela', trilho);
    var n = janelas.length;
    var itens = todos('[data-ir]', caixa);
    var antes = caixa.querySelector('[data-anterior]');
    var depois = caixa.querySelector('[data-proxima]');
    var aviso = caixa.querySelector('[data-aviso]');
    var atual = -1, falar = false, agendado = false, travaAte = 0;

    function recuo() { return parseFloat(getComputedStyle(trilho).paddingLeft) || 0; }
    function maximo() { return trilho.scrollWidth - trilho.clientWidth; }
    function alvo(i) { return Math.min(Math.max(0, janelas[i].offsetLeft - recuo()), maximo()); }
    function indicePorId(id) {
      for (var k = 0; k < n; k++) if (janelas[k].id === id) return k;
      return -1;
    }

    function indiceVisivel() {
      if (trilho.scrollLeft >= maximo() - 4) return n - 1;
      var x = trilho.scrollLeft, melhor = 0, dist = Infinity;
      janelas.forEach(function (j, k) {
        var d = Math.abs(alvo(k) - x);
        if (d < dist) { dist = d; melhor = k; }
      });
      return melhor;
    }

    function marca(i) {
      if (i === atual) return;
      atual = i;
      janelas.forEach(function (j, k) {
        j.classList.toggle('is-ativa', k === i);
        if (k === i) j.removeAttribute('data-lado'); else j.setAttribute('data-lado', k < i ? 'antes' : 'depois');
      });
      itens.forEach(function (a, k) {
        a.classList.toggle('is-ativa', k === i);
        if (k === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
      if (antes) antes.setAttribute('aria-disabled', i === 0 ? 'true' : 'false');
      if (depois) depois.setAttribute('aria-disabled', i === n - 1 ? 'true' : 'false');
      if (aviso && falar) aviso.textContent = (i + 1) + ' de ' + n + ': ' + (janelas[i].getAttribute('data-nome') || '');
    }

    function pula(x) {
      trilho.style.scrollBehavior = 'auto';
      trilho.scrollLeft = x;
      trilho.style.scrollBehavior = '';
    }

    function vai(i, comportamento) {
      i = Math.max(0, Math.min(n - 1, i));
      falar = true;
      travaAte = Date.now() + 700;
      if (comportamento === 'auto') pula(alvo(i));
      else trilho.scrollTo({ left: alvo(i), behavior: modo() });
      marca(i);
    }

    function aoRolar() {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () {
        agendado = false;
        if (Date.now() < travaAte) return;
        marca(indiceVisivel());
      });
    }

    function poeEndereco(i) {
      if (window.history && history.replaceState) history.replaceState(null, '', '#' + janelas[i].id);
    }

    itens.forEach(function (a, k) {
      a.addEventListener('click', function (e) { e.preventDefault(); vai(k); poeEndereco(k); });
      a.addEventListener('keydown', function (e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        var j = e.key === 'ArrowRight' ? k + 1 : e.key === 'ArrowLeft' ? k - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : null;
        if (j === null) return;
        e.preventDefault();
        j = Math.max(0, Math.min(n - 1, j));
        itens[j].focus();
        vai(j);
        poeEndereco(j);
      });
    });
    if (antes) antes.addEventListener('click', function () { if (atual > 0) vai(atual - 1); });
    if (depois) depois.addEventListener('click', function () { if (atual < n - 1) vai(atual + 1); });

    janelas.forEach(function (j, k) {
      var veu = j.querySelector('.janela-veu');
      if (veu) veu.addEventListener('click', function () { vai(k); });
      j.addEventListener('focusin', function () { if (k !== atual) vai(k); });
    });

    trilho.addEventListener('scroll', aoRolar, { passive: true });
    trilho.addEventListener('scrollend', function () { travaAte = 0; marca(indiceVisivel()); });
    window.addEventListener('resize', function () { if (atual >= 0) pula(alvo(atual)); });

    function doEndereco(rolarPagina) {
      var i = indicePorId(decodeURIComponent((location.hash || '').slice(1)));
      if (i < 0) return false;
      vai(i, 'auto');
      falar = false;
      if (rolarPagina) caixa.scrollIntoView({ block: 'start', behavior: 'auto' });
      return true;
    }

    var inicial = indicePorId(decodeURIComponent((location.hash || '').slice(1)));
    if (inicial >= 0) {
      vai(inicial, 'auto');
      falar = false;
      window.addEventListener('load', function () { doEndereco(true); });
    } else {
      atual = -1;
      marca(0);
      pula(0);
    }
    window.addEventListener('hashchange', function () { doEndereco(true); });
  });

  /* Página de app: barra fixa da loja (celular) aparece quando o botão principal sai da tela */
  var barra = document.querySelector('[data-barra-loja]');
  var principal = document.querySelector('[data-loja-principal]');
  if (barra && principal && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var fora = !e[0].isIntersecting && e[0].boundingClientRect.top < 0;
      barra.classList.toggle('is-visivel', fora);
    }).observe(principal);
  }

  /* Revelações suaves: só para o que ainda está abaixo da tela no primeiro gesto de rolagem */
  if ('IntersectionObserver' in window && !reduz.matches) {
    var alvos = todos('.revelar');
    var armado = false;
    var armar = function () {
      if (armado || reduz.matches) return;
      armado = true;
      var io = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('is-visivel'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      alvos.forEach(function (el) {
        if (el.getBoundingClientRect().top > window.innerHeight * 0.94) {
          el.classList.add('a-revelar');
          io.observe(el);
        }
      });
    };
    if (alvos.length) window.addEventListener('scroll', armar, { passive: true, once: true });
  }
})();
