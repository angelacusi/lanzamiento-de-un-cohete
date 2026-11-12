"use strict";

const defaults = {
  mass: 1000,
  thrust: 15000,
  gravity: 9.81,
  drag: 100,
  endTime: 20,
  step: 2
};
const MAX_STEPS = 20000;
const numberFormat = new Intl.NumberFormat("es", { maximumFractionDigits: 3 });
const inputs = {
  mass: document.getElementById("mass-input"),
  thrust: document.getElementById("thrust-input"),
  gravity: document.getElementById("gravity-input"),
  drag: document.getElementById("drag-input"),
  endTime: document.getElementById("end-time-input"),
  step: document.getElementById("step-input")
};
const form = document.getElementById("simulation-form");
const validationMessage = document.getElementById("validation-message");

function formatNumber(value, digits = 3) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("es", {
    maximumFractionDigits: digits
  }).format(value);
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function readParameters() {
  const values = {};
  const errors = [];
  for (const [key, input] of Object.entries(inputs)) {
    const value = input.value.trim() === "" ? NaN : Number(input.value);
    values[key] = value;
    input.setAttribute("aria-invalid", String(!Number.isFinite(value)));
    if (!Number.isFinite(value)) {
      errors.push(`«${input.labels[0].childNodes[0].textContent.trim()}» debe ser un número válido.`);
    }
  }
  const markInvalid = key => inputs[key].setAttribute("aria-invalid", "true");
  if (Number.isFinite(values.mass) && values.mass <= 0) {
    markInvalid("mass");
    errors.push("La masa debe ser mayor que cero.");
  }
  if (Number.isFinite(values.thrust) && values.thrust < 0) {
    markInvalid("thrust");
    errors.push("El empuje no puede ser negativo.");
  }
  if (Number.isFinite(values.gravity) && values.gravity <= 0) {
    markInvalid("gravity");
    errors.push("La gravedad debe ser mayor que cero.");
  }
  if (Number.isFinite(values.drag) && values.drag <= 0) {
    markInvalid("drag");
    errors.push("La resistencia del aire debe ser mayor que cero.");
  }
  if (Number.isFinite(values.endTime) && values.endTime <= 0) {
    markInvalid("endTime");
    errors.push("El tiempo de simulación debe ser mayor que cero.");
  }
  if (Number.isFinite(values.step) && values.step <= 0) {
    markInvalid("step");
    errors.push("El tamaño de paso h debe ser mayor que cero.");
  }
  if (values.endTime > 0 && values.step > 0 && values.endTime / values.step > MAX_STEPS) {
    markInvalid("step");
    markInvalid("endTime");
    errors.push(`La simulación requiere más de ${numberFormat.format(MAX_STEPS)} pasos. Aumenta h o reduce el tiempo.`);
  }
  if (errors.length) {
    validationMessage.textContent = errors.join(" ");
    validationMessage.hidden = false;
    return null;
  }
  validationMessage.hidden = true;
  for (const input of Object.values(inputs)) input.setAttribute("aria-invalid", "false");
  return values;
}

function getModel(params) {
  const acceleration = (params.thrust - params.mass * params.gravity) / params.mass;
  const rate = params.drag / params.mass;
  if (!Number.isFinite(acceleration) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Los parámetros producen coeficientes fuera del rango numérico admitido.");
  }
  return { acceleration, rate };
}

function exactState(time, model) {
  const oneMinusExponential = -Math.expm1(-model.rate * time);
  const terminalVelocity = model.acceleration / model.rate;
  const velocity = terminalVelocity * oneMinusExponential;
  const height = terminalVelocity * time - (terminalVelocity / model.rate) * oneMinusExponential;
  if (!Number.isFinite(velocity) || !Number.isFinite(height)) {
    throw new Error("La solución exacta excede el rango numérico; revisa los parámetros.");
  }
  return { velocity, height };
}

function simulateEuler(params, stepSize) {
  const model = getModel(params);
  const stepCount = Math.ceil(params.endTime / stepSize);
  if (stepCount > MAX_STEPS) throw new Error(`La simulación excede el máximo de ${numberFormat.format(MAX_STEPS)} pasos.`);
  const rows = [{ time: 0, velocity: 0, height: 0 }];
  let velocity = 0;
  let height = 0;
  let time = 0;
  for (let index = 1; index <= stepCount; index += 1) {
    const nextTime = Math.min(params.endTime, index * stepSize);
    const step = nextTime - time;
    const acceleration = model.acceleration - model.rate * velocity;
    height += step * velocity;
    velocity += step * acceleration;
    time = nextTime;
    if (!Number.isFinite(velocity) || !Number.isFinite(height)) {
      throw new Error("Euler produjo un resultado no finito; revisa los parámetros o usa un paso menor.");
    }
    rows.push({ time, velocity, height });
  }
  return { model, rows };
}

