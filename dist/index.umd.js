window.addEventListener('DOMContentLoaded', async () => {
  const config = window.dashboardConfig;
  const currentFilters = {};

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

      Object.assign(resultados, { soma, media, mediana, minimo: nums[0], maximo: nums[nums.length - 1], desvioPadrao });
    }

    return resultados;
  }

  function gerarTabela(containerId, headers, data) {
    const container = document.getElementById(containerId);
    if (!container) return;

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
    container.innerHTML = '';
    container.appendChild(table);
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

  function gerarTabelaPerformance(performance) {
    gerarTabela('tabelaPerformance', ['name', 'value', 'count'], performance);
  }

  function gerarTabelaTodosOsDados(headers, data) {
    gerarTabela('tabelaTodosOsDados', headers, data);
    adicionarBotaoExportacao('tabelaTodosOsDados', 'tabelaTodosOsDados');
  }

  function gerarChartEstatisticas(estatisticas) {
    const chart = echarts.init(document.getElementById(config.elements.estatistica));
    const categorias = ['Média', 'Mediana', 'Moda', 'Mínimo', 'Máximo', 'Desvio Padrão'];
    const valores = [
      estatisticas.media,
      estatisticas.mediana,
      parseFloat(estatisticas.moda[0] || 0),
      estatisticas.minimo,
      estatisticas.maximo,
      estatisticas.desvioPadrao
    ];

    chart.setOption({
      title: { text: 'Indicadores Estatísticos', left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: params => `<strong>${params[0].name}</strong>: ${params[0].value.toFixed(2)} hrs`
      },
      xAxis: { type: 'category', data: categorias },
      yAxis: { type: 'value', name: 'Valor' },
      series: [{
        type: 'bar',
        data: valores,
        itemStyle: { color: '#4dc9f6' },
        label: { show: true, position: 'top', formatter: p => `${p.value.toFixed(2)}` }
      }]
    });
    window.addEventListener('resize', () => chart.resize());
  }

  function exibirEstatisticas(dados) {
    const campoValor = config.campos?.valor;
    if (!campoValor) return;
    const valores = dados.map(d => parseFloat(d[campoValor] || 0)).filter(v => !isNaN(v));
    const stats = calcularEstatisticas(valores);
    if (!stats) return;

    gerarChartEstatisticas(stats);
    gerarTabelaEstatisticas(stats);

    const el = document.getElementById('estatisticas');
    if (el) {
      el.innerHTML = `
        <strong>Estatísticas:</strong><br>
        Média: ${stats.media?.toFixed(2)}<br>
        Mediana: ${stats.mediana?.toFixed(2)}<br>
        Moda: ${stats.moda.join(', ')}<br>
        Mínimo: ${stats.minimo}<br>
        Máximo: ${stats.maximo}<br>
        Desvio Padrão: ${stats.desvioPadrao?.toFixed(2)}<br>
      `;
    }
  }

  function adicionarBotaoExportacao(containerId, tabelaId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const botao = document.createElement('button');
    botao.textContent = 'Exportar para CSV';
    botao.onclick = () => exportarTabelaParaCSV(tabelaId, `${tabelaId}.csv`);
    container.appendChild(botao);
  }

  async function aplicarFiltro(campo, valor, secoes = ['tabela', 'estatisticas', 'performance', 'priority', 'satisfaction', 'timeline']) {
    currentFilters[campo] = valor;
    const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);

    secoes.forEach(secao => atualizarSecao(secao, dadosFiltrados, performance, grupos));
  }
  window.aplicarFiltro = aplicarFiltro;

  function exportarTabelaParaCSV(tabelaId, nomeArquivo = 'dados.csv') {
    const tabela = document.getElementById(tabelaId);
    if (!tabela) return;

    let csv = [];
    const linhas = tabela.querySelectorAll('tr');
    linhas.forEach(linha => {
      const colunas = linha.querySelectorAll('th, td');
      const linhaCSV = Array.from(colunas).map(td => `"${td.textContent.replace(/"/g, '""')}"`);
      csv.push(linhaCSV.join(','));
    });

    const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    a.click();
    URL.revokeObjectURL(url);
  } 

  function gerarFiltrosAutomaticos(dados) {
    const filtroContainer = document.getElementById('filtrosDinamicos');
    if (!filtroContainer) return;

    // Seleciona apenas os <select> definidos no HTML com data-campo
    const selects = filtroContainer.querySelectorAll('select[data-campo][data-aplica-em]');

    selects.forEach(select => {
      const campo = select.dataset.campo;

      // Limpa opções anteriores, se houver
      select.innerHTML = '';

      // Coleta os valores únicos do campo no JSON
      const valoresUnicos = [...new Set(dados.map(d => d[campo]).filter(Boolean))];
      if (valoresUnicos.length === 0) return;

      // Adiciona opção "Todos"
      const optionTodos = document.createElement('option');
      optionTodos.value = 'all';
      optionTodos.textContent = `Todos (${campo})`;
      select.appendChild(optionTodos);

      // Adiciona as opções únicas
      valoresUnicos.forEach(val => {
        const option = document.createElement('option');
        option.value = val;
        option.textContent = val;
        select.appendChild(option);
      });
    });
  }

  window.gerarFiltrosAutomaticos = gerarFiltrosAutomaticos;

  async function atualizarDashboard() {
    const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);
    exibirEstatisticas(dadosFiltrados);
    gerarChartTimeline(dadosFiltrados);
    gerarChartPerformance(performance, grupos);
    gerarChartPriority(dadosFiltrados);
    gerarChartSatisfaction(dadosFiltrados);

    const dadosExemplo = dadosFiltrados[0] || {};
    const headers = Object.keys(dadosExemplo);
    const camposFiltraveis = headers.filter(c => typeof dadosExemplo[c] === 'string');

    gerarTabelaTodosOsDados(headers, dadosFiltrados);
    gerarFiltrosAutomaticos(dadosFiltrados, camposFiltraveis);
  }
  window.atualizarDashboard = atualizarDashboard;

  function limparFiltros(campoAlvo = null) {
    if (campoAlvo) {
      delete currentFilters[campoAlvo];
      ultimosFiltrosClicados[campoAlvo] = null;
    } else {
      Object.keys(currentFilters).forEach(k => {
        delete currentFilters[k];
        ultimosFiltrosClicados[k] = null;
      });
    }

    atualizarDashboard();
  }

  function atualizarPeriodo(dados) {
    const periodoEl = document.getElementById(config.elements.periodo);
    if (!periodoEl) return;
    const datas = dados.map(d => d.data_atendimento).filter(Boolean).sort();
    const primeira = datas[0];
    const ultima = datas[datas.length - 1];
    periodoEl.textContent = `Período: ${primeira} a ${ultima}`;
  }


  function processarDadosLeve(dados) {
    return new Promise(resolve => {
      const { grupo, valor } = config.campos || {};
      if (!grupo || !valor) {
        resolve({ dadosFiltrados: [], performance: [], grupos: [] });
        return;
      }

      requestIdleCallback(() => {
        let dadosFiltrados = [...dados];
        for (const [campo, val] of Object.entries(currentFilters)) {
          if (val !== 'all' && val !== null) {
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
  function inicializarFiltrosHTML() {
    const selects = document.querySelectorAll('#filtrosDinamicos select[data-campo][data-aplica-em]');
    const dados = window.__dadosDashboard;

    selects.forEach(select => {
      const campo = select.dataset.campo;
      const aplicaEm = select.dataset.aplicaEm.split(',').map(s => s.trim());

      // Limpa opções anteriores
      select.innerHTML = '';

      // Adiciona a opção "Todos"
      const optionTodos = document.createElement('option');
      optionTodos.value = 'all';
      optionTodos.textContent = `Todos (${campo})`;
      select.appendChild(optionTodos);

      // Lista valores únicos para o campo
      const valoresUnicos = [...new Set(dados.map(d => d[campo]).filter(Boolean))];
      valoresUnicos.forEach(valor => {
        const option = document.createElement('option');
        option.value = valor;
        option.textContent = valor;
        select.appendChild(option);
      });

      // Aplica filtro ao selecionar
      select.addEventListener('change', () => {
        aplicarFiltro(campo, select.value, aplicaEm);
      });
    });
  }
 function atualizarSecao(secao, dadosFiltrados, performance, grupos) {
  const dadosExemplo = dadosFiltrados[0] || {};
  const headers = Object.keys(dadosExemplo);
  const campos = headers.filter(c => typeof dadosExemplo[c] === 'string');
    switch (secao) {
      case 'estatisticas':
        exibirEstatisticas(dadosFiltrados);
        break;
      case 'timeline':
        gerarChartTimeline(dadosFiltrados);
        break;
      case 'performance':
        gerarChartPerformance(performance, grupos);
        gerarTabelaPerformance(performance);
        break;
      case 'priority':
        gerarChartPriority(dadosFiltrados);
        break;
      case 'satisfaction':
        gerarChartSatisfaction(dadosFiltrados);
        break;
      case 'tabela':
        gerarTabelaTodosOsDados(headers, dadosFiltrados);
        break;
      case 'filtros':
        gerarFiltrosAutomaticos(dadosFiltrados, campos);
        break;
      default:
        atualizarDashboard(); // fallback completo
    }
  } 

// Funcs de Garficos 
  const ultimosFiltrosClicados = {}; 

  function gerarChartTimeline(dados) {
    const chart = echarts.init(document.getElementById(config.elements.timeline));
    const campo = 'codigo_atendimento';

    const xData = dados.map(i => i.codigo_atendimento);
    const inicioData = dados.map(i => i.tempo_inicio_hrs);
    const resolucaoData = dados.map(i => i.tempo_resolucao_hrs - i.tempo_inicio_hrs);

    const updateVisual = (valorSelecionado) => {
      chart.setOption({
        series: [
          {
            data: inicioData.map((v, i) => ({
              value: v,
              itemStyle: {
                color: config.timeline.colors.inicio,
                opacity: valorSelecionado && xData[i] !== valorSelecionado ? 0.3 : 1,
                borderColor: xData[i] === valorSelecionado ? '#000' : undefined,
                borderWidth: xData[i] === valorSelecionado ? 2 : 0,
                shadowBlur: xData[i] === valorSelecionado ? 8 : 0,
                shadowColor: xData[i] === valorSelecionado ? 'rgba(0,0,0,0.4)' : 'transparent'
              }
            }))
          },
          {
            data: resolucaoData.map((v, i) => ({
              value: v,
              itemStyle: {
                color: config.timeline.colors.resolucao,
                opacity: valorSelecionado && xData[i] !== valorSelecionado ? 0.3 : 1,
                borderColor: xData[i] === valorSelecionado ? '#000' : undefined,
                borderWidth: xData[i] === valorSelecionado ? 2 : 0,
                shadowBlur: xData[i] === valorSelecionado ? 8 : 0,
                shadowColor: xData[i] === valorSelecionado ? 'rgba(0,0,0,0.4)' : 'transparent'
              }
            }))
          }
        ]
      });
    };

    chart.setOption({
      title: { text: config.timeline.title, left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: params => config.timeline.tooltipFormatter(dados[params[0].dataIndex])
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLabel: { rotate: config.timeline.axisLabelRotate }
      },
      yAxis: { type: 'value', name: config.timeline.yAxisName },
      legend: {
        data: Object.values(config.timeline.seriesNames),
        left: config.timeline.legendPosition
      },
      series: []
    });

    updateVisual(null); // inicial

    chart.on('click', p => {
      const valor = xData[p.dataIndex];
      if (ultimosFiltrosClicados[campo] === valor) {
        ultimosFiltrosClicados[campo] = null;
        limparFiltros();
        updateVisual(null);
      } else {
        ultimosFiltrosClicados[campo] = valor;
        alert(config.timeline.onClickFormatter(dados[p.dataIndex]));
        updateVisual(valor);
      }
    });

    chart.getZr().on('dblclick', () => {
      limparFiltros(campo);
      ultimosFiltrosClicados[campo] = null;
      updateVisual(null);
    });

    window.addEventListener('resize', () => chart.resize());
  }


  function gerarChartPerformance(data, labels) {
    const chart = echarts.init(document.getElementById(config.elements.performance));
    const campo = 'atendente';

    const updateVisual = (valorSelecionado) => {
      chart.setOption({
        series: [{
          type: 'bar',
          data: data.map((i, idx) => ({
            value: i.value,
            itemStyle: {
              color: config.performance.colorScale(i.value),
              opacity: valorSelecionado && labels[idx] !== valorSelecionado ? 0.3 : 1,
              borderColor: labels[idx] === valorSelecionado ? '#000' : undefined,
              borderWidth: labels[idx] === valorSelecionado ? 2 : 0,
              shadowBlur: labels[idx] === valorSelecionado ? 12 : 0,
              shadowColor: labels[idx] === valorSelecionado ? 'rgba(0,0,0,0.5)' : 'transparent'
            }
          })),
          label: config.performance.labelConfig,
          showBackground: true
        }]
      });
    };

    chart.setOption({
      title: { text: config.chartTitles.performance, left: 'center' },
      tooltip: {
        formatter: p => config.performance.tooltipFormatter(data[p.dataIndex])
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { rotate: config.performance.axisLabelRotate }
      },
      yAxis: { type: 'value', name: config.performance.yAxisName },
      series: []
    });

    updateVisual(null);

    chart.on('click', p => {
      const valor = p.name;
      if (ultimosFiltrosClicados[campo] === valor) {
        ultimosFiltrosClicados[campo] = null;
        limparFiltros();
        updateVisual(null);
      } else {
        ultimosFiltrosClicados[campo] = valor;
        aplicarFiltro(campo, valor, ['tabela', 'estatisticas', 'priority', 'satisfaction', 'timeline']);
        updateVisual(valor);
      }
    });

    chart.getZr().on('dblclick', () => {
      limparFiltros(campo);
      ultimosFiltrosClicados[campo] = null;
      updateVisual(null);
    });
  }

  function gerarChartPriority(dados) {
    const chart = echarts.init(document.getElementById(config.elements.priority));
    const campo = 'prioridade';

    const getData = (valorSelecionado) => config.priority.labels.map(p => ({
      value: dados.filter(d => d.prioridade === p).length,
      name: p,
      itemStyle: {
        color: config.priority.colors[p],
        opacity: valorSelecionado && p !== valorSelecionado ? 0.3 : 1,
        borderColor: p === valorSelecionado ? '#000' : undefined,
        borderWidth: p === valorSelecionado ? 2 : 0,
        shadowBlur: p === valorSelecionado ? 12 : 0,
        shadowColor: p === valorSelecionado ? 'rgba(0,0,0,0.5)' : 'transparent'
      }
    }));

    chart.setOption({
      title: { text: config.chartTitles.priority, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: config.priority.radius,
        data: getData(null),
        selectedMode: 'single',
        label: config.priority.labelFormat
      }]
    });

    chart.on('click', p => {
      const valor = p.name;
      if (ultimosFiltrosClicados[campo] === valor) {
        ultimosFiltrosClicados[campo] = null;
        limparFiltros();
        chart.setOption({ series: [{ data: getData(null) }] });
      } else {
        ultimosFiltrosClicados[campo] = valor;
        aplicarFiltro(campo, valor, ['tabela', 'estatisticas', 'performance', 'satisfaction', 'timeline']);
        chart.setOption({ series: [{ data: getData(valor) }] });
      }
    });

    chart.getZr().on('dblclick', () => {
      limparFiltros(campo);
      ultimosFiltrosClicados[campo] = null;
      chart.setOption({ series: [{ data: getData(null) }] });
    });
  }

  function gerarChartSatisfaction(dados) {
    const chart = echarts.init(document.getElementById(config.elements.satisfaction));
    const campo = 'nota';

    const getData = (valorSelecionado) => config.satisfaction.notas.map(n => ({
      value: dados.filter(d => d.nota === n).length,
      name: n,
      itemStyle: {
        color: config.satisfaction.colors[n],
        opacity: valorSelecionado && n !== valorSelecionado ? 0.3 : 1,
        borderColor: n === valorSelecionado ? '#000' : undefined,
        borderWidth: n === valorSelecionado ? 2 : 0,
        shadowBlur: n === valorSelecionado ? 12 : 0,
        shadowColor: n === valorSelecionado ? 'rgba(0,0,0,0.5)' : 'transparent'
      }
    }));

    chart.setOption({
      title: { text: config.chartTitles.satisfaction, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        roseType: 'radius',
        radius: config.satisfaction.radius,
        data: getData(null),
        selectedMode: 'single',
        label: config.satisfaction.labelFormat,
        labelLine: config.satisfaction.labelLine
      }]
    });

    chart.on('click', p => {
      const valor = p.name;
      if (ultimosFiltrosClicados[campo] === valor) {
        ultimosFiltrosClicados[campo] = null;
        limparFiltros();
        chart.setOption({ series: [{ data: getData(null) }] });
      } else {
        ultimosFiltrosClicados[campo] = valor;
        aplicarFiltro(campo, valor, ['tabela', 'estatisticas', 'performance', 'priority', 'timeline']);
        chart.setOption({ series: [{ data: getData(valor) }] });
      }
    });

    chart.getZr().on('dblclick', () => {
      limparFiltros(campo);
      ultimosFiltrosClicados[campo] = null;
      chart.setOption({ series: [{ data: getData(null) }] });
    });
  }

  // Inicialização
  try {
    const response = await fetch(config.jsonPath);
    const dados = await response.json();
    window.__dadosDashboard = dados;
    atualizarPeriodo(dados);
    await atualizarDashboard(); 
    inicializarFiltrosHTML(); 

    document.getElementById(config.elements.priorityFilter)?.addEventListener('change', function () {
      aplicarFiltro('prioridade', this.value);
    });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
});


