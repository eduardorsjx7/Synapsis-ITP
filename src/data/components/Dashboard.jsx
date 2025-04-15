import React from 'react';
import dados from "../dados_atendimento.json";
import ChartComponent from './ChartComp';
import TableComponent from './TableComp';

const Dashboard = () => {
  return (
    <div>
      <ChartComponent data={dados} />
      <TableComponent data={dados} />
    </div>
  );
};

export default Dashboard;
console.log(dados)