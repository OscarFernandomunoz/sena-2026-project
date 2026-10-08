// API pública de los helpers del reporte de SofiaPlus.
//
// Cada función de esta carpeta se serializa con `.toString()` y se ejecuta dentro de la
// página de SofiaPlus, por lo que debe ser autocontenida: sin imports en tiempo de
// ejecución, sin constantes de módulo y sin referencias a helpers externos.
export { fillReportDates } from './dates.js';
export { findInstructorPicker, findInstructorPickerPoint } from './instructor-picker.js';
export { openIdentificationTypeSelect, selectCitizenshipId, markIdentificationTypeSelect } from './identification-type.js';
export { fillInstructorIdentification } from './identification-field.js';
export { clickInstructorSearchInput, findInstructorSearchPoint } from './search-button.js';
export { findInstructorRowSelect, selectInstructorRow } from './instructor-row-select.js';
export { clickInstructorResultLink } from './result-link.js';
export { selectLearningResultsOption } from './learning-results-option.js';
export { submitInstructorTimesReport } from './form-submit-button.js';
export { readTotalHours } from './total-hours.js';
