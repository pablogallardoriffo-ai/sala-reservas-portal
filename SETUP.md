# Portal de Salas DUOC UC — Setup con Supabase

Esta guía te lleva de cero a base de datos compartida en ~10 minutos.

## 1. Crear proyecto en Supabase (3 min)

1. Entra a https://supabase.com/dashboard y haz login (puedes usar GitHub).
2. Click en **New project**.
3. Datos del proyecto:
   - **Name**: `duoc-portal-salas` (o el que prefieras)
   - **Database password**: genera una y guárdala (no la necesitarás para la app, pero sí si quieres conectarte por psql).
   - **Region**: la más cercana a Chile → **South America (São Paulo)**.
   - **Pricing plan**: Free.
4. Click **Create new project**. Espera ~1 minuto a que aprovisione.

## 2. Ejecutar el schema (1 min)

1. En el dashboard de tu proyecto, panel izquierdo → **SQL Editor**.
2. Click en **New query**.
3. Abre el archivo `db/schema.sql` de este repo y pega todo su contenido.
4. Click **Run**. Debería decir "Success. No rows returned".

Esto crea las tablas, los 3 usuarios demo (`admin / reservador / usuario`, contraseña `010203`), los 20 módulos horarios y activa real-time.

## 3. Copiar URL y anon key (30 seg)

1. En el dashboard de Supabase, panel izquierdo → **Project Settings** (ícono de tuerca) → **API**.
2. Copia dos valores:
   - **Project URL** (algo como `https://xxxxxxx.supabase.co`)
   - **anon public** key (string largo que empieza con `eyJ...`)

> ⚠️ Es seguro exponer la `anon` key en el navegador — está diseñada para eso. La `service_role` key NO debe usarse nunca en el navegador.

## 4. Conectar el portal a Supabase (30 seg)

1. Abre tu portal desplegado en Vercel.
2. La primera vez verás una pantalla **"Configurar base de datos compartida"**.
3. Pega la URL y la anon key.
4. Click **Conectar**. La app se recarga conectada.

## 5. Cargar datos iniciales (1 min)

1. Con la app ya conectada, entra como `admin / 010203`.
2. Ve a la pestaña **Importar SABANA**.
3. En la sección **"Datos iniciales del repositorio"**, click **Cargar todo** — esto sube las 122 salas, 5.081 sesiones académicas y 620 reservas históricas desde los JSON del repo a la base de datos.
4. Listo. Todos los usuarios que entren verán los mismos datos.

## Cómo funciona después

- **Multi-usuario en tiempo real**: si el reservador aprueba una solicitud, el usuario lo ve sin recargar (real-time vía Supabase Realtime).
- **Cambios persisten en la BD**: crear/editar/eliminar salas, usuarios y reservas afecta a todos los clientes.
- **Importar nueva SABANA**: cualquier admin puede subir un xlsx desde la pestaña Importar SABANA — reemplaza la programación en la BD.

## Si algo falla

- **"No se pudo conectar a Supabase"**: revisa que la URL y la key sean correctas, y que tu proyecto Supabase no esté pausado (los proyectos free se pausan tras 7 días sin uso — entra al dashboard y dale "Restore").
- **Datos no aparecen entre usuarios**: revisa que ejecutaste el bloque de `ALTER PUBLICATION supabase_realtime ADD TABLE` al final del schema.
- **Volver a config**: click en el avatar del sidebar → "Reconfigurar BD".

## Costos

- **Free tier**: 500 MB de base de datos + 50.000 usuarios activos mensuales + 1 GB de transferencia. Suficiente para esta sede.
- **Auto-pausa**: el proyecto se duerme tras 7 días sin uso. Se reactiva en 1 click desde el dashboard (sin pérdida de datos).
