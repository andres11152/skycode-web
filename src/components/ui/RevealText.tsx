/**
 * Titular que se revela palabra por palabra: cada palabra sube desde detrás de una máscara conforme el
 * titular entra en pantalla (`.word-mask`/`.word-inner` en globals.css, CSS puro ligado al scroll). Server
 * Component, sin JS. Sin soporte de `animation-timeline` o con reduced motion, se ve completo y estático.
 *
 * Accesible: las palabras partidas van en `aria-hidden` (un lector de pantalla no debe leerlas sueltas) y el
 * encabezado que las contiene lleva el texto completo en `aria-label`:
 *   <h2 aria-label={titulo}><RevealWords text={titulo} /></h2>
 * Así el texto aparece UNA sola vez en el HTML (lo que indexa Google) y una sola vez para lectores de
 * pantalla. La versión anterior (`RevealText`) añadía además una copia en `sr-only`, y el HTML del `<h2>`
 * quedaba con el titular duplicado.
 *
 * NO usar sobre el H1 del hero ni sobre texto que pueda ser el LCP: empieza fuera de la máscara.
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
