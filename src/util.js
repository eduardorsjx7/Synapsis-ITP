(function () {
  // Função para formatar data
  function formatarData(data) {
    const date = new Date(data);
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  // Função para gerar rótulos para o eixo X do gráfico
  function gerarLabels(data) {
    return data.map((item) => item.label || item);
  }

  // Função para verificar se o valor é numérico
  function isNumber(value) {
    return !isNaN(value) && isFinite(value);
  }

  // Função para aplicar filtros nos dados
  function aplicarFiltros(dados, filtros) {
    return dados.filter(item => {
      return Object.entries(filtros).every(([campo, valores]) => {
        return valores.includes(item[campo]);
      });
    });
  }

  // Expondo as funções no escopo global
  window.formatarData = formatarData;
  window.gerarLabels = gerarLabels;
  window.isNumber = isNumber;
  window.aplicarFiltros = aplicarFiltros; // Expondo a função aplicarFiltros
})();
