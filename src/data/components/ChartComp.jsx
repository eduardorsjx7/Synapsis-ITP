import React from 'react';
import ReactECharts from 'echarts-for-react';

const ChartComponent = ({ data }) => {
  const prioridadeCount = data.reduce((acc, item) => {
    acc[item.prioridade] = (acc[item.prioridade] || 0) + 1;
    return acc;
  }, {});

  const option = {
    title: { text: 'Atendimentos por Prioridade' },
    tooltip: {},
    xAxis: { type: 'category', data: Object.keys(prioridadeCount) },
    yAxis: { type: 'value' },
    series: [
      {
        type: 'bar',
        data: Object.values(prioridadeCount),
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};

export default ChartComponent;