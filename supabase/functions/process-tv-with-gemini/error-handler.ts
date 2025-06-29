
export function categorizeError(error: Error): { statusCode: number; userMessage: string } {
  let statusCode = 500;
  let userMessage = 'Error interno del servidor';
  
  const errorMessage = error.message.toLowerCase();
  
  // Authentication and authorization errors
  if (errorMessage.includes('authentication required') || errorMessage.includes('unauthorized')) {
    statusCode = 401;
    userMessage = 'Autenticación requerida - por favor inicia sesión';
  }
  
  // Configuration errors
  else if (errorMessage.includes('not configured') || errorMessage.includes('api key')) {
    statusCode = 500;
    userMessage = 'Configuración del servidor incompleta';
  }
  
  // File and storage errors
  else if (errorMessage.includes('not found') || errorMessage.includes('file not found')) {
    statusCode = 404;
    userMessage = 'Archivo no encontrado en el almacenamiento';
  }
  else if (errorMessage.includes('download') && errorMessage.includes('failed')) {
    statusCode = 502;
    userMessage = 'Error al descargar el archivo - verifica la conexión';
  }
  else if (errorMessage.includes('empty') || errorMessage.includes('size')) {
    statusCode = 422;
    userMessage = 'El archivo está vacío o dañado';
  }
  
  // Request validation errors
  else if (errorMessage.includes('invalid json') || errorMessage.includes('required')) {
    statusCode = 400;
    userMessage = 'Solicitud inválida - verifica los datos enviados';
  }
  else if (errorMessage.includes('invalid file path')) {
    statusCode = 400;
    userMessage = 'Ruta de archivo inválida';
  }
  
  // Timeout and processing errors
  else if (errorMessage.includes('timeout') || errorMessage.includes('processing timeout')) {
    statusCode = 408;
    userMessage = 'Tiempo de procesamiento agotado - intenta con un archivo más pequeño';
  }
  else if (errorMessage.includes('abort')) {
    statusCode = 408;
    userMessage = 'Operación cancelada por timeout';
  }
  
  // Upload and API errors
  else if (errorMessage.includes('file upload failed') || errorMessage.includes('upload')) {
    statusCode = 502;
    userMessage = 'Error al subir el archivo para análisis - por favor intenta nuevamente';
  }
  else if (errorMessage.includes('file processing failed')) {
    statusCode = 422;
    userMessage = 'No se pudo procesar el archivo - verifica que sea un video válido';
  }
  else if (errorMessage.includes('unsupported mime type')) {
    statusCode = 415;
    userMessage = 'Formato de video no soportado - usa MP4, MOV, AVI o WebM';
  }
  
  // Gemini and analysis errors
  else if (errorMessage.includes('gemini') || errorMessage.includes('analysis failed')) {
    statusCode = 503;
    userMessage = 'Servicio de análisis temporalmente no disponible';
  }
  else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
    statusCode = 429;
    userMessage = 'Límite de procesamiento alcanzado - intenta en unos minutos';
  }
  else if (errorMessage.includes('invalid response format')) {
    statusCode = 502;
    userMessage = 'Error en el análisis - respuesta inválida del servidor';
  }
  
  // Database errors
  else if (errorMessage.includes('database') || errorMessage.includes('update')) {
    statusCode = 500;
    userMessage = 'Error al guardar los resultados';
  }
  
  // Network and connectivity errors
  else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
    statusCode = 503;
    userMessage = 'Error de conexión - verifica tu internet';
  }
  
  console.log(`[error-handler] Categorized error: ${errorMessage} -> ${statusCode}: ${userMessage}`);
  
  return { statusCode, userMessage };
}
