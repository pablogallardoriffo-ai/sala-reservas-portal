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
test('moduleRunningNow: marca el próximo módulo si faltan < 15 min', () => {
  const modulos = [
    { num: 1, inicio: '08:01', fin: '08:40' },
    { num: 2, inicio: '08:41', fin: '09:20' },
    { num: 3, inicio: '09:31', fin: '10:10' },
    { num: 4, inicio: '10:11', fin: '10:50' },
  ];
  const mins = (h,m) => h*60+m;
  // Dentro del rango: módulo 2 activo a las 09:00
  assert.strictEqual(core.moduleRunningNow(modulos[1], mins(9,0), modulos), true);
  // Recreo 09:20–09:31, a las 09:25 faltan 6 min para el 3 → activo el 3
  assert.strictEqual(core.moduleRunningNow(modulos[2], mins(9,25), modulos), true);
  // El módulo 2 ya terminó (no debe seguir marcado)
  assert.strictEqual(core.moduleRunningNow(modulos[1], mins(9,25), modulos), false);
  // A las 09:00 (módulo 2 corriendo) el 3 NO debe marcarse aún (faltan 31 min)
  assert.strictEqual(core.moduleRunningNow(modulos[2], mins(9,0), modulos), false);
  // A las 10:00 (módulo 3 corriendo) el 4 NO debe activarse (faltan 11 min,
  // pero el 3 sigue corriendo y eso tiene prioridad)
  assert.strictEqual(core.moduleRunningNow(modulos[3], mins(10,0), modulos), false);
  // Antes del primer módulo: 07:50 (faltan 11 min para el 1) → activo
  assert.strictEqual(core.moduleRunningNow(modulos[0], mins(7,50), modulos), true);
  // 07:40 (faltan 21 min) → NO activo todavía
  assert.strictEqual(core.moduleRunningNow(modulos[0], mins(7,40), modulos), false);
});

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

// ---------- Reportes: lógica pura ----------
test('computeReservasReport: estados, SLA y rankings', () => {
  const reservas = [
    { r:'A-1', es:'aprobada',  creado_en:'2026-06-01T10:00:00Z', decidido_en:'2026-06-01T10:30:00Z', do:'Ana' },   // SLA 30
    { r:'A-1', es:'aprobada',  creado_en:'2026-06-02T10:00:00Z', decidido_en:'2026-06-02T11:00:00Z', do:'Ana' },   // SLA 60
    { r:'B-2', es:'rechazada', creado_en:'2026-06-03T10:00:00Z', decidido_en:'2026-06-03T10:20:00Z', do:'Luis' },  // SLA 20
    { r:'B-2', es:'pendiente', creado_en:'2026-06-04T10:00:00Z', do:'Luis' },
    { r:'B-2', es:'aprobada',  dw:'1010100', do:'Eva' },  // recurrente, sin SLA
  ];
  const rep = core.computeReservasReport(reservas);
  assert.strictEqual(rep.total, 5);
  assert.strictEqual(rep.porEstado.aprobada, 3);
  assert.strictEqual(rep.porEstado.pendiente, 1);
  assert.strictEqual(rep.porEstado.rechazada, 1);
  assert.strictEqual(rep.recurrentes, 1);
  // % aprobación = 3 aprob / (3+1 rech... =4 decididas) = 75
  assert.strictEqual(rep.pctAprob, 75);
  // SLA promedio = (30+60+20)/3 = 36.67 → 37
  assert.strictEqual(rep.slaProm, 37);
  assert.strictEqual(rep.topSalas[0].codigo, 'B-2'); // 3 reservas
  assert.strictEqual(rep.topSalas[0].total, 3);
});

test('computeAnomalias: sobreaforo, sin alumnos, choque docente', () => {
  const salas = [
    { codigo:'S1', capacidad:30 }, { codigo:'S2', capacidad:20 },
    { codigo:'VIRT', capacidad:0, nombre:'Sala VIRTUAL' },
  ];
  const sesiones = [
    { s:'S1', sc:'X-1', d:'Ana', hi:'08:01', hf:'08:40', fi:'2026-06-08', i:35 }, // sobreaforo +5
    { s:'S2', sc:'X-2', d:'Luis', hi:'08:01', hf:'08:40', fi:'2026-06-08', i:0 },  // sin alumnos
    { s:'VIRT', sc:'X-3', d:'Eva', hi:'09:31', hf:'10:10', fi:'2026-06-08', i:12 },// sala virtual
    // Choque: Ana en S1 y S2 a la misma hora/fecha
    { s:'S2', sc:'X-9', d:'Ana', hi:'08:01', hf:'08:40', fi:'2026-06-08', i:10 },
  ];
  const an = core.computeAnomalias(sesiones, salas);
  assert.strictEqual(an.sobreaforo.length, 1);
  assert.strictEqual(an.sobreaforo[0].exceso, 5);
  assert.strictEqual(an.sinAlumnos.length, 1);
  assert.strictEqual(an.salaVirtual.length, 1);
  assert.strictEqual(an.choqueDocente.length, 1);
  assert.deepStrictEqual(an.choqueDocente[0].salas.sort(), ['S1','S2']);
});

test('pctDelta: variación porcentual', () => {
  assert.strictEqual(core.pctDelta(120, 100), 20);
  assert.strictEqual(core.pctDelta(80, 100), -20);
  assert.strictEqual(core.pctDelta(5, 0), 100);  // desde 0
  assert.strictEqual(core.pctDelta(0, 0), 0);
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
