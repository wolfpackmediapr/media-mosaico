
/**
 * Audio error handling utilities
 * Provides functions for diagnosing and managing audio-related errors
 */
import { toast } from 'sonner';
import { getMimeTypeFromFile, getAudioFormatDetails } from './audio-format-detection';
import { canBrowserPlayFile } from './audio-playback-support';

/**
 * Types of audio errors that can occur
 */
export enum AudioErrorType {
  FORMAT_UNSUPPORTED = 'format_unsupported',
  PLAYBACK_FAILED = 'playback_failed',
  RESOURCE_ERROR = 'resource_error',
  CODEC_ERROR = 'codec_error',
  NETWORK_ERROR = 'network_error',
  PERMISSION_ERROR = 'permission_error',
  UNKNOWN = 'unknown'
}

/**
 * Interface for standardized audio errors
 */
export interface AudioErrorInfo {
  type: AudioErrorType;
  message: string;
  originalError?: Error | string | null;
  details?: Record<string, any>;
  suggestions?: string[];
  canTryNativePlayer?: boolean;
}

/**
 * Diagnoses an audio error from a raw error object or message
 * @param error The raw error object or message
 * @param file The audio file related to the error (if available)
 * @returns Standardized audio error information
 */
export const diagnoseAudioError = (
  error: Error | string | null, 
  file?: File
): AudioErrorInfo => {
  const errorString = typeof error === 'string' 
    ? error.toLowerCase() 
    : error instanceof Error 
      ? error.message.toLowerCase() 
      : '';
  
  // Check for format/codec errors
  if (
    errorString.includes('format') || 
    errorString.includes('codec') || 
    errorString.includes('playback')
  ) {
    let canTryNative = false;
    
    if (file) {
      canTryNative = canBrowserPlayFile(file);
    }
    
    return {
      type: AudioErrorType.FORMAT_UNSUPPORTED,
      message: 'Audio format may not be supported',
      originalError: error,
      suggestions: [
        'Try using MP3 format for better compatibility',
        'Consider converting the file to a different format'
      ],
      canTryNativePlayer: canTryNative
    };
  }
  
  // Check for resource errors
  if (
    errorString.includes('resource') || 
    errorString.includes('url') || 
    errorString.includes('blob')
  ) {
    return {
      type: AudioErrorType.RESOURCE_ERROR,
      message: 'Audio resource could not be accessed',
      originalError: error,
      suggestions: [
        'Try reloading the file',
        'The file may be corrupted or incomplete'
      ]
    };
  }
  
  // Check for network errors
  if (
    errorString.includes('network') || 
    errorString.includes('connection') || 
    errorString.includes('fetch')
  ) {
    return {
      type: AudioErrorType.NETWORK_ERROR,
      message: 'Network error while loading audio',
      originalError: error,
      suggestions: [
        'Check your internet connection',
        'The file may be too large to stream efficiently'
      ]
    };
  }
  
  // Default to unknown error
  return {
    type: AudioErrorType.UNKNOWN,
    message: 'Unknown audio error occurred',
    originalError: error,
    suggestions: [
      'Try a different audio file',
      'Reload the page and try again'
    ]
  };
};

/**
 * Displays a user-friendly error toast based on the error information
 * @param errorInfo The standardized error information
 * @param onTryNative Optional callback to switch to native player
 */
export const displayAudioError = (
  errorInfo: AudioErrorInfo, 
  onTryNative?: () => void
): void => {
  const description = errorInfo.suggestions && errorInfo.suggestions.length > 0
    ? errorInfo.suggestions[0]
    : 'Try using a different audio file';
  
  if (errorInfo.canTryNativePlayer && onTryNative) {
    toast.error(
      errorInfo.message,
      {
        description,
        action: {
          label: 'Try Native Player',
          onClick: onTryNative
        }
      }
    );
  } else {
    toast.error(errorInfo.message, {
      description
    });
  }
};

/**
 * Checks file compatibility and shows warnings if needed
 * @param file The audio file to check
 * @returns A warning message string or null if no warnings
 */
export const checkFileCompatibility = (file: File): string | null => {
  try {
    const formatDetails = getAudioFormatDetails(file);
    return formatDetails.recommendation;
  } catch (error) {
    console.error('[error-handling] Error checking file compatibility:', error);
    return null;
  }
};
