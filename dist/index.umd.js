window.addEventListener('DOMContentLoaded', () => {
  const config = window.dashboardConfig;

  fetch(config.jsonPath)
    .then(response => response.json())
    .then(dados => {
      const dates = dados.map(item => item.data_solicitacao.split(' ')[0]);
      document.getElementById('data-range').textContent =
        `${config.periodoLabel} ${moment.min(dates.map(d => moment(d))).format('DD/MM/YY')} - ${moment.max(dates.map(d => moment(d))).format('DD/MM/YY')}`;

      const processData = (filterPriority = 'all') => {
        let filteredData = dados;
        if (filterPriority !== 'all') {
          filteredData = dados.filter(item => item.prioridade === filterPriority);
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

      const initCharts = (priority = 'all') => {
        const { filteredData, performanceData, atendentes } = processData(priority);

        // Chart 1: Timeline
        const timelineChart = echarts.init(document.getElementById(elements.timeline));
        timelineChart.setOption({
          title: { text: config.timeline.title, left: 'center' },
          tooltip: {
            trigger: 'axis',
            formatter: params => {
              const data = filteredData[params[0].dataIndex];
              return config.timeline.tooltipFormatter(data);
            }
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



        timelineChart.on('click', function (params) {
          const data = filteredData[params.dataIndex];
          if (data) {
            alert(config.timeline.onClickFormatter(data));
          }
        });

        window.addEventListener('resize', () => timelineChart.resize());

        // Chart 2: Performance
        const performanceChart = echarts.init(document.getElementById('performance-chart'));
        performanceChart.setOption({
          title: { text: config.chartTitles.performance, left: 'center' },
          tooltip: {
            formatter: params => {
              const data = performanceData[params.dataIndex];
              return `
                <strong>${data.name}</strong><br/>
                Média: <b>${data.value.toFixed(1)} horas</b><br/>
                Atendimentos: ${data.count}
              `;
            }
          },
          xAxis: {
            type: 'category',
            data: atendentes,
            axisLabel: { interval: 0, rotate: config.performanceAxisRotate }
          },
          yAxis: { type: 'value', name: 'Média (horas)' },
          series: [{
            data: performanceData.map(item => ({
              value: item.value,
              itemStyle: {
                color:
                  item.value < 10 ? config.desempenhoCores.bom :
                  item.value < 20 ? config.desempenhoCores.medio :
                                    config.desempenhoCores.ruim
              }
            })),
            type: 'bar',
            showBackground: true,
            label: {
              show: true,
              position: 'top',
              formatter: '{@[1]}h'
            }
          }]
        });

        // Chart 3: Prioridade
        const priorityChart = echarts.init(document.getElementById('priority-distribution'));
        priorityChart.setOption({
          title: { text: config.chartTitles.priority, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            name: 'Prioridade',
            type: 'pie',
            radius: config.pieRadius,
            data: config.prioridades.map(p => ({
              value: filteredData.filter(item => item.prioridade === p).length,
              name: p,
              itemStyle: { color: config.coresPrioridade[p] }
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: config.shadow.blur,
                shadowOffsetX: config.shadow.offsetX,
                shadowColor: config.shadow.color
              }
            },
            label: { formatter: '{b}: {c} ({d}%)' }
          }]
        });

        // Chart 4: Satisfação
        const satisfactionChart = echarts.init(document.getElementById('satisfaction-chart'));
        satisfactionChart.setOption({
          title: { text: config.chartTitles.satisfaction, left: 'center' },
          tooltip: { trigger: 'item' },
          series: [{
            name: 'Nota',
            type: 'pie',
            roseType: 'radius',
            radius: config.satisfactionRadius,
            data: config.notas.map(nota => ({
              value: filteredData.filter(item => item.nota === nota).length,
              name: nota,
              itemStyle: { color: config.coresNota[nota] }
            })),
            labelLine: { length: 15 },
            label: {
              formatter: '{b|{b}}\n{c|{c}}',
              rich: { b: { fontWeight: 'bold' }, c: { padding: [5, 0] } }
            }
          }]
        });
      };

      initCharts();

      document.getElementById('priority-filter').addEventListener('change', function () {
        initCharts(this.value);
      });
    })
    .catch(error => console.error('Erro ao carregar dados:', error));
});