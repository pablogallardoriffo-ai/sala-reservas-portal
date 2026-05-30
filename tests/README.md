# Pruebas automáticas

Estas pruebas blindan la **lógica crítica** del portal (fechas, recurrencia de
reservas, detección de conflictos, recintos internos y el modelo de
configuración con asignaciones y liberaciones de jefaturas).

## Cómo correrlas

```bash
npm install   # solo la primera vez (instala esbuild)
npm test
```

## Cómo funcionan

La app es un único `index.html` con la lógica embebida en un
`<script type="text/babel">`. Para testear el **código real** sin duplicarlo:

1. `tests/_core.cjs` extrae ese script de `index.html`.
2. Le quita el bootstrap de render y transpila el JSX a JS con esbuild.
3. Lo evalúa en Node con *stubs* de React/DOM y expone las funciones puras.
4. `tests/logic.test.cjs` corre las aserciones con el runner nativo de Node.

Esto significa que si alguien cambia una función central y rompe su
comportamiento, `npm test` lo detecta — sin tocar ni montar la app completa.

No se modifica `index.html`: las pruebas leen su contenido tal cual se sirve.
