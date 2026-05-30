'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const core = require('./_core.cjs');

// ---------- Fechas / zona horaria ----------
test('isoDate usa fecha local (no UTC)', () => {
  // 28-may-2026 21:00 hora local debe dar 2026-05-28, no el día siguiente.
  const d = new Date(2026, 4, 28, 21, 0, 0);
  assert.strictEqual(core.isoDate(d), '2026-05-28');
});

test('dowFromIso: 0=Lunes .. 6=Domingo', () => {
  assert.strictEqual(core.dowFromIso('2026-06-08'), 0); // lunes
  assert.strictEqual(core.dowFromIso('2026-06-13'), 5); // sábado
  assert.strictEqual(core.dowFromIso('2026-06-14'), 6); // domingo
});

test('addDays no muta el original y suma correctamente', () => {
  const base = new Date('2026-06-10T00:00:00');
  const plus = core.addDays(base, 7);
  assert.strictEqual(core.isoDate(plus), '2026-06-17');
  assert.strictEqual(core.isoDate(base), '2026-06-10');
});

// ---------- Recurrencia ----------
test('reservaOcurreEn: puntual solo su día', () => {
  const r = { fi: '2026-06-10' };
  assert.strictEqual(core.reservaOcurreEn(r, '2026-06-10'), true);
  assert.strictEqual(core.reservaOcurreEn(r, '2026-06-11'), false);
});

test('reservaOcurreEn: recurrente respeta días y rango', () => {
  const r = { fi: '2026-03-02', ff: '2026-06-30', dw: '1010100' }; // Lun, Mié, Vie
  assert.strictEqual(core.reservaOcurreEn(r, '2026-03-02'), true);  // lunes
  assert.strictEqual(core.reservaOcurreEn(r, '2026-03-03'), false); // martes
  assert.strictEqual(core.reservaOcurreEn(r, '2026-03-04'), true);  // miércoles
  assert.strictEqual(core.reservaOcurreEn(r, '2026-09-01'), false); // fuera de rango
});

test('reservaOcurreEn: liberación (licencia) libera el rango', () => {
  const r = { fi: '2026-01-01', ff: '2026-12-31', dw: '1111100', libera: [{ desde: '2026-06-10', hasta: '2026-06-20' }] };
  assert.strictEqual(core.reservaOcurreEn(r, '2026-06-09'), true);  // antes
  assert.strictEqual(core.reservaOcurreEn(r, '2026-06-15'), false); // dentro
  assert.strictEqual(core.reservaOcurreEn(r, '2026-06-22'), true);  // después
});

test('reservaOcurreEn: mensual (ts=MES) ocurre el mismo día del mes', () => {
  const r = { fi: '2026-03-15', ff: '2026-06-30', ts: 'MES' };
  assert.strictEqual(core.reservaOcurreEn(r, '2026-03-15'), true);
  assert.strictEqual(core.reservaOcurreEn(r, '2026-04-15'), true);
  assert.strictEqual(core.reservaOcurreEn(r, '2026-05-15'), true);
  assert.strictEqual(core.reservaOcurreEn(r, '2026-04-16'), false); // otro día
  assert.strictEqual(core.reservaOcurreEn(r, '2026-07-15'), false); // fuera de rango
});

test('ocurrenciasMensuales: una por mes y salta meses sin ese día', () => {
  const occ = core.ocurrenciasMensuales('2026-03-15', '2026-06-30');
  assert.deepStrictEqual(occ, ['2026-03-15','2026-04-15','2026-05-15','2026-06-15']);
  // día 31: enero, marzo, mayo... (meses sin 31 se omiten)
  const occ31 = core.ocurrenciasMensuales('2026-01-31', '2026-05-31');
  assert.deepStrictEqual(occ31, ['2026-01-31','2026-03-31','2026-05-31']);
});

test('esRecurrente / recurrenciaLabel cubren semanal y mensual', () => {
  assert.strictEqual(core.esRecurrente({ dw: '1010100' }), true);
  assert.strictEqual(core.esRecurrente({ ts: 'MES', fi: '2026-03-15' }), true);
  assert.strictEqual(core.esRecurrente({ ts: 'NO' }), false);
  assert.match(core.recurrenciaLabel({ ts: 'MES', fi: '2026-03-15' }), /Mensual.*15/);
});

test('ocurrenciasEntre: cuenta clases del patrón', () => {
  // Todos los martes de 18 semanas desde un martes
  const occ = core.ocurrenciasEntre('2026-03-03', core.isoDate(core.addDays(new Date('2026-03-03T00:00:00'), 7 * 18 - 1)), '0100000');
  assert.strictEqual(occ.length, 18);
  assert.strictEqual(occ[0], '2026-03-03');
});

