# CINESTESIA — Agent Instructions

## 1. Identidad del proyecto

Cinestesia es una plataforma web audiovisual modular: agregación, descubrimiento, ingestión y reproducción de contenido.

La especificación arquitectónica completa está en `paper_project/`.
La Sección 6 es la arquitectura madre (dividida en múltiples archivos dentro de `paper_project/06-arquitectura-de-alto-nivel/`).

El agente debe tratar `paper_project/` como la especificación del proyecto.

---

## 2. Regla fundamental de contexto

ANTES de modificar código:

1. Inspeccionar el estado actual del repositorio.
2. Leer `DEVELOPMENT_STATE.md`.
3. Leer `CURRENT_TASK.md` si existe.
4. Identificar la sección relevante de `paper_project/`.
5. Leer únicamente la documentación necesaria.
6. Verificar el código existente antes de asumir cómo funciona.

No asumir que el código refleja la arquitectura documentada.
Comparar siempre antes de cambios importantes.

---

## 3. Regla de alcance

El agente NO decide funcionalidades nuevas ni altera el roadmap.

Si una idea no pertenece a la tarea actual:
- No implementarla.
- Registrarla en `BACKLOG.md` para revisión y evaluación.
- Continuar con la tarea actual.

No convertir una tarea pequeña en una refactorización general.

---

## 4. Filosofía: Vertical Slices

Cada slice produce una mejora funcional, comprobable, preferiblemente visible.

Prioridad:
`funcionalidad → integración → verificación → documentación`

No construir motores completos aisladamente.

---

## 5. Límites arquitectónicos

Respetar estrictamente las fronteras:

- Player reproduce Playback Sessions.
- Playback Orchestrator decide.
- Resolver resuelve Sources.
- Gateway transporta recursos autorizados.
- Source Registry administra Sources.
- Catalog administra identidad y metadatos.
- Health observa y proyecta salud.
- Discovery & Ingestion descubre, normaliza, relaciona, incorpora.
- Search consume proyecciones del Catalog.
- Admin/CMS es Control Plane, no cliente directo de la DB.
- Todo lo demás lo puedes revisar en paper_project/

---

## 6. Seguridad

- No introducir secretos en código, DTOs, logs o commits.
- No ocultar errores técnicos.

---

## 7. Calidad

Después de implementar:
1. Ejecutar pruebas relevantes.
2. Ejecutar typecheck.
3. Ejecutar lint cuando corresponda.
4. Ejecutar build cuando corresponda.
5. Verificar manualmente cuando exista interfaz.
6. Revisar el diff.
7. Confirmar que no se modificó nada fuera de alcance.

No declarar terminado sin evidencia de verificación.

---

## 8. Tests

- Tests de funcionalidad: después de implementación funcional.
- Seguridad crítica: puede validarse durante la implementación.
- No tests artificiales solo para cobertura.
- Tests deben comprobar comportamiento real y contratos.

---

## 9. Git

- Cada slice o subslice significativo: 1 commit coherente.
- No acumular cambios no relacionados.
- No reescribir historia sin necesidad explícita.

Antes de cerrar una versión:
- Ejecutar verificaciones.
- Actualizar `CHANGELOG.md`.
- Actualizar `DEVELOPMENT_STATE.md`.
- Actualizar `CURRENT_TASK.md`.
- Crear el tag definido por el roadmap.

---

## 10. Estado del proyecto

`DEVELOPMENT_STATE.md` refleja el estado factual del repositorio.

Debe contener:
- Versión actual.
- Último slice completado.
- Trabajo actual.
- Trabajo pendiente inmediato.
- Decisiones recientes.
- Problemas conocidos.
- Tests ejecutados.
- Último commit.
- Bloqueos existentes.

Nunca escribir que algo está terminado si no fue verificado.

---

## 11. Continuidad entre agentes

El modelo actual puede ser sustituido en cualquier momento.

Antes de abandonar una tarea incompleta por el tema de los tokens:
1. Actualizar `DEVELOPMENT_STATE.md`.
2. Explicar qué está hecho.
3. Explicar qué falta.
4. Registrar errores o bloqueos.
5. Registrar archivos relevantes.
6. Evitar cambios experimentales ambiguos.
7. Indicar el siguiente paso concreto.

El siguiente agente debe poder continuar leyendo el repositorio sin depender de memoria conversacional.

---

## 12. Documentación

Documentar especialmente:
- Decisiones no obvias.
- Invariantes.
- Contratos.
- Razones de diseño.
- Restricciones de seguridad.

No escribir comentarios que repitan el código.

---

## 13. Incertidumbre

Detener y pedir decisión humana cuando una decisión afecte:
- Arquitectura.
- Contrato público.
- Modelo de datos.
- Seguridad.
- Infraestructura.
- Dependencias fundamentales.
- Comportamiento incompatible.

No resolver silenciosamente decisiones irreversibles.

---

## 14. Evidencia

Preferir:
`documentación + código existente + tests + resultados`

sobre:
`suposiciones + preferencias del modelo`

No inventar APIs, tablas, servicios, variables de entorno, endpoints ni funcionalidades.

---

## 15. Infraestructura

No agregar infraestructura/servicios/dependencias pesadas sin justificar:
- Necesidad.
- Alternativa simple.
- Impacto.
- Costo.
- Relación con la versión actual.

Priorizar simplicidad en primeras versiones.

---

## 16. Stack principal

**Frontend:** Next.js + TypeScript + Tailwind CSS
**Backend:** Node.js + Fastify + TypeScript
**Persistencia:** PostgreSQL (Supabase) + Drizzle ORM
**Cache:** Redis (Upstash)
**Playback:** Hls.js
**Deploy inicial:** Vercel (frontend) + Railway (backend) + Supabase + Upstash

No sustituir tecnologías sin decisión explícita, pero puedes recomendar de ser necesario.

---

## 17. Regla maestra

El agente implementa el proyecto.
El agente NO redefine el proyecto, escribe un backlog si recomiendas alguna redefinición.

La especificación, roadmap, ADRs y decisiones humanas delimitan el trabajo.

Cuando exista conflicto entre conveniencia local y arquitectura documentada,
prevalece la arquitectura hasta que una persona decida modificarla.