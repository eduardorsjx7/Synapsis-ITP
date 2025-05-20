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

  function aplicarFiltro(campo, valor) {
    currentFilters[campo] = valor;
    atualizarDashboard();
  }

  function limparFiltros() {
    Object.keys(currentFilters).forEach(k => delete currentFilters[k]);
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

  async function atualizarDashboard() {
    const { dadosFiltrados, performance, grupos } = await processarDadosLeve(window.__dadosDashboard);

    exibirEstatisticas(dadosFiltrados);
    gerarChartTimeline(dadosFiltrados);
    gerarChartPerformance(performance, grupos);
    gerarChartPriority(dadosFiltrados);
    gerarChartSatisfaction(dadosFiltrados);
  }


  function gerarChartTimeline(dados) {
    const chart = echarts.init(document.getElementById(config.elements.timeline));
    chart.setOption({
      title: { text: config.timeline.title, left: 'center' },
      tooltip: {
        trigger: 'axis',
        formatter: params => config.timeline.tooltipFormatter(dados[params[0].dataIndex])
      },
      xAxis: {
        type: 'category',
        data: dados.map(i => i.codigo_atendimento),
        axisLabel: { rotate: config.timeline.axisLabelRotate }
      },
      yAxis: { type: 'value', name: config.timeline.yAxisName },
      series: [
        {
          name: config.timeline.seriesNames.inicio,
          type: 'bar',
          data: dados.map(i => i.tempo_inicio_hrs),
          itemStyle: { color: config.timeline.colors.inicio }
        },
        {
          name: config.timeline.seriesNames.resolucao,
          type: 'bar',
          data: dados.map(i => i.tempo_resolucao_hrs - i.tempo_inicio_hrs),
          itemStyle: { color: config.timeline.colors.resolucao },
          stack: 'total'
        }
      ],
      legend: {
        data: Object.values(config.timeline.seriesNames),
        left: config.timeline.legendPosition
      }
    });

    chart.on('click', p => alert(config.timeline.onClickFormatter(dados[p.dataIndex])));
    chart.getZr().on('dblclick', limparFiltros);
    window.addEventListener('resize', () => chart.resize());
  }

  function gerarChartPerformance(data, labels) {
    const chart = echarts.init(document.getElementById(config.elements.performance));
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
      series: [{
        type: 'bar',
        data: data.map(i => ({
          value: i.value,
          itemStyle: { color: config.performance.colorScale(i.value) }
        })),
        label: config.performance.labelConfig,
        showBackground: true
      }]
    });

    chart.on('click', p => aplicarFiltro('atendente', p.name));
    chart.getZr().on('dblclick', limparFiltros);
  }

  function gerarChartPriority(dados) {
    const chart = echarts.init(document.getElementById(config.elements.priority));
    chart.setOption({
      title: { text: config.chartTitles.priority, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: config.priority.radius,
        data: config.priority.labels.map(p => ({
          value: dados.filter(d => d.prioridade === p).length,
          name: p,
          itemStyle: { color: config.priority.colors[p] }
        })),
        emphasis: { itemStyle: config.priority.shadow },
        label: config.priority.labelFormat
      }]
    });

    chart.on('click', p => aplicarFiltro('prioridade', p.name));
    chart.getZr().on('dblclick', limparFiltros);
  }

  function gerarChartSatisfaction(dados) {
    const chart = echarts.init(document.getElementById(config.elements.satisfaction));
    chart.setOption({
      title: { text: config.chartTitles.satisfaction, left: 'center' },
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        roseType: 'radius',
        radius: config.satisfaction.radius,
        data: config.satisfaction.notas.map(n => ({
          value: dados.filter(d => d.nota === n).length,
          name: n,
          itemStyle: { color: config.satisfaction.colors[n] }
        })),
        label: config.satisfaction.labelFormat,
        labelLine: config.satisfaction.labelLine
      }]
    });

    chart.on('click', p => aplicarFiltro('nota', p.name));
    chart.getZr().on('dblclick', limparFiltros);
  }

  // 🚀 Inicialização
  try {
    const response = await fetch(config.jsonPath);
    const dados = await response.json();
    window.__dadosDashboard = dados;
    atualizarPeriodo(dados);
    atualizarDashboard();

    document.getElementById(config.elements.priorityFilter)?.addEventListener('change', function () {
      aplicarFiltro('prioridade', this.value);
    });
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
  }
});