// ---------- Conflicto de módulos ----------
test('rangeOverlapsModules detecta solape horario', () => {
  const modulos = [
    { num: 1, inicio: '08:01', fin: '08:40' }, { num: 2, inicio: '08:41', fin: '09:20' },
    { num: 3, inicio: '09:31', fin: '10:10' }, { num: 4, inicio: '10:11', fin: '10:50' },
  ];
  // Una clase 08:01-09:20 (mód 1-2) solapa con módulos 1-2 pero no 3-4
  assert.strictEqual(core.rangeOverlapsModules('08:01', '09:20', 1, 2, modulos), true);
  assert.strictEqual(core.rangeOverlapsModules('08:01', '09:20', 3, 4, modulos), false);
});

// ---------- Recintos internos / estacionamientos ----------
test('esRecintoInterno distingue interno vs académico', () => {
  assert.strictEqual(core.esRecintoInterno('INT-CN'), true);
  assert.strictEqual(core.esRecintoInterno('EST-AROMOS-27'), true);
  assert.strictEqual(core.esRecintoInterno('VI-S82'), false);
  assert.strictEqual(core.esRecintoInterno(''), false);
});

test('estSpotCode y nombreRecintoInterno', () => {
  assert.strictEqual(core.estSpotCode('AROMOS', 26), 'EST-AROMOS-27');
  assert.strictEqual(core.nombreRecintoInterno('EST-AROMOS-13'), 'Estac. Aromos · E13');
});

// ---------- Modelo de configuración (admin UI) ----------
test('asignaciones por defecto: 14 jefaturas', () => {
  core.applyRecintosCfg(null); // no-op
  const asig = core.buildAsignacionesJefaturas();
  assert.strictEqual(asig.length, 14);
  assert.ok(asig.every(a => a.asignada === true && a.es === 'aprobada'));
});

test('editar asignaciones: agregar/quitar se refleja', () => {
  const cfg = core.getRecintosCfg();
  const nueva = { ...cfg, asignaciones: { ...cfg.asignaciones, 14: 'Nuevo Jefe' } };
  delete nueva.asignaciones[1];
  core.applyRecintosCfg(JSON.parse(JSON.stringify(nueva)));
  const asig = core.buildAsignacionesJefaturas();
  assert.ok(asig.some(a => a.do === 'Nuevo Jefe' && a.r === 'EST-AROMOS-14'), 'E14 asignado');
  assert.ok(!asig.some(a => a.r === 'EST-AROMOS-01'), 'E1 liberado');
  // restaurar para no afectar otros tests
  core.applyRecintosCfg({
    recintos: core.RECINTOS_INTERNOS_DEFAULT, estacionamientos: core.ESTACIONAMIENTOS_DEFAULT,
    asignaciones: core.ASIGNACIONES_AROMOS_DEFAULT, liberaciones: [],
  });
});

test('agregar recinto nuevo se reconoce como interno', () => {
  const cfg = core.getRecintosCfg();
  core.applyRecintosCfg({ ...cfg, recintos: [...cfg.recintos, { code: 'INT-X9', nombre: 'Sala X', tipo: 'Sala', grupo: 'FOL' }] });
  assert.strictEqual(core.esRecintoInterno('INT-X9'), true);
  assert.strictEqual(core.nombreRecintoInterno('INT-X9'), 'Sala X');
  core.applyRecintosCfg({ recintos: core.RECINTOS_INTERNOS_DEFAULT, estacionamientos: core.ESTACIONAMIENTOS_DEFAULT, asignaciones: core.ASIGNACIONES_AROMOS_DEFAULT, liberaciones: [] });
});

test('liberación en config libera la asignación esos días', () => {
  const cfg = core.getRecintosCfg();
  core.applyRecintosCfg({ ...cfg, liberaciones: [{ num: 5, desde: '2026-07-01', hasta: '2026-07-10', motivo: 'Licencia' }] });
  const asig = core.buildAsignacionesJefaturas();
  const e5 = asig.find(a => a.r === 'EST-AROMOS-05');
  assert.ok(e5 && Array.isArray(e5.libera) && e5.libera.length === 1, 'E5 tiene liberación');
  assert.strictEqual(core.reservaOcurreEn(e5, '2026-07-06'), false); // liberado
  assert.strictEqual(core.reservaOcurreEn(e5, '2026-07-15'), true);  // ya volvió
  core.applyRecintosCfg({ recintos: core.RECINTOS_INTERNOS_DEFAULT, estacionamientos: core.ESTACIONAMIENTOS_DEFAULT, asignaciones: core.ASIGNACIONES_AROMOS_DEFAULT, liberaciones: [] });
});
