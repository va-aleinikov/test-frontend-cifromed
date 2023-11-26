const handleFileSelect = (event) => {
  const file = event.target.files[0];

  if (file) {
    // Создание объекта FileReader
    const reader = new FileReader();

    // Обработка события завершения чтения файла
    reader.onload = (e) => {
      const csvData = e.target.result;

      // Обработка данных CSV
      processData(csvData);
    };

    // Чтение файла в формате текста
    reader.readAsText(file);
  }
};

// Установка размеров графика
const margin = { top: 10, right: 30, bottom: 30, left: 60 },
  width = 500 - margin.left - margin.right,
  height = 300 - margin.top - margin.bottom;

// Чтение данных из CSV файла
const processData = (csvData) => {
  const rows = csvData.split("\r\n");
  const header = rows[0].split(";");

  const data = d3
    .csvParseRows(csvData, (d) => {
      const row = d[0].split(";");
      d.region = row[0];
      d.year = row[1];
      d.value = row[2];
      d.shift();
      return d;
    })
    .slice(1);

  // Получение уникальных регионов
  const regions = [...new Set(data.map((d) => d.region))];

  // Создание элемента для отображения средних значений
  const averageValuesDiv = d3.select("#averageValues");
  // Заполнение выпадающего списка регионами
  const regionSelect = d3.select("#regionSelect");
  const chart = d3.select(".chart");

  d3.select("#regionSelect")
    .selectAll("option")
    .data(regions)
    .enter()
    .append("option")
    .text((d) => d);

  // Функция для группировки данных по годам
  const groupDataByYear = (data) => d3.group(data, (d) => d.year);

  // Функция для расчета среднего значения для каждого года
  const calculateAverageByYear = (groupedData) => {
    const averages = [];
    for (const [year, values] of groupedData) {
      const averageValue = d3.mean(values, (d) => d.value);
      averages.push({ year, value: averageValue });
    }
    return averages;
  };

  // Функция для расчета среднего показателя
  const calculateAverage = (data) => {
    const sum = data.reduce(
      (result, region) => result + Number(region.value),
      0
    );

    return sum / data.length;
  };

  // Фильтрация данных по выбранному региону
  const filterData = (regions) =>
    data.filter((item) => regions.some((region) => item.region === region));

  // Обновление графика и таблицы при изменении региона
  const updateCharts = () => {
    regionSelect.style("display", "block");
    const middleByYear = 2023;
    const selectedRegions = Array.from(
      regionSelect.node().selectedOptions,
      (option) => option.value
    );

    const filteredData = filterData(selectedRegions);
    // Расчет среднего значения и отображение
    const averageValue = calculateAverage(
      filteredData.filter((data) => data.year == middleByYear)
    );
    const averageValueRF = calculateAverage(
      data.filter((data) => data.year == middleByYear)
    );
    if (averageValue) {
      averageValuesDiv
        .attr(
          "class",
          (averageValue < averageValueRF ? "alert-danger" : "alert-success") +
            " alert"
        )
        .text("Среднее значение: ");
      averageValuesDiv.append("b").text(`${averageValue.toFixed(2)}`);
      averageValuesDiv
        .select("b")
        .style("color", averageValue < averageValueRF ? "red" : "green");
    }
    if (filteredData.length) {
      // Далее, обновляем график и таблицу с использованием новых данных
      updateLineChart(filteredData);

      // Вызов обновления таблицы
      updateTable(filteredData);
    }
  };

  // Обновление графика
  const updateLineChart = (filteredData) => {
    chart.style("display", "block");
    // Группировка данных по годам
    const groupedData = groupDataByYear(filteredData);

    // Расчет среднего значения для каждого года
    const averages = calculateAverageByYear(groupedData);

    const lineChart = document.getElementById("lineChart");
    if (lineChart) {
      lineChart.innerHTML = "";
    }

    const svg = d3
      .select("#lineChart")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const x = d3
      .scaleTime()
      .domain(d3.extent(averages, (d) => d.year))
      .range([0, width]);
    svg
      .append("g")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x).tickFormat(d3.format(".0f")));

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => +d.value)])
      .range([height, 0]);
    svg.append("g").call(d3.axisLeft(y));

    // Add the line
    svg
      .append("path")
      .datum(averages)
      .attr("fill", "none")
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x((d) => x(d.year))
          .y((d) => y(+d.value))
      );
  };

  // Обновление таблицы
  const updateTable = (filteredData) => {
    const dataTable = document.getElementById("dataTable");
    if (dataTable) {
      dataTable.innerHTML = "";
    }
    // Создание таблицы
    const table = d3
      .select("#dataTable")
      .append("table")
      .attr("class", "table table-fixed w-100 p-3");

    // Добавление заголовка таблицы
    const thead = table.append("thead").attr("class", "thead-dark");
    thead
      .append("tr")
      .selectAll("th")
      .data(header)
      .enter()
      .append("th")
      .text((d) => d);

    // Добавление строк и ячеек таблицы
    const tbody = table.append("tbody");
    const trows = tbody.selectAll("tr").data(filteredData).enter().append("tr");

    // Заполнение ячеек данными
    trows
      .selectAll("td")
      .data((d) => Object.values(d))
      .enter()
      .append("td")
      .text((d) => d);
  };
  // Обработчик изменения выбранного региона
  regionSelect.on("change", updateCharts);
  // Вызов функции обновления с начальным регионом
  updateCharts();
};
// Обработчик события изменения выбранного файла
document
  .getElementById("fileInput")
  .addEventListener("change", handleFileSelect);
