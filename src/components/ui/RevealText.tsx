/**
 * Titular que se revela palabra por palabra: cada palabra sube desde detrás de una máscara
 * conforme el titular entra en pantalla (`.word-mask`/`.word-inner` en globals.css, CSS puro
 * ligado al scroll). Server Component, sin JS.
 *
 * Accesible: el texto completo va en un `sr-only` y las palabras partidas, en `aria-hidden`
 * (un lector de pantalla no debe leer el titular como palabras sueltas). Sin soporte de
 * `animation-timeline` o con reduced motion, el titular se ve completo y estático.
 *
 * NO usar sobre el H1 del hero ni sobre texto que pueda ser el LCP: empieza fuera de la máscara.
 */
export function RevealText({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => (
          <span key={`${word}-${index}`}>
            <span className="word-mask">
              <span className="word-inner" style={{ "--w": Math.min(index, 8) } as React.CSSProperties}>
                {word}
              </span>
            </span>
            {index < words.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </>
  );
}

/**
 * Solo las palabras partidas, para un titular que ya lleva su propio `aria-label` (el
 * `aria-label` dice el texto una sola vez; en el HTML el titular se lee una vez, sin el
 * duplicado `sr-only` de `RevealText`, que importa en un `<h2>` con intención de búsqueda).
 * Mismas reglas: nunca sobre el H1 del hero ni sobre texto que pueda ser el LCP.
 */
export function RevealWords({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <span aria-hidden="true">
      {words.map((word, index) => (
        <span key={`${word}-${index}`}>
          <span className="word-mask">
            <span className="word-inner" style={{ "--w": Math.min(index, 8) } as React.CSSProperties}>
              {word}
            </span>
          </span>
          {index < words.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
