-- Comentarios en entregables — hasta ahora un sprint completado solo
-- podía aprobarse o rechazarse (migración 0017), sin espacio para una
-- conversación real ("¿puedes ajustar el color del botón?", "ya quedó,
-- revisa de nuevo"). Un hilo simple por sprint, visible tanto para el
-- cliente dueño del proyecto como para el equipo interno — a diferencia
-- de la aprobación (exclusiva del cliente), comentar es de ambos lados:
-- el cliente pregunta, el equipo responde, sobre CUALQUIER sprint (no
-- solo los ya completados — a veces la pregunta es sobre uno en progreso).
--
-- `author_id` referencia `users` sin distinguir cliente/interno en el
-- esquema — un usuario `client` ya tiene su propia fila en `users` (con
-- `client_id`), así que la misma columna sirve para ambos, igual que
-- `documents.uploaded_by`. `ON DELETE SET NULL` (no CASCADE): si se borra
-- la cuenta de quien comentó, el comentario queda (contexto útil de la
-- conversación), solo pierde el autor.
CREATE TABLE IF NOT EXISTS sprint_comments (
  id SERIAL PRIMARY KEY,
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  body VARCHAR(2000) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprint_comments_sprint ON sprint_comments(sprint_id, created_at);
