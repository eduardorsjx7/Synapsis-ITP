const listeners = {}; // Definido no escopo externo

(function (global, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory(require("echarts")); // Node/CommonJS
  } else {
    global.echartsDashboardKit = factory(global.echarts); // Navegador
  }
})(typeof window !== "undefined" ? window : this, function (echarts) {
  if (!echarts) {
    throw new Error("ECharts não foi carregado. Instale com npm ou inclua via CDN antes de usar a biblioteca.");
  }

  const filtros = {}; // Correto: usado dentro e retornado


 
  // Func de registrar componete para mostar como uma legenda 

  function registrarComponente(grupo, campo, valor, callback) {
    filtros[grupo] = filtros[grupo] || {};
    listeners[grupo] = listeners[grupo] || [];

    if (callback) {
      listeners[grupo].push(callback);
    } else {
      if (!valor) return;

      filtros[grupo][campo] = filtros[grupo][campo] || new Set();

      if (filtros[grupo][campo].has(valor)) {
        filtros[grupo][campo].delete(valor);
      } else {
        filtros[grupo][campo].add(valor);
      }

      listeners[grupo].forEach(fn => fn());
    }
  }


  // Retorna um arry ao inddentifiica o mocelo do dado 

  function obterDadosFiltrados(grupo, dados) {
    const ativo = filtros[grupo] || {};

    return Array.isArray(dados)
      ? dados.filter(item => {
          return Object.entries(ativo).every(([campo, valores]) => {
            if (!valores || valores.size === 0) return true;
            return valores.has(item[campo]);
          });
        })
      : [];
  }





  function limparFiltros(grupo) {
    filtros[grupo] = {};
    if (listeners[grupo]) listeners[grupo].forEach(fn => fn());
  }



// Cria grafico e atuliza os graficos ao atualizar os dados 


  function criarGrafico(el, tipo, parametro, grupo, dados) {
    const chart = echarts.init(el);
  
    const atualizar = () => {
      const filtrados = obterDadosFiltrados(grupo, dados);
      const contagem = {};
  
      filtrados.forEach(item => {
        const chave = item[parametro];
        const valor = item.valor || 1;
        contagem[chave] = (contagem[chave] || 0) + valor;
      });
  
      const chartTipo = tipo === 'area' ? 'line' : tipo;
  
      const option = {
        title: { text: parametro },
        tooltip: { trigger: 'axis' },
        xAxis: { type: 'category', data: Object.keys(contagem) },
        yAxis: { type: 'value' },
        series: [{
          type: chartTipo,
          data: Object.values(contagem),
          ...(tipo === 'area' ? { areaStyle: {} } : {})  // Ativa área se for tipo 'area'
        }]
      };
  
      chart.setOption(option);
    };
  
    chart.on('click', (params) => {
      const valor = params.name;
      registrarComponente(grupo, parametro, valor);
    });
  
    registrarComponente(grupo, parametro, null, atualizar);
    atualizar();
  }

//---------------------------------------------------------------------------------------------------------------------------------------------------------//


//Cria a func de criar tabela 



  function criarTabela(el, colunas, grupo, dados) {
    const atualizar = () => {
      const filtrados = obterDadosFiltrados(grupo, dados);
      el.innerHTML = '';

      const table = document.createElement('table');
      const thead = document.createElement('thead');
      const tr = document.createElement('tr');

      colunas.forEach(c => {
        const th = document.createElement('th');
        th.textContent = c;
        tr.appendChild(th);
      });
      thead.appendChild(tr);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      filtrados.forEach(item => {
        const tr = document.createElement('tr');
        colunas.forEach(c => {
          const td = document.createElement('td');
          td.textContent = item[c];
          tr.appendChild(td);
        });
        tr.onclick = () => {
          colunas.forEach(c => registrarComponente(grupo, c, item[c]));
        };
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      el.appendChild(table);
    };

    colunas.forEach(c => registrarComponente(grupo, c, null, atualizar));
    atualizar();
  }



  // Retorna as funções para uso global ou por importação
  return {
    criarGrafico,
    criarTabela,
    registrarComponente,
    obterDadosFiltrados,
    limparFiltros,
    filtros
  };
});
