window.addEventListener('DOMContentLoaded', async () => {
  const config = window.dashboardConfig;
  const currentFilters = {};
  const ultimosFiltrosClicados = {};
  const chartInstances = {}; // NOVO: Objeto para armazenar as instâncias dos gráficos

  // ===================================================================
  // FUNÇÕES DE CÁLCULO E UTILIDADES
  // ===================================================================

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
    resultados.moda = Object.keys(resultados.frequencias).filter(key => resultados.frequencias[key] === maxFreq);
    resultados.distintos = Object.keys(resultados.frequencias).length;
    if (isNumerico) {
      const nums = valores.map(Number).sort((a, b) => a - b);
      const soma = nums.reduce((acc, val) => acc + val, 0);
      const media = soma / nums.length;
      const meio = Math.floor(nums.length / 2);
      const mediana = nums.length % 2 === 0 ? (nums[meio - 1] + nums[meio]) / 2 : nums[meio];
      const variancia = nums.reduce((acc, val) => acc + (val - media) ** 2, 0) / nums.length;
      const desvioPadrao = Math.sqrt(variancia);
      Object.assign(resultados, { soma, media, mediana, minimo: nums[0], maximo: nums[nums.length - 1], desvioPadrao });
    }
    return resultados;
  }
  
  function adicionarBotaoExportacao(containerId, tabelaId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const botaoExistente = container.querySelector('button.export-button');
    if(botaoExistente) botaoExistente.remove();

    const botao = document.createElement('button');
    botao.textContent = 'Exportar para XLSX'; // Texto do botão atualizado
    botao.className = 'export-button';
    
    // Chama a nova função de exportação para XLSX
    botao.onclick = () => exportarParaXLSX(tabelaId, `${tabelaId}.xlsx`);
    
    container.appendChild(botao);
  }

  function exportarParaXLSX(tabelaId, nomeArquivo) {
    // A função agora usa a biblioteca XLSX (SheetJS)
    const tabela = document.getElementById(tabelaId)?.querySelector('table');
    if (!tabela) {
      console.error('Tabela não encontrada para exportação:', tabelaId);
      return;
    }

    // 1. Converte o elemento da tabela HTML em um "workbook" do Excel
    const workbook = XLSX.utils.table_to_book(tabela);

    // 2. Gera o arquivo .xlsx e inicia o download
    XLSX.writeFile(workbook, nomeArquivo || 'dados.xlsx');
  }

  // ===================================================================
  // FUNÇÕES DE RENDERIZAÇÃO (GRÁFICOS E TABELAS)
  // ===================================================================

  function gerarTabela(containerId, headers, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // NOVO: Cria um 'wrapper' para a tabela. Este wrapper terá a barra de rolagem.
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive-wrapper';

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
    data.forEach(row => {
      const tr = document.createElement('tr');
      headers.forEach(h => {
        const td = document.createElement('td');
        td.textContent = row[h] !== undefined ? row[h] : '';
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);

    // NOVO: Adiciona a tabela ao wrapper, e o wrapper ao container principal.
    tableWrapper.appendChild(table);
    container.innerHTML = '';
    container.appendChild(tableWrapper);
  }

  function gerarTabelaEstatisticas(stats) {
    const data = [
      { Indicador: 'Média', Valor: stats.media?.toFixed(2) },
      { Indicador: 'Mediana', Valor: stats.mediana?.toFixed(2) },
      { Indicador: 'Moda', Valor: stats.moda.join(', ') },
      { Indicador: 'Mínimo', Valor: stats.minimo },
      { Indicador: 'Máximo', Valor: stats.maximo },
      { Indicador: 'Desvio Padrão', Valor: stats.desvioPadrao?.toFixed(2) }
    ];
    gerarTabela('tabelaEstatisticas', ['Indicador', 'Valor'], data);
  }

  function gerarTabelaTodosOsDados(headers, data) {
    const container = document.getElementById('tabelaTodosOsDados');
    if (container) {
        gerarTabela('tabelaTodosOsDados', headers, data);
        if (data.length > 0) {
            adicionarBotaoExportacao('tabelaTodosOsDados', 'tabelaTodosOsDados');
        }
    }
  }

  function gerarChartEstatisticas(estatisticas) {
    const container = document.getElementById(config.elements.estatistica);
    if (!container) return;
    let chart = chartInstances.estatistica;
    if (!chart) {
        chart = echarts.init(container);
        chartInstances.estatistica = chart;
        window.addEventListener('resize', () => chart.resize());
    }
    const categorias = ['Média', 'Mediana', 'Moda', 'Mínimo', 'Máximo', 'Desvio Padrão'];
    const valores = [
      estatisticas.media, estatisticas.mediana, parseFloat(estatisticas.moda[0] || 0),
      estatisticas.minimo, estatisticas.maximo, estatisticas.desvioPadrao
    ];
    chart.setOption({
      tooltip: { trigger: 'axis', formatter: params => `<strong>${params[0].name}</strong>: ${params[0].value ? params[0].value.toFixed(2) : '0.00'} hrs` },
      xAxis: { type: 'category', data: categorias },
      yAxis: { type: 'value', name: 'Valor' },
      series: [{ type: 'bar', data: valores, itemStyle: { color: '#4dc9f6' }, label: { show: true, position: 'top', formatter: p => p.value ? p.value.toFixed(2) : '0.00' } }],
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicInOut'
    });
  }

  function gerarChartTimeline(dados) {
    const container = document.getElementById(config.elements.timeline);
    if (!container) return;
    let chart = chartInstances.timeline;
    if (!chart) {
        chart = echarts.init(container);
        chartInstances.timeline = chart;
        adicionarInteratividadeGrafico(chart, container);
        window.addEventListener('resize', () => chart.resize());
    }
    const xData = dados.map(i => i.codigo_atendimento);
    const inicioData = dados.map(i => i.tempo_inicio_hrs);
    const resolucaoData = dados.map(i => i.tempo_resolucao_hrs - i.tempo_inicio_hrs);
    chart.setOption({
      title: { text: config.timeline.title, left: 'center' },
      tooltip: { trigger: 'axis', formatter: params => dados.length > 0 ? config.timeline.tooltipFormatter(dados[params[0].dataIndex]) : '' },
      xAxis: { type: 'category', data: xData, axisLabel: { rotate: config.timeline.axisLabelRotate } },
      yAxis: { type: 'value', name: config.timeline.yAxisName },
      legend: { data: Object.values(config.timeline.seriesNames), left: config.timeline.legendPosition },
      series: [
        { name: config.timeline.seriesNames.inicio, type: 'bar', stack: 'total', emphasis: { disabled: true }, itemStyle: { color: config.timeline.colors.inicio }, data: inicioData },
        { name: config.timeline.seriesNames.resolucao, type: 'bar', stack: 'total', emphasis: { disabled: true }, itemStyle: { color: config.timeline.colors.resolucao }, data: resolucaoData }
      ],
      animationDurationUpdate: 500,
      animationEasingUpdate: 'cubicInOut'
    });
  }

  function gerarChartPerformance(data, labels) {
    const container = document.getElementById(config.elements.performance);
    if (!container) return;
    let chart = chartInstances.performance;
    if (!chart) {
        chart = echarts.init(container);
        chartInstances.performance = chart;
        adicionarInteratividadeGrafico(chart, container);
        window.addEventListener('resize', () => chart.resize());
    }
    const seriesData = data.map((item, idx) => ({
        value: item.value,
        itemStyle: {
            color: config.performance.colorScale(item.value),
            opacity: !ultimosFiltrosClicados.atendente || ultimosFiltrosClicados.atendente === labels[idx] ? 1 : 0.3,
            borderColor: ultimosFiltrosClicados.atendente === labels[idx] ? '#000' : undefined,
            borderWidth: ultimosFiltrosClicados.atendente === labels[idx] ? 2 : 0
        }
    }));
    chart.setOption({
      title: { text: config.chartTitles.performance, left: 'center' },
      tooltip: { formatter: p => data.length > 0 ? config.performance.tooltipFormatter(data[p.dataIndex]) : '' },
      xAxis: { type: 'category', data: labels, axisLabel: { rotate: config.performance.axisLabelRotate } },
      yAxis: { type: 'value', name: config.performance.yAxisName },
      series: [{ type: 'bar', emphasis: { disabled: true }, label: config.performance.labelConfig, showBackground: true, data: seriesData }],
      animationDurationUpdate: 500,
      animationEasingUpdate: 'cubicInOut'
    });
  }

  function gerarChartPriority(dados) {
    const container = document.getElementById(config.elements.priority);
    if (!container) return;
    let chart = chartInstances.priority;
    if (!chart) {
        chart = echarts.init(container);
        chartInstances.priority = chart;
        adicionarInteratividadeGrafico(chart, container);
        window.addEventListener('resize', () => chart.resize());
    }
    const valorSelecionado = ultimosFiltrosClicados.prioridade;
    const chartData = config.priority.labels.map(p => ({
        value: dados.filter(d => d.prioridade === p).length, name: p,
        itemStyle: { color: config.priority.colors[p], opacity: !valorSelecionado || p === valorSelecionado ? 1 : 0.3, borderColor: p === valorSelecionado ? '#000' : undefined, borderWidth: p === valorSelecionado ? 2 : 0 }
    }));

    // CORREÇÃO: Verifica de forma segura se o estado da legenda já existe antes de tentar usá-lo.
    const legendaPrevia = chart.getOption()?.legend?.[0]?.selected;

    chart.setOption({
      title: { text: config.chartTitles.priority, left: 'center' },
      tooltip: { trigger: 'item' },
      legend: { show: true, bottom: 0, selected: legendaPrevia || null },
      series: [{ type: 'pie', radius: config.priority.radius, selectedMode: 'single', emphasis: { disabled: true }, label: config.priority.labelFormat, data: chartData }],
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicInOut'
    });
  }

  function gerarChartSatisfaction(dados) {
    const container = document.getElementById(config.elements.satisfaction);
    if (!container) return;
    let chart = chartInstances.satisfaction;
    if (!chart) {
        chart = echarts.init(container);
        chartInstances.satisfaction = chart;
        adicionarInteratividadeGrafico(chart, container);
        window.addEventListener('resize', () => chart.resize());
    }
    const valorSelecionado = ultimosFiltrosClicados.nota;
    const chartData = config.satisfaction.notas.map(n => ({
      value: dados.filter(d => d.nota === n).length, name: n,
      itemStyle: { color: config.satisfaction.colors[n], opacity: !valorSelecionado || n === valorSelecionado ? 1 : 0.3, borderColor: n === valorSelecionado ? '#000' : undefined, borderWidth: n === valorSelecionado ? 2 : 0 }
    }));

    // CORREÇÃO: Verifica de forma segura se o estado da legenda já existe antes de tentar usá-lo.
    const legendaPrevia = chart.getOption()?.legend?.[0]?.selected;

    chart.setOption({
      title: { text: config.chartTitles.satisfaction, left: 'center' },
      tooltip: { trigger: 'item' },
      legend: { show: true, bottom: 0, selected: legendaPrevia || null },
      series: [{ type: 'pie', roseType: 'radius', radius: config.satisfaction.radius, selectedMode: 'single', emphasis: { disabled: true }, label: config.satisfaction.labelFormat, labelLine: config.satisfaction.labelLine, data: chartData }],
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicInOut'
    });
  }
  // ===================================================================
  // FUNÇÕES DE CONTROLE E PROCESSAMENTO DE DADOS
  // ===================================================================

  function exibirEstatisticas(dados) {
    const campoValor = config.campos?.valor;
    if (!campoValor) return;
    const valores = dados.map(d => parseFloat(d[campoValor] || 0)).filter(v => !isNaN(v));
    if (valores.length === 0) {
      const statsVazias = { media: 0, mediana: 0, moda: ['-'], minimo: 0, maximo: 0, desvioPadrao: 0 };
      gerarChartEstatisticas(statsVazias);
      gerarTabelaEstatisticas(statsVazias);
      const el = document.getElementById('estatisticas');
      if (el) el.innerHTML = '<strong>Estatísticas:</strong><br>Selecione um período para ver os dados.';
      return;
    }
    const stats = calcularEstatisticas(valores);
    if (!stats) return;
    gerarChartEstatisticas(stats);
    gerarTabelaEstatisticas(stats);
    const el = document.getElementById('estatisticas');
    if (el) {
      el.innerHTML = `<strong>Estatísticas:</strong><br>Média: ${stats.media?.toFixed(2)}<br>Mediana: ${stats.mediana?.toFixed(2)}<br>Moda: ${stats.moda.join(', ')}<br>Mínimo: ${stats.minimo}<br>Máximo: ${stats.maximo}<br>Desvio Padrão: ${stats.desvioPadrao?.toFixed(2)}<br>`;
    }
  }

  async function aplicarFiltro(campo, valor, secoes) {
    currentFilters[campo] = valor;
    await atualizarAposFiltro(secoes);
  }
  window.aplicarFiltro = aplicarFiltro;
  
  async function limparFiltros(campoAlvo = null) {
    const secoesAfetadas = campoAlvo ? document.querySelector(`[data-campo="${campoAlvo}"]`)?.dataset.aplicaEm?.split(',').map(s => s.trim()) : null;

    if (campoAlvo) {
      delete currentFilters[campoAlvo];
      delete ultimosFiltrosClicados[campoAlvo];
    } else {
      Object.keys(currentFilters).forEach(key => {
        if (key !== 'periodo') delete currentFilters[key];
      });
      Object.keys(ultimosFiltrosClicados).forEach(key => delete ultimosFiltrosClicados[key]);
    }
    
    await atualizarAposFiltro(secoesAfetadas);
  }
  
  async function atualizarAposFiltro(secoes) {
    const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);

    if (secoes && Array.isArray(secoes)) {
      secoes.forEach(secao => atualizarSecao(secao, dadosFiltrados, performance, grupos));
    } else {
      await atualizarDashboard(dadosFiltrados, performance, grupos);
    }
  }

  function atualizarSecao(secao, dadosFiltrados, performance, grupos) {
    const headers = Object.keys(window.__dadosDashboard[0] || {});
    switch (secao) {
      case 'estatisticas': exibirEstatisticas(dadosFiltrados); break;
      case 'timeline': gerarChartTimeline(dadosFiltrados); break;
      case 'performance':
        gerarChartPerformance(performance, grupos);
        break;
      case 'priority': gerarChartPriority(dadosFiltrados); break;
      case 'satisfaction': gerarChartSatisfaction(dadosFiltrados); break;
      case 'tabela': gerarTabelaTodosOsDados(headers, dadosFiltrados); break;
      case 'filtros':
        // A geração de filtros é centralizada no atualizarDashboard
        break;
      default:
        console.warn(`Tentativa de atualizar seção desconhecida: ${secao}`);
    }
  }
  
  function processarDadosLeve(dados) {
    return new Promise(resolve => {
      const { grupo, valor, dataPrincipal } = config.campos || {};
      if (!grupo || !valor || !dataPrincipal) {
        console.error("Configuração de campos (grupo, valor, dataPrincipal) está incompleta.");
        resolve({ dadosFiltrados: [], performance: [], grupos: [] });
        return;
      }
      requestIdleCallback(() => {
        let dadosFiltrados = [...dados];
        if (currentFilters.periodo && currentFilters.periodo.inicio && currentFilters.periodo.fim) {
          const dataInicioFiltro = new Date(currentFilters.periodo.inicio);
          const dataFimFiltro = new Date(currentFilters.periodo.fim);
          dataFimFiltro.setHours(23, 59, 59, 999);
          dadosFiltrados = dadosFiltrados.filter(d => {
            if (!d[dataPrincipal]) return false;
            const dataItem = new Date(d[dataPrincipal]);
            return dataItem >= dataInicioFiltro && dataItem <= dataFimFiltro;
          });
        } else {
          resolve({ dadosFiltrados: [], performance: [], grupos: [] });
          return;
        }

        for (const [campo, val] of Object.entries(currentFilters)) {
          if (val !== 'all' && val !== null && campo !== 'periodo') {
            dadosFiltrados = dadosFiltrados.filter(d => d[campo] === val);
          }
        }
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
        const grupos = Array.from(gruposSet).sort();
        const performance = grupos.map(g => ({
          name: g, value: somaPorGrupo[g] ? (somaPorGrupo[g] / contagemPorGrupo[g]) : 0, count: contagemPorGrupo[g]
        }));
        resolve({ dadosFiltrados, performance, grupos });
      });
    });
  }

  function gerarFiltrosAutomaticos(dados) {
    const filtroContainer = document.getElementById('filtrosDinamicos');
    if (!filtroContainer) return;
    const selects = filtroContainer.querySelectorAll('select[data-campo]');
    selects.forEach(select => {
      const campo = select.dataset.campo;
      const valorAtual = select.value;
      select.innerHTML = '';
      const optionTodos = document.createElement('option');
      optionTodos.value = 'all';
      optionTodos.textContent = `Todos (${campo})`;
      select.appendChild(optionTodos);
      const valoresUnicos = [...new Set(dados.map(d => d[campo]).filter(Boolean))].sort();
      valoresUnicos.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        select.appendChild(option);
      });
      if (valoresUnicos.includes(valorAtual)){
        select.value = valorAtual;
      } else {
        select.value = 'all';
      }
    });
  }

  async function atualizarDashboard(dadosFiltrados, performance, grupos) {
    exibirEstatisticas(dadosFiltrados);
    gerarChartTimeline(dadosFiltrados);
    gerarChartPerformance(performance, grupos);
    gerarChartPriority(dadosFiltrados);
    gerarChartSatisfaction(dadosFiltrados);
    const dadosExemplo = window.__dadosDashboard[0] || {};
    const headers = Object.keys(dadosExemplo);
    gerarTabelaTodosOsDados(headers, dadosFiltrados);
    
    let dadosParaFiltros;
    if (currentFilters.periodo) {
      const { dataPrincipal } = config.campos;
      const dataInicioFiltro = new Date(currentFilters.periodo.inicio);
      const dataFimFiltro = new Date(currentFilters.periodo.fim);
      dataFimFiltro.setHours(23, 59, 59, 999);
      dadosParaFiltros = window.__dadosDashboard.filter(d => {
        if (!d[dataPrincipal]) return false;
        const dataItem = new Date(d[dataPrincipal]);
        return dataItem >= dataInicioFiltro && dataItem <= dataFimFiltro;
      });
    } else {
      dadosParaFiltros = [];
    }
    gerarFiltrosAutomaticos(dadosParaFiltros);
  }
  
  function adicionarInteratividadeGrafico(chart, container) {
    const campo = container.dataset.campo;
    const secoesAfetadas = container.dataset.aplicaEm?.split(',').map(s => s.trim());
    if (!campo) return;
    
    const getValueFromParams = (p) => {
        if (p.componentType === 'series' && p.seriesType === 'bar') {
            return p.name || chart.getOption().xAxis[0].data[p.dataIndex];
        }
        if (p.componentType === 'series' && p.seriesType === 'pie') {
            return p.name;
        }
        return null;
    };

    chart.on('click', p => {
      if (!currentFilters.periodo) {
        alert("Por favor, defina um período antes de interagir com os gráficos.");
        return;
      }
      const valor = getValueFromParams(p);
      if (valor === undefined || valor === null) return;
      
      const isPie = chart.getOption().series[0].type === 'pie';
      
      if (ultimosFiltrosClicados[campo] === valor) {
        if (isPie) chart.dispatchAction({ type: 'legendAllSelect' });
        limparFiltros(campo);
      } else {
        ultimosFiltrosClicados[campo] = valor;
        if (isPie) {
            chart.dispatchAction({ type: 'legendUnSelect', name: ''}); // Workaround
            chart.dispatchAction({ type: 'legendSelect', name: valor });
        }
        aplicarFiltro(campo, valor, secoesAfetadas);
      }
    });

    chart.getZr().on('dblclick', () => {
      if (ultimosFiltrosClicados[campo]) {
        if (chart.getOption().series[0].type === 'pie') {
            chart.dispatchAction({ type: 'legendAllSelect' });
        }
        limparFiltros(campo);
      }
    });
  }

  // ===================================================================
  // FUNÇÕES DE INICIALIZAÇÃO
  // ===================================================================

  function inicializarDashboardVazio() {
    Object.keys(currentFilters).forEach(key => delete currentFilters[key]);
    Object.keys(ultimosFiltrosClicados).forEach(key => delete ultimosFiltrosClicados[key]);
    
    const dadosExemplo = window.__dadosDashboard[0] || {};
    const headers = Object.keys(dadosExemplo);
    
    exibirEstatisticas([]);
    gerarChartTimeline([]);
    gerarChartPerformance([], []);
    gerarChartPriority([]);
    gerarChartSatisfaction([]);
    gerarTabelaTodosOsDados(headers, []);
    gerarFiltrosAutomaticos([]);

    const periodoEl = document.getElementById(config.elements.periodo);
    if (periodoEl) {
      periodoEl.textContent = 'Período: Por favor, selecione um intervalo de datas para começar.';
    }
  }

  function configurarLimitesDoFiltroDePeriodo(dados) {
    const dataInicioEl = document.getElementById('filtro-data-inicio');
    const dataFimEl = document.getElementById('filtro-data-fim');
    const dataPrincipal = config.campos?.dataPrincipal;
    if (!dataInicioEl || !dataFimEl || !dataPrincipal) {
        console.error("Inputs de data ou 'dataPrincipal' na configuração não encontrados.");
        return;
    }
    const datas = dados.map(d => d[dataPrincipal]).filter(Boolean).sort((a, b) => new Date(a) - new Date(b));
    if (datas.length > 0) {
      const primeiraData = datas[0].split(' ')[0];
      const ultimaData = datas[datas.length - 1].split(' ')[0];
      dataInicioEl.min = primeiraData;
      dataInicioEl.max = ultimaData;
      dataFimEl.min = primeiraData;
      dataFimEl.max = ultimaData;
    }
  }

  function inicializarFiltroDePeriodo() {
    const dataInicioEl = document.getElementById('filtro-data-inicio');
    const dataFimEl = document.getElementById('filtro-data-fim');
    const btnAplicar = document.getElementById('btn-aplicar-periodo');
    const btnLimpar = document.getElementById('btn-limpar-periodo');
    if (!dataInicioEl || !dataFimEl || !btnAplicar || !btnLimpar) return;

    btnAplicar.addEventListener('click', async () => {
      const inicio = dataInicioEl.value;
      const fim = dataFimEl.value;
      if (!inicio || !fim) {
        alert('Por favor, selecione uma data de início e uma data de fim.');
        return;
      }
      if (new Date(inicio) > new Date(fim)) {
        alert('A data de início não pode ser posterior à data de fim.');
        return;
      }
      currentFilters.periodo = { inicio, fim };
      const periodoEl = document.getElementById(config.elements.periodo);
      if(periodoEl) periodoEl.textContent = `Período: ${inicio} a ${fim}`;
      const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);
      await atualizarDashboard(dadosFiltrados, performance, grupos);
    });

    btnLimpar.addEventListener('click', () => {
      delete currentFilters.periodo;
      dataInicioEl.value = '';
      dataFimEl.value = '';
      inicializarDashboardVazio();
    });
  }

  function inicializarFiltrosHTML() {
    const filtroContainer = document.getElementById('filtrosDinamicos');
    if (!filtroContainer) return;
  
    filtroContainer.addEventListener('change', (e) => {
      if (e.target.matches('select[data-campo]')) {
        const select = e.target;
        const campo = select.dataset.campo;
        const valor = select.value;
        const secoes = select.dataset.aplicaEm?.split(',').map(s => s.trim());
  
        if (!currentFilters.periodo) {
          alert("Por favor, defina um período antes de aplicar outros filtros.");
          select.value = 'all';
          return;
        }
        
        aplicarFiltro(campo, valor, secoes);
      }
    });
  }
  
  // ===================================================================
  // INICIALIZAÇÃO PRINCIPAL DO DASHBOARD
  // ===================================================================
  try {
    const response = await fetch(config.jsonPath);
    const dados = await response.json();
    window.__dadosDashboard = dados;

    configurarLimitesDoFiltroDePeriodo(dados);
    inicializarDashboardVazio();
    inicializarFiltrosHTML();
    inicializarFiltroDePeriodo();

  } catch (error) {
    console.error('Erro ao carregar ou inicializar o dashboard:', error);
    document.body.innerHTML = '<h1>Erro ao carregar o dashboard. Verifique o console para mais detalhes.</h1>';
  }
});