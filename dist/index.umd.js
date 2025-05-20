window.addEventListener('DOMContentLoaded', () => {
  const config = window.dashboardConfig;
  const currentFilters = {};

  fetch(config.jsonPath)
    .then(response => response.json())
    .then(dados => {
      const dates = dados.map(item => item.data_solicitacao.split(' ')[0]);
      document.getElementById(config.elements.dateRange).textContent =
        `${config.periodoLabel} ${moment.min(dates.map(d => moment(d))).format('DD/MM/YY')} - ${moment.max(dates.map(d => moment(d))).format('DD/MM/YY')}`;

      const processData = () => {
        let filteredData = dados;

        for (const [campo, valor] of Object.entries(currentFilters)) {
          if (valor !== 'all' && valor !== null) {
            filteredData = filteredData.filter(item => item[campo] === valor);
          }
        }

        const atendentes = [...new Set(filteredData.map(item => item.atendente))];
        const performanceData = atendentes.map(atendente => {
          const atendimentos = filteredData.filter(item => item.atendente === atendente);
          return {
            name: atendente,
            value: atendimentos.reduce((sum, item) => sum + item.tempo_resolucao_hrs, 0) / atendimentos.length,
            count: atendimentos.length
          };
        });

        return { filteredData, performanceData, atendentes };
      };

      const applyFilter = (campo, valor) => {
        if (currentFilters[campo] === valor) {
          delete currentFilters[campo];
        } else {
          currentFilters[campo] = valor;
        }
        initCharts();
      };

      const resetAllFilters = () => {
        Object.keys(currentFilters).forEach(k => delete currentFilters[k]);
        document.getElementById(config.elements.priorityFilter).value = 'all';
        initCharts();
      };

      const initCharts = () => {
        const { filteredData, performanceData, atendentes } = processData();

        // Timeline Chart
        const timelineChart = echarts.init(document.getElementById(config.elements.timeline));
        timelineChart.setOption({
          title: { text: config.timeline.title, left: 'center' },
          tooltip: {
            trigger: 'axis',
            formatter: params => config.timeline.tooltipFormatter(filteredData[params[0].dataIndex])
          },
          xAxis: {
            type: 'category',
            data: filteredData.map(item => item.codigo_atendimento),
            axisLabel: { rotate: config.timeline.axisLabelRotate }
          },
          yAxis: {
            type: 'value',
            name: config.timeline.yAxisName
          },
          series: [
            {
              name: config.timeline.seriesNames.inicio,
              type: 'bar',
              data: filteredData.map(item => item.tempo_inicio_hrs),
              itemStyle: { color: config.timeline.colors.inicio }
            },
            {
              name: config.timeline.seriesNames.resolucao,
              type: 'bar',
              data: filteredData.map(item => item.tempo_resolucao_hrs - item.tempo_inicio_hrs),
              itemStyle: { color: config.timeline.colors.resolucao },
              stack: 'total'
            }
          ],
          legend: {
            data: [config.timeline.seriesNames.inicio, config.timeline.seriesNames.resolucao],
            left: config.timeline.legendPosition
          }
        });

        timelineChart.on('click', params => {
          const data = filteredData[params.dataIndex];
          if (data) alert(config.timeline.onClickFormatter(data));
        });

        timelineChart.getZr().on('dblclick', resetAllFilters);
        window.addEventListener('resize', () => timelineChart.resize());

        // Performance Chart
        const performanceChart = echarts.init(document.getElementById(config.elements.performance));
        performanceChart.setOption({
          title: { text: config.chartTitles.performance, left: 'center' },
          tooltip: {
            formatter: params => {
              const data = performanceData[params.dataIndex];
              return config.performance.tooltipFormatter(data);
            }
          },
          xAxis: {
            type: 'category',
            data: atendentes,
            axisLabel: { interval: 0, rotate: config.performance.axisLabelRotate }
          },
          yAxis: { type: 'value', name: config.performance.yAxisName },
          series: [{
            data: performanceData.map(item => ({
              value: item.value,
              itemStyle: { color: config.performance.colorScale(item.value) }
            })),
            type: 'bar',
            showBackground: true,
            label: config.performance.labelConfig
          }]
        });

        performanceChart.on('click', params => {
          applyFilter('atendente', params.name);
        });
        performanceChart.getZr().on('dblclick', resetAllFilters);

        // Priority Pie
        const priorityChart = echarts.init(document.getElementById(config.elements.priority));
        priorityChart.setOption({
          title: { text: config.chartTitles.priority, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            name: 'Prioridade',
            type: 'pie',
            radius: config.priority.radius,
            data: config.priority.labels.map(p => ({
              value: filteredData.filter(item => item.prioridade === p).length,
              name: p,
              itemStyle: { color: config.priority.colors[p] }
            })),
            emphasis: { itemStyle: config.priority.shadow },
            label: config.priority.labelFormat
          }]
        });

        priorityChart.on('click', params => {
          applyFilter('prioridade', params.name);
        });
        priorityChart.getZr().on('dblclick', resetAllFilters);

        // Satisfaction Pie
        const satisfactionChart = echarts.init(document.getElementById(config.elements.satisfaction));
        satisfactionChart.setOption({
          title: { text: config.chartTitles.satisfaction, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            name: 'Nota',
            type: 'pie',
            roseType: 'radius',
            radius: config.satisfaction.radius,
            data: config.satisfaction.notas.map(nota => ({
              value: filteredData.filter(item => item.nota === nota).length,
              name: nota,
              itemStyle: { color: config.satisfaction.colors[nota] }
            })),
            labelLine: config.satisfaction.labelLine,
            label: config.satisfaction.labelFormat
          }]
        });

        satisfactionChart.on('click', params => {
          applyFilter('nota', params.name);
        });
        satisfactionChart.getZr().on('dblclick', resetAllFilters);
      };

      initCharts();

      document.getElementById(config.elements.priorityFilter).addEventListener('change', function () {
        applyFilter('prioridade', this.value);
      });
    })
    .catch(error => console.error('Erro ao carregar dados:', error));
});
