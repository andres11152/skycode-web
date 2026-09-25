// Módulo separado a propósito: es lo que le da a `LazyMotion` (ver
// LazyMotionProvider.tsx) un chunk propio para hacer code-split — si
// `domMax` se importara directo dentro del provider, Next lo empaquetaría
// junto con el resto y perdería el punto de cargarlo async.
import { domMax } from "framer-motion";

export default domMax;
