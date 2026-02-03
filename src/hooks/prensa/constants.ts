export const PROCESSING_CONFIG = {
  MAX_FILE_SIZE_MB: 100,
  JOB_CHECK_INTERVAL_MS: 3000,
  MIN_CHECK_INTERVAL_MS: 3000,
  MAX_CONSECUTIVE_ERRORS: 3,
  FAILSAFE_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes
  UPLOAD_PROGRESS_ANIMATION_MS: 300,
  INITIAL_UPLOAD_PROGRESS_TARGET: 45,
  UPLOAD_PROGRESS_INCREMENT: 5,
  POST_UPLOAD_PROGRESS: 50,
} as const;

export const ERROR_MESSAGES = {
  NO_FILE_SELECTED: "Por favor, selecciona un archivo PDF",
  NO_PUBLICATION_NAME: "Por favor, ingresa el nombre de la publicación",
  AUTHENTICATION_ERROR: "Debes iniciar sesión para subir archivos",
  FILE_UPLOAD_ERROR: "Error al subir el archivo",
  PROCESSING_ERROR: "Error al procesar el archivo",
  JOB_CREATION_ERROR: "Error al crear el trabajo de procesamiento",
  PROCESSING_TIMEOUT: "El procesamiento ha tomado demasiado tiempo. Por favor, intenta nuevamente.",
  MULTIPLE_STATUS_CHECK_ERRORS: "Múltiples errores al verificar el estado del proceso",
  CONNECTION_ERROR: "Error de conexión al verificar el estado",
  PROCESSING_CANCELLED: "Procesamiento cancelado por el usuario",
  NO_CLIPPINGS_FOUND: "No se encontraron recortes en el PDF",
  SEARCH_QUERY_REQUIRED: "Por favor, ingresa un término de búsqueda",
  SEARCH_NO_RESULTS: "No se encontraron recortes de prensa que coincidan con tu búsqueda",
} as const;

export const SUCCESS_MESSAGES = {
  PDF_UPLOADED: "PDF subido exitosamente",
  PDF_PROCESSING: "El archivo está siendo procesado, esto puede tardar unos minutos...",
  PDF_PROCESSED: "PDF procesado exitosamente",
  PROCESSING_CANCELLED: "Procesamiento cancelado",
  PROCESSING_CANCELLED_DESC: "El procesamiento del PDF ha sido cancelado",
} as const;
