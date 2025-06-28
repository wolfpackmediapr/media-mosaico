
export function categorizeError(error: Error): { statusCode: number; userMessage: string } {
  let statusCode = 500;
  let userMessage = 'Error interno del servidor';
  
  if (error.message.includes('not configured')) {
    statusCode = 500;
    userMessage = 'Configuración del servidor incompleta';
  } else if (error.message.includes('not found') || error.message.includes('File not found')) {
    statusCode = 404;
    userMessage = 'Archivo no encontrado en el almacenamiento';
  } else if (error.message.includes('Invalid JSON') || error.message.includes('required')) {
    statusCode = 400;
    userMessage = 'Solicitud inválida';
  } else if (error.message.includes('timeout') || error.message.includes('processing timeout')) {
    statusCode = 408;
    userMessage = 'Tiempo de procesamiento agotado - intenta con un archivo más pequeño';
  } else if (error.message.includes('File upload failed')) {
    statusCode = 502;
    userMessage = 'Error al subir el archivo para análisis - por favor intenta nuevamente';
  } else if (error.message.includes('File processing failed')) {
    statusCode = 422;
    userMessage = 'No se pudo procesar el archivo - verifica que sea un video válido';
  } else if (error.message.includes('Gemini')) {
    statusCode = 503;
    userMessage = 'Servicio de análisis temporalmente no disponible';
  }
  
  return { statusCode, userMessage };
}
