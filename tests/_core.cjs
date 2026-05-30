'use strict';
// Carga la lógica REAL desde index.html para testearla en Node, sin duplicarla
// ni modificar la app:
//   1. Extrae el <script type="text/babel"> de index.html.
//   2. Le quita el bootstrap de render (ReactDOM...render(...)).
//   3. Transpila el JSX a JS con esbuild (transformSync).
//   4. Lo evalúa como módulo CommonJS con stubs de React/DOM/globales.
//   5. Devuelve las funciones puras de nivel módulo para asertarlas.
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/);
if (!m) throw new Error('No se encontró el <script type="text/babel"> en index.html');
let src = m[1];

// Quitar el bootstrap de render (todo desde la llamada a ReactDOM...render).
const cut = src.search(/ReactDOM\s*\.\s*createRoot/);
if (cut >= 0) src = src.slice(0, cut);

// JSX -> JS (Node no entiende JSX). No ejecutamos componentes; solo definirlos.
const { code } = esbuild.transformSync(src, { loader: 'jsx', format: 'cjs', target: 'node18' });

// Stubs mínimos para que el código de nivel módulo cargue sin navegador.
const noop = () => {};
const React = {
  useState: (v) => [typeof v === 'function' ? v() : v, noop],
  useEffect: noop, useMemo: (f) => f(), useCallback: (f) => f, useRef: () => ({ current: null }),
  createElement: () => null, Fragment: 'Fragment', Component: class {},
};
const stubStorage = { getItem: () => null, setItem: noop, removeItem: noop };
const sandbox = {
  React, ReactDOM: { createRoot: () => ({ render: noop }) },
  XLSX: { utils: { json_to_sheet: () => ({}), book_new: () => ({}), book_append_sheet: noop }, writeFile: noop },
  window: { SUPABASE_CONFIG: null, addEventListener: noop, removeEventListener: noop, matchMedia: () => ({ matches: false, addEventListener: noop }), localStorage: stubStorage, location: { href: '' } },
  document: { getElementById: () => null, documentElement: { setAttribute: noop, style: {} }, addEventListener: noop, createElement: () => ({ style: {} }), body: {} },
  localStorage: stubStorage,
  navigator: { share: undefined, clipboard: { writeText: () => Promise.resolve() } },
  console,
};

// Nombres de nivel módulo que queremos exponer para testear.
const EXPORTS = [
  'toMin','isoDate','addDays','dowFromIso','fechaToDow','getMonday','fmtFecha',
  'DOW_LBL','dwLabel','reservaOcurreEn','ocurrenciasEntre','ocurrenciasMensuales','esRecurrente','recurrenciaLabel',
  'rangeOverlapsModules','moduleInTimeRange','moduloInfo',
  'estSpotCode','esRecintoInterno','nombreRecintoInterno','jefaturaDeAromos',
  'applyRecintosCfg','getRecintosCfg','buildAsignacionesJefaturas',
  'RECINTOS_INTERNOS_DEFAULT','ESTACIONAMIENTOS_DEFAULT','ASIGNACIONES_AROMOS_DEFAULT','AROMOS_LAYOUT',
];
const footer = '\n;return {' + EXPORTS.map(n => `${n}: (typeof ${n}!=="undefined"?${n}:undefined)`).join(',') + '};\n';

const generated = path.join(__dirname, '_generated.core.cjs');
// Envolvemos en función para inyectar los stubs como "globales" léxicos y
// devolver las funciones de nivel módulo.
const wrapped = `module.exports = function(__stubs__){
  const React=__stubs__.React, ReactDOM=__stubs__.ReactDOM, XLSX=__stubs__.XLSX,
        window=__stubs__.window, document=__stubs__.document,
        localStorage=__stubs__.localStorage, navigator=__stubs__.navigator;
${code}
${footer}
};`;
fs.writeFileSync(generated, wrapped);

let api;
try {
  const factory = require(generated);
  api = factory(sandbox);
} finally {
  try { fs.unlinkSync(generated); } catch (e) {}
}
module.exports = api;
