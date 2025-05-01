(function () {
  function criarGrafico(el, tipo, campoValor, grupo, dados, campoY = 'valor', agregacao = 'soma') {
    const chart = echarts.init(el);

    const atualizar = () => {
      const filtrados = window.obterDadosFiltrados(grupo, dados);
      const contagem = {};

      filtrados.forEach(item => {
        const chave = item[campoValor];
        const valor = Number(item[campoY]) || 0;

        if (!contagem[chave]) contagem[chave] = [];

        contagem[chave].push(valor);
      });

      const labels = Object.keys(contagem);
      const valores = labels.map(label => {
        const lista = contagem[label];
        if (agregacao === 'media') {
          return lista.reduce((a, b) => a + b, 0) / lista.length;
        } else {
          return lista.reduce((a, b) => a + b, 0); // soma por padrão
        }
      });

      const series =
        tipo === 'pie' || tipo === 'doughnut'
          ? [{
              type: 'pie',
              data: labels.map((label, i) => ({
                name: label,
                value: valores[i]
              }))
            }]
          : [{
              type,
              data: valores
            }];

      const option = {
        title: { text: campoValor },
        tooltip: { trigger: tipo === 'pie' || tipo === 'doughnut' ? 'item' : 'axis' },
        legend: tipo === 'pie' || tipo === 'doughnut' ? { orient: 'vertical', left: 'left' } : {},
        xAxis: tipo === 'pie' || tipo === 'doughnut' ? undefined : { type: 'category', data: labels },
        yAxis: tipo === 'pie' || tipo === 'doughnut' ? undefined : { type: 'value' },
        series: series
      };

      chart.setOption(option);
    };

    // Clique para filtro
    chart.on('click', (params) => {
      const valor = params.name;
      window.registrarComponente(grupo, campoValor, valor);
    });

    window.registrarComponente(grupo, campoValor, null, atualizar);
    atualizar();
  }

  window.criarGrafico = criarGrafico;
})();
