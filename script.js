"use strict";

/* ---------- Frações exatas (evita erros de ponto flutuante) ---------- */
const gcd = (a, b) => {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};
const fr = (n, d = 1) => {
  if (d < 0) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
};
const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => fr(a.n * b.n, a.d * b.d);
const div = (a, b) => fr(a.n * b.d, a.d * b.n);
const isZero = (a) => a.n === 0;

function fromDecimal(s) {
  const sign = s.startsWith("-") ? -1 : 1;
  const [int, dec = ""] = s.replace(/^[-+]/, "").split(".");
  return fr(sign * parseInt(int + dec, 10), 10 ** dec.length);
}

/* Aceita "3", "-2,5", "1/2", "-3/4". Retorna null se inválido. */
function parse(text) {
  const t = text.trim().replace(",", ".").replace("−", "-");
  const num = "[-+]?\\d+(?:\\.\\d+)?";
  if (new RegExp(`^${num}$`).test(t)) return fromDecimal(t);
  const m = t.match(new RegExp(`^(${num})\\s*/\\s*(\\d+(?:\\.\\d+)?)$`));
  if (m && !isZero(fromDecimal(m[2])))
    return div(fromDecimal(m[1]), fromDecimal(m[2]));
  return null;
}

const fmt = (f) =>
  (f.d === 1 ? String(f.n) : `${f.n}/${f.d}`).replace("-", "−");
const approx = (f) =>
  (f.n / f.d)
    .toFixed(4)
    .replace(/\.?0+$/, "")
    .replace("-", "−");

/* ---------- Determinante (Laplace pela primeira linha) ---------- */
function det(M) {
  const n = M.length;
  if (n === 1) return M[0][0];
  if (n === 2) return sub(mul(M[0][0], M[1][1]), mul(M[0][1], M[1][0]));
  let total = fr(0);
  for (let j = 0; j < n; j++) {
    if (isZero(M[0][j])) continue;
    const minor = M.slice(1).map((row) => row.filter((_, c) => c !== j));
    const term = mul(M[0][j], det(minor));
    total = j % 2 === 0 ? add(total, term) : sub(total, term);
  }
  return total;
}

/* ---------- Estado e elementos ---------- */
const MAX = 5;
const state = {
  n: 3,
  A: Array.from({ length: MAX }, () => Array(MAX).fill("")),
  b: Array(MAX).fill(""),
};
const editor = document.getElementById("editor");
const result = document.getElementById("result");
const sub_ = (i) => `<sub>${i}</sub>`;

/* ---------- Editor dinâmico ---------- */
function renderEditor() {
  const n = state.n;
  let html = "";
  for (let i = 0; i < n; i++) {
    html += `<div class="row">`;
    for (let j = 0; j < n; j++) {
      html += `<input type="text" autocomplete="off" enterkeyhint="next" data-i="${i}" data-j="${j}"
        value="${state.A[i][j]}" aria-label="Equação ${i + 1}, coeficiente de x${j + 1}">
        <span class="var">x${sub_(j + 1)}</span>`;
      if (j < n - 1) html += `<span class="op">+</span>`;
    }
    html += `<span class="op">=</span>
      <input type="text" autocomplete="off" enterkeyhint="next" data-i="${i}" data-j="b"
        value="${state.b[i]}" aria-label="Equação ${i + 1}, termo independente"></div>`;
  }
  editor.innerHTML = html;
}

editor.addEventListener("input", (e) => {
  const { i, j } = e.target.dataset;
  if (i === undefined) return;
  if (j === "b") state.b[i] = e.target.value;
  else state.A[i][j] = e.target.value;
  solve();
});

document.querySelectorAll('input[name="n"]').forEach((r) =>
  r.addEventListener("change", () => {
    state.n = Number(r.value);
    renderEditor();
    solve();
  }),
);

document.getElementById("example").addEventListener("click", () => {
  const ex = {
    2: {
      A: [
        ["2", "1"],
        ["1", "-1"],
      ],
      b: ["5", "1"],
    },
    3: {
      A: [
        ["2", "1", "-1"],
        ["-3", "-1", "2"],
        ["-2", "1", "2"],
      ],
      b: ["8", "-11", "-3"],
    },
    4: {
      A: [
        ["1", "1", "1", "1"],
        ["1", "-1", "1", "-1"],
        ["1", "2", "3", "4"],
        ["2", "0", "1", "0"],
      ],
      b: ["10", "-2", "30", "5"],
    },
    5: {
      A: [
        ["2", "0", "0", "0", "1"],
        ["0", "3", "0", "1", "0"],
        ["0", "0", "1", "0", "0"],
        ["1", "0", "0", "2", "0"],
        ["0", "1", "0", "0", "4"],
      ],
      b: ["3", "5", "2", "3", "9"],
    },
  }[state.n];
  ex.A.forEach((row, i) => row.forEach((v, j) => (state.A[i][j] = v)));
  ex.b.forEach((v, i) => (state.b[i] = v));
  renderEditor();
  solve();
});