function renderModel(params, model) {
  setText("acceleration-expression", `${formatNumber(model.acceleration)} − ${formatNumber(model.rate)}v`);
  setText("exact-velocity-formula", `v(t) = ${formatNumber(model.acceleration / model.rate)}(1 − e^−${formatNumber(model.rate)}t)`);
  setText("exact-height-formula", `y(t) = ${formatNumber(model.acceleration / model.rate)}t − ${formatNumber(model.acceleration / (model.rate * model.rate))}(1 − e^−${formatNumber(model.rate)}t)`);
  setText("parameter-mass", formatNumber(params.mass));
  setText("parameter-thrust", formatNumber(params.thrust));
  setText("parameter-gravity", formatNumber(params.gravity));
  setText("parameter-drag", formatNumber(params.drag));
  setText("parameter-step", formatNumber(params.step));
  setText("parameter-note", `Con estos valores: a = ${formatNumber(model.acceleration)} m/s² y b = ${formatNumber(model.rate)} s⁻¹.`);
}

function renderMetrics(params, simulation) {
  const last = simulation.rows[simulation.rows.length - 1];
  const exact = exactState(params.endTime, simulation.model);
  const velocityError = Math.abs(exact.velocity - last.velocity);
  const heightError = Math.abs(exact.height - last.height);
  setText("metric-velocity-euler", `${formatNumber(last.velocity)} m/s`);
  setText("metric-velocity-exact", `${formatNumber(exact.velocity)} m/s`);
  setText("metric-velocity-error", `Error absoluto: ${formatNumber(velocityError)} m/s`);
  setText("metric-height-euler", `${formatNumber(last.height)} m`);
  setText("metric-height-exact", `${formatNumber(exact.height)} m`);
  setText("metric-height-error", `Error absoluto: ${formatNumber(heightError)} m`);
  setText("run-status", `Resultado a los ${formatNumber(params.endTime)} s · h = ${formatNumber(params.step)} s`);
}

function makeSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function renderChart(svgId, params, simulation, property, unit) {
  const svg = document.getElementById(svgId);
  svg.replaceChildren();
  const width = 760;
  const height = 330;
  const margin = { top: 16, right: 24, bottom: 42, left: 66 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const exactPoints = [];
  const exactCount = Math.max(2, Math.min(300, Math.ceil(params.endTime / Math.max(params.step / 2, params.endTime / 300))));
  for (let index = 0; index <= exactCount; index += 1) {
    const time = params.endTime * index / exactCount;
    exactPoints.push({ time, value: exactState(time, simulation.model)[property] });
  }
  const eulerPoints = simulation.rows.map(row => ({ time: row.time, value: row[property] }));
  const values = [...exactPoints, ...eulerPoints].map(point => point.value);
  let minValue = Math.min(0, ...values);
  let maxValue = Math.max(0, ...values);
  if (minValue === maxValue) maxValue = minValue + 1;
  const padding = (maxValue - minValue) * 0.1;
  minValue -= padding;
  maxValue += padding;
  const x = time => margin.left + time / params.endTime * plotWidth;
  const y = value => margin.top + (maxValue - value) / (maxValue - minValue) * plotHeight;

  for (let tick = 0; tick <= 4; tick += 1) {
    const value = minValue + (maxValue - minValue) * tick / 4;
    const position = y(value);
    svg.append(makeSvgElement("line", {
      x1: margin.left, x2: width - margin.right, y1: position, y2: position, class: "chart-gridline"
    }));
    const label = makeSvgElement("text", {
      x: margin.left - 10, y: position + 4, "text-anchor": "end", class: "chart-label"
    });
    label.textContent = formatNumber(value, 1);
    svg.append(label);
  }
  for (let tick = 0; tick <= 4; tick += 1) {
    const time = params.endTime * tick / 4;
    const position = x(time);
    svg.append(makeSvgElement("line", {
      x1: position, x2: position, y1: margin.top, y2: margin.top + plotHeight, class: "chart-gridline"
    }));
    const label = makeSvgElement("text", {
      x: position, y: height - 15, "text-anchor": "middle", class: "chart-label"
    });
    label.textContent = formatNumber(time, 1);
    svg.append(label);
  }
  svg.append(makeSvgElement("line", {
    x1: margin.left, x2: width - margin.right,
    y1: margin.top + plotHeight, y2: margin.top + plotHeight, class: "chart-axis"
  }));
  svg.append(makeSvgElement("line", {
    x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + plotHeight, class: "chart-axis"
  }));

  const pathData = points => points.map((point, index) =>
    `${index === 0 ? "M" : "L"}${x(point.time).toFixed(2)},${y(point.value).toFixed(2)}`
  ).join(" ");
  svg.append(makeSvgElement("path", { d: pathData(exactPoints), class: "chart-line chart-exact" }));
  svg.append(makeSvgElement("path", { d: pathData(eulerPoints), class: "chart-line chart-euler" }));
  const markerInterval = Math.max(1, Math.ceil(eulerPoints.length / 200));
  for (const [index, point] of eulerPoints.entries()) {
    if (index % markerInterval !== 0 && index !== eulerPoints.length - 1) continue;
    const marker = makeSvgElement("circle", {
      cx: x(point.time), cy: y(point.value), r: 3, class: "chart-point"
    });
    const title = makeSvgElement("title");
    title.textContent = `Euler: t = ${formatNumber(point.time)} s, ${unit} = ${formatNumber(point.value)}`;
    marker.append(title);
    svg.append(marker);
  }
}

function renderTable(params, simulation) {
  const body = document.getElementById("results-body");
  body.replaceChildren();
  for (const [index, rowData] of simulation.rows.entries()) {
    const exact = exactState(rowData.time, simulation.model);
    const row = document.createElement("tr");
    const cells = [
      index,
      formatNumber(rowData.time),
      formatNumber(rowData.velocity),
      formatNumber(exact.velocity),
      formatNumber(Math.abs(exact.velocity - rowData.velocity)),
      formatNumber(rowData.height),
      formatNumber(exact.height),
      formatNumber(Math.abs(exact.height - rowData.height))
    ];
    for (const [column, value] of cells.entries()) {
      const cell = document.createElement(column === 0 ? "th" : "td");
      if (column === 0) cell.scope = "row";
      cell.textContent = String(value);
      if (column === 2 || column === 5) cell.className = "table-euler";
      if (column === 3 || column === 6) cell.className = "table-exact";
      row.append(cell);
    }
    body.append(row);
  }
  setText("table-summary", `${simulation.rows.length} estados · paso h = ${formatNumber(params.step)} s`);
}

function renderStepAnalysis(params) {
  const comparisons = [params.step, params.step / 2, params.step / 4];
  const details = comparisons.map(step => {
    if (Math.ceil(params.endTime / step) > MAX_STEPS) {
      return `h = ${formatNumber(step)} s: comparación omitida por el límite de ${numberFormat.format(MAX_STEPS)} pasos`;
    }
    const result = simulateEuler(params, step);
    const final = result.rows[result.rows.length - 1];
    const exact = exactState(params.endTime, result.model);
    const velocityError = Math.abs(exact.velocity - final.velocity);
    const heightError = Math.abs(exact.height - final.height);
    return `h = ${formatNumber(step)} s (${result.rows.length - 1} pasos): error en velocidad ${formatNumber(velocityError)} m/s y en altura ${formatNumber(heightError)} m`;
  });
  setText("conclusion-text", `Al reducir h, cada paso suele ser más corto y se hacen más cálculos. Para este vuelo: ${details.join("; ")}. Compara los errores para observar cómo cambia la aproximación.`);
  setText("conclusion-title", "¿Qué ocurre al reducir el paso?");
}

function runSimulation(params, isDefault = false) {
  const simulation = simulateEuler(params, params.step);
  renderModel(params, simulation.model);
  renderMetrics(params, simulation);
  renderChart("velocity-chart", params, simulation, "velocity", "v");
  renderChart("height-chart", params, simulation, "height", "y");
  renderTable(params, simulation);
  renderStepAnalysis(params);
  if (isDefault) setText("run-status", "Valores iniciales · vuelo de 20 s");
}

form.addEventListener("submit", event => {
  event.preventDefault();
  const params = readParameters();
  if (!params) return;
  try {
    runSimulation(params);
  } catch (error) {
    validationMessage.textContent = `No fue posible ejecutar la simulación: ${error.message}`;
    validationMessage.hidden = false;
  }
});

form.addEventListener("reset", () => {
  window.setTimeout(() => {
    validationMessage.hidden = true;
    for (const input of Object.values(inputs)) input.setAttribute("aria-invalid", "false");
    try {
      runSimulation(defaults, true);
    } catch (error) {
      validationMessage.textContent = `No fue posible ejecutar la simulación: ${error.message}`;
      validationMessage.hidden = false;
    }
  }, 0);
});

for (const input of Object.values(inputs)) {
  input.addEventListener("input", () => input.removeAttribute("aria-invalid"));
}

try {
  runSimulation(defaults, true);
} catch (error) {
  validationMessage.textContent = `No fue posible iniciar la simulación: ${error.message}`;
  validationMessage.hidden = false;
}
