# 📊 Biblioteca de Dashboard Interativo

Uma biblioteca JavaScript para criação de dashboards dinâmicos utilizando [Apache ECharts](https://echarts.apache.org/), com suporte a filtros, estatísticas automáticas e visualizações interativas de performance e satisfação.

---

## ✅ Visão Geral

Esta biblioteca oferece:

- 📊 **Gráficos Dinâmicos**: barras, pizza, linha do tempo (empilhado);  
- 📈 **Estatísticas Automáticas**: média, mediana, moda, mínimo, máximo, desvio padrão;  
- 🎯 **Filtros Interativos**: por prioridade, nota e atendente, com clique e duplo clique;  
- ⚙️ **Integração Simples**: via `window.dashboardConfig`;  
- 📱 **Responsivo**: adapta-se automaticamente ao tamanho da tela;  
- 🧩 **Personalizável**: formatação de rótulos, cores, tooltips e mais.

---

## 🚀 Instalação e Uso

1. **Inclua os scripts no HTML**:

```html
<script src="https://cdn.jsdelivr.net/npm/echarts@5.4.2/dist/echarts.min.js"></script>
<script src="caminho/para/sua-biblioteca.js"></script>
```

2. **Configure o `window.dashboardConfig` antes do DOM ser carregado**:

```html
<script>
window.dashboardConfig = {
  // veja documentação completa para todos os parâmetros
};
</script>
```

3. **Estrutura mínima do HTML**:

```html
<div id="chartEstatisticas"></div>
<div id="chartPerformance"></div>
<div id="chartTimeline"></div>
<div id="chartPrioridade"></div>
<div id="chartSatisfacao"></div>

<select id="filtroPrioridade"></select>
```

---

## 📈 Recursos e Funcionalidades

### ✅ Estatísticas Calculadas Automaticamente

- Média  
- Mediana  
- Moda  
- Mínimo / Máximo  
- Desvio padrão  
- Visualização em tabela e gráfico de barras

### ✅ Filtros Dinâmicos

- **Por Atendente** (gráfico de barras)  
- **Por Prioridade** (pizza)  
- **Por Satisfação** (pizza rose)  
- Clique aplica filtro, **duplo clique limpa filtros**

### ✅ Tipos de Gráficos

| Tipo       | Aplicações                     |
|------------|--------------------------------|
| Barras     | Performance, Estatísticas      |
| Pizza      | Prioridade, Satisfação         |
| Empilhado  | Linha do Tempo de Atendimentos |

---

## 📁 Formato Esperado dos Dados

```json
[
  {
    "codigo_atendimento": "AT001",
    "data_atendimento": "2025-01-10",
    "tempo_inicio_hrs": 0.5,
    "tempo_resolucao_hrs": 3.2,
    "atendente": "João",
    "prioridade": "Alta",
    "nota": "Boa"
  }
]
```

---

## 📌 Eventos e Interações

- `click` em gráficos → aplica filtro  
- `dblclick` (duplo clique) → remove todos os filtros  
- Redimensionamento da janela → gráficos atualizam automaticamente

---

## 🛠️ Requisitos

- [Apache ECharts v5+](https://echarts.apache.org/)  
- JSON de dados com o formato adequado  
- HTML com os IDs definidos em `dashboardConfig`

---

## 💡 Dicas

- Personalize com `labelFormat`, `tooltipFormatter`, `colorScale`, etc.  
- Quer usar como módulo NPM ou UMD? Modularizamos para você facilmente.  
- A biblioteca foi criada para ser **leve, extensível e fácil de integrar**.


---

## 🤝 Contribuições

Contribuições são bem-vindas!  
Para reportar bugs, sugerir melhorias ou colaborar, entre em contato com o autor ou abra uma issue.
