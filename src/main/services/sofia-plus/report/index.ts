// API pública de los helpers del reporte de SofiaPlus.
//
// Cada función de esta carpeta se serializa con `.toString()` y se ejecuta dentro de la
// página de SofiaPlus, por lo que debe ser autocontenida: sin imports en tiempo de
// ejecución, sin constantes de módulo y sin referencias a helpers externos.
export { fillReportDates } from './dates.js';
export { findInstructorPicker } from './instructor-picker.js';
export { openIdentificationTypeSelect, selectCitizenshipId } from './identification-type.js';
export { fillInstructorIdentification } from './identification-field.js';
export { clickInstructorSearchInput } from './search-button.js';
export { clickInstructorResultLink } from './result-link.js';
