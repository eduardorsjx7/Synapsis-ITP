(function () {
  const filtros = {}; // { grupo: { campo: Set(valores) } }
  const listeners = {}; // { grupo: [callback] }

  function registrarComponente(grupo, campo, valor, callback) {
    filtros[grupo] = filtros[grupo] || {};
    listeners[grupo] = listeners[grupo] || [];

    if (callback) {
      listeners[grupo].push(callback);
      return;
    }

    if (valor === undefined || valor === null) return;

    filtros[grupo][campo] = filtros[grupo][campo] || new Set();

    if (filtros[grupo][campo].has(valor)) {
      filtros[grupo][campo].delete(valor);
    } else {
      filtros[grupo][campo].add(valor);
    }

    // Notifica todos os componentes do grupo
    listeners[grupo].forEach(fn => fn());
  }

  function obterDadosFiltrados(grupo, dados) {
    const ativos = filtros[grupo] || {};

    return dados.filter(item => {
      return Object.entries(ativos).every(([campo, valores]) => {
        if (!valores.size) return true;

        let valorItem = item[campo];

        // Se o campo for de data, trata por mês (ex: "Janeiro", "Fevereiro", etc)
        if (campo.includes('data') && typeof valorItem === 'string') {
          const nomeMes = obterNomeDoMes(valorItem);
          return valores.has(nomeMes);
        }

        return valores.has(valorItem);
      });
    });
  }

  function limparFiltros(grupo) {
    filtros[grupo] = {};
    if (listeners[grupo]) listeners[grupo].forEach(fn => fn());
  }

  function obterNomeDoMes(dataString) {
    if (!dataString || typeof dataString !== 'string') return '';
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                   'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesIndex = parseInt(dataString.slice(5, 7), 10) - 1;
    return meses[mesIndex] || '';
  }

  // Expondo no window
  window.registrarComponente = registrarComponente;
  window.obterDadosFiltrados = obterDadosFiltrados;
  window.limparFiltros = limparFiltros;
  window.filtros = filtros;
})();
