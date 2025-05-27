window.addEventListener('DOMContentLoaded', async () => {
  const config = window.dashboardConfig;
  const currentFilters = { periodo: {} };

  // --- Calcula estatísticas básicas ---
  function calcularEstatisticas(valores) {
    if (!Array.isArray(valores) || valores.length === 0) return null;

    const isNumerico = valores.every(val => !isNaN(parseFloat(val)) && isFinite(val));
    const resultados = { frequencias: {}, moda: [], total: valores.length };
    let maxFreq = 0;

    valores.forEach(val => {
      const key = String(val);
      resultados.frequencias[key] = (resultados.frequencias[key] || 0) + 1;
      maxFreq = Math.max(maxFreq, resultados.frequencias[key]);
    });

    resultados.moda = Object.keys(resultados.frequencias).filter(
      key => resultados.frequencias[key] === maxFreq
    );
    resultados.distintos = Object.keys(resultados.frequencias).length;

    if (isNumerico) {
      const nums = valores.map(Number).sort((a, b) => a - b);
      const soma = nums.reduce((acc, val) => acc + val, 0);
      const media = soma / nums.length;
      const meio = Math.floor(nums.length / 2);
      const mediana = nums.length % 2 === 0 ? (nums[meio - 1] + nums[meio]) / 2 : nums[meio];
      const variancia = nums.reduce((acc, val) => acc + (val - media) ** 2, 0) / nums.length;
      const desvioPadrao = Math.sqrt(variancia);

      Object.assign(resultados, {
        soma,
        media,
        mediana,
        minimo: nums[0],
        maximo: nums[nums.length - 1],
        desvioPadrao
      });
    }

    return resultados;
  }

  // --- Gera tabela genérica com opção de filtro por busca ---
  function gerarTabela(containerId, headers, data, comBusca = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    let inputBusca = null;
    if (comBusca) {
      inputBusca = document.createElement('input');
      inputBusca.type = 'text';
      inputBusca.placeholder = config.labels?.tabelaBuscaPlaceholder || 'Pesquisar...';
      inputBusca.className = 'input-busca';
      inputBusca.style.marginBottom = '8px';
      container.appendChild(inputBusca);
    }

    const table = document.createElement('table');
    table.className = 'dashboard-table';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    function renderTableBody(filtro = '') {
      tbody.innerHTML = '';
      const dadosFiltrados = data.filter(row =>
        !filtro || headers.some(h => String(row[h] ?? '').toLowerCase().includes(filtro.toLowerCase()))
      );
      dadosFiltrados.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(h => {
          const td = document.createElement('td');
          td.textContent = row[h] ?? '';
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    renderTableBody();

    if (inputBusca) {
      inputBusca.addEventListener('input', e => {
        renderTableBody(e.target.value);
      });
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // --- Gera tabela de estatísticas a partir do objeto stats ---
  function gerarTabelaEstatisticas(stats) {
    if (!stats) return;
    const labels = config.labels?.estatisticas || ['Média', 'Mediana', 'Moda', 'Mínimo', 'Máximo', 'Desvio Padrão'];
    const data = [
      { Indicador: labels[0], Valor: stats.media?.toFixed(2) ?? 'N/A' },
      { Indicador: labels[1], Valor: stats.mediana?.toFixed(2) ?? 'N/A' },
      { Indicador: labels[2], Valor: stats.moda.join(', ') || 'N/A' },
      { Indicador: labels[3], Valor: stats.minimo ?? 'N/A' },
      { Indicador: labels[4], Valor: stats.maximo ?? 'N/A' },
      { Indicador: labels[5], Valor: stats.desvioPadrao?.toFixed(2) ?? 'N/A' }
    ];
    gerarTabela(config.elements.tabelaEstatisticas, ['Indicador', 'Valor'], data);
  }

  // --- Gera tabela de performance ---
  function gerarTabelaPerformance(performance) {
    gerarTabela(config.elements.tabelaPerformance, ['name', 'value', 'count'], performance, true);
  }

  // --- Aplica filtro genérico ---
  function aplicarFiltro(campo, valor) {
    if (valor === 'all' || valor === null || valor === '') {
      delete currentFilters[campo];
    } else {
      currentFilters[campo] = valor;
    }
    atualizarDashboard();
  }

  // --- Limpa todos os filtros ---
  function limparFiltros() {
    Object.keys(currentFilters).forEach(k => {
      if (k === 'periodo') {
        currentFilters[k] = {};
      } else {
        delete currentFilters[k];
      }
    });
    atualizarDashboard();
  }

  // --- Atualiza o texto do período disponível ---
  function atualizarPeriodo(dados) {
    const periodoEl = document.getElementById(config.elements.periodo);
    if (!periodoEl) return;
    const dataField = config.campos.data;
    const datas = dados
      .map(d => d[dataField])
      .filter(Boolean)
      .sort();
    const primeira = datas[0] ?? 'N/A';
    const ultima = datas[datas.length - 1] ?? 'N/A';
    periodoEl.textContent = `Período disponível: ${primeira} a ${ultima}`;
  }

  // --- Aplica filtro por período (datas de início e fim) ---
  function aplicarFiltroPeriodo() {
    const inicio = document.getElementById(config.elements.dataInicial)?.value;
    const fim = document.getElementById(config.elements.dataFinal)?.value;
    if (inicio && fim) {
      currentFilters.periodo = { inicio, fim };
    } else {
      currentFilters.periodo = {};
    }
    atualizarDashboard();
  }

  // --- Processa dados com filtros aplicados e calcula performance ---
  async function processarDadosLeve(dados) {
    return new Promise(resolve => {
      const grupo = config.campos.grupo;
      const valor = config.campos.valor;

      if (!grupo || !valor) {
        resolve({ dadosFiltrados: [], performance: [], grupos: [] });
        return;
      }

      requestIdleCallback(() => {
        let dadosFiltrados = [...dados];

        for (const [campo, val] of Object.entries(currentFilters)) {
          if (campo === 'periodo' && val.inicio && val.fim) {
            dadosFiltrados = dadosFiltrados.filter(d => {
              const dataItem = d[config.campos.data];
              return dataItem >= val.inicio && dataItem <= val.fim;
            });
          } else if (val !== undefined && val !== 'all' && val !== null && campo !== 'periodo') {
            dadosFiltrados = dadosFiltrados.filter(d => String(d[campo]) === String(val));
          }
        }

        // Cálculo performance por grupo
        const gruposSet = new Set();
        const somaPorGrupo = {};
        const contagemPorGrupo = {};

        for (const item of dadosFiltrados) {
          const chaveGrupo = item[grupo];
          const valorNum = parseFloat(item[valor] || 0);
          if (!isNaN(valorNum)) {
            gruposSet.add(chaveGrupo);
            somaPorGrupo[chaveGrupo] = (somaPorGrupo[chaveGrupo] || 0) + valorNum;
            contagemPorGrupo[chaveGrupo] = (contagemPorGrupo[chaveGrupo] || 0) + 1;
          }
        }

        const grupos = Array.from(gruposSet);
        const performance = grupos.map(g => ({
          name: g,
          value: somaPorGrupo[g] / contagemPorGrupo[g],
          count: contagemPorGrupo[g]
        }));

        resolve({ dadosFiltrados, performance, grupos });
      }, { timeout: 300 });
    });
  }

  // --- Função para atualizar TODO o dashboard ---
  async function atualizarDashboard() {
    if (!window.__dadosDashboard) return;

    const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);

    exibirEstatisticas(dadosFiltrados);
    gerarChartTimeline?.(dadosFiltrados);
    gerarChartPerformance?.(performance, grupos);
    gerarChartPriority?.(dadosFiltrados);
    gerarChartSatisfaction?.(dadosFiltrados);
    gerarTabelaPerformance(performance);
  }

  // --- Exibe estatísticas calculadas ---
  function exibirEstatisticas(dados) {
    const campoValor = config.campos.valor;
    if (!campoValor) return;

    const valores = dados
      .map(d => parseFloat(d[campoValor] || 0))
      .filter(v => !isNaN(v));

    const stats = calcularEstatisticas(valores);
    if (!stats) return;

    gerarChartEstatisticas?.(stats);
    gerarTabelaEstatisticas(stats);
  }

  // --- Inicialização ---
  try {
    const response = await fetch(config.jsonPath);
    const dados = await response.json();
    window.__dadosDashboard = dados;

    atualizarPeriodo(dados);
    atualizarDashboard();

    // Configura filtros extras dinamicamente
    (config.filtrosExtras || []).forEach(campo => {
      const el = document.getElementById(config.elements[`${campo}Filter`]);
      if (el) {
        el.addEventListener('change', () => {
          aplicarFiltro(campo, el.value);
        });
      }
    });

    // Filtros de período
    const inputDataInicial = document.getElementById(config.elements.dataInicial);
    const inputDataFinal = document.getElementById(config.elements.dataFinal);
    if (inputDataInicial) inputDataInicial.addEventListener('change', aplicarFiltroPeriodo);
    if (inputDataFinal) inputDataFinal.addEventListener('change', aplicarFiltroPeriodo);

  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
});