document.getElementById("clear").addEventListener("click", () => {
  state.A.forEach((r) => r.fill(""));
  state.b.fill("");
  renderEditor();
  solve();
});

/* ---------- Renderização dos passos ---------- */
function matrixHTML(M, hl = -1, bars = false) {
  const cells = M.map((row) =>
    row
      .map((v, j) => `<span class="${j === hl ? "hl" : ""}">${fmt(v)}</span>`)
      .join(""),
  ).join("");
  return `<div class="matrix-wrap"><div class="matrix${bars ? " bars" : ""}" style="--n:${M.length}">${cells}</div></div>`;
}

const valueHTML = (f) =>
  f.d === 1 ? fmt(f) : `${fmt(f)} <small>≈ ${approx(f)}</small>`;

function message(text, warn = false) {
  result.innerHTML = `<p class="message${warn ? " warn" : ""}">${text}</p>`;
}

/* ---------- Resolução ---------- */
function solve() {
  const n = state.n;
  const inputs = editor.querySelectorAll("input");
  let valid = true,
    empty = false;
  const A = [],
    b = [];

  inputs.forEach((el) => {
    const bad = el.value.trim() !== "" && parse(el.value) === null;
    el.classList.toggle("bad", bad);
  });

  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) {
      const raw = state.A[i][j];
      if (raw.trim() === "") empty = true;
      const v = parse(raw);
      if (v === null) valid = false;
      A[i].push(v);
    }
    if (state.b[i].trim() === "") empty = true;
    const v = parse(state.b[i]);
    if (v === null) valid = false;
    b.push(v);
  }

  if (empty)
    return message(
      "Preencha todos os coeficientes e termos independentes para ver a solução.",
    );
  if (!valid)
    return message(
      "Há valores inválidos (destacados em vermelho). Use números como 2, −1,5 ou 3/4.",
      true,
    );

  const D = det(A);
  let html = "";

  if (isZero(D)) {
    return message(
      "det(A) = 0, então a regra de Cramer não se aplica. O sistema é impossível (sem solução) ou possível e indeterminado (infinitas soluções). Para decidir qual, use escalonamento.",
      true,
    );
  }

  const Ds = [],
    xs = [];
  for (let k = 0; k < n; k++) {
    const Ak = A.map((row, i) => row.map((v, j) => (j === k ? b[i] : v)));
    const Dk = det(Ak);
    Ds.push({ Ak, Dk });
    xs.push(div(Dk, D));
  }

  html += `<div class="solution"><h2>Solução</h2>
    <p class="vec">(${xs.map((_, i) => `x${sub_(i + 1)}`).join(", ")}) = (${xs.map(fmt).join(", ")})</p>
    ${xs.some((x) => x.d !== 1) ? `<ul>${xs.map((x, i) => `<li>x${sub_(i + 1)} = ${fmt(x)} ≈ ${approx(x)}</li>`).join("")}</ul>` : ""}
  </div>
  <h2>Passo a passo</h2>
  <article class="step"><h3>1. Determinante da matriz dos coeficientes</h3>
    <div class="step-body">${matrixHTML(A, -1, true)}
    <div class="calc">det(A) = ${valueHTML(D)}</div></div></article>`;

  Ds.forEach(({ Ak, Dk }, k) => {
    html += `<article class="step"><h3>${k + 2}. Trocar a coluna ${k + 1} pelos termos independentes</h3>
      <div class="step-body">${matrixHTML(Ak, k, true)}
      <div class="calc">det(A${sub_(k + 1)}) = ${valueHTML(Dk)}
        <small>x${sub_(k + 1)} = det(A${sub_(k + 1)}) / det(A) = ${fmt(Dk)} / ${fmt(D)} = ${fmt(xs[k])}</small>
      </div></div></article>`;
  });

  result.innerHTML = html;
}

renderEditor();
solve();
