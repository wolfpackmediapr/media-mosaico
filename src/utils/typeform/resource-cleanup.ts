
/**
 * Utility functions for cleaning up Typeform resources
 */

/**
 * Safely remove all typeform elements associated with a form ID
 * @param formId The Typeform ID to clean up
 */
export const cleanTypeformDOMElements = (formId: string): void => {
  try {
    // Find and remove all Typeform-related elements by query selector
    const typeformElements = document.querySelectorAll(`[data-tf-live="${formId}"], [data-tf-widget="${formId}"], [id^="typeform-${formId}"], [class^="typeform-"]`);
    typeformElements.forEach(element => {
      try {
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing typeform element:`, err);
      }
    });
    
    // Find and remove SPECIFIC Typeform iframes for this formId
    const iframes = document.querySelectorAll(`iframe[src*="typeform"][src*="${formId}"]`);
    iframes.forEach(iframe => {
      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing iframe:`, err);
      }
    });
  } catch (error) {
    console.error(`[TypeformResourceManager] Error in cleanTypeformDOMElements:`, error);
  }
};

/**
 * Clean up generic Typeform resources that aren't tied to a specific form
 */
export const cleanGenericTypeformResources = (): void => {
  try {
    // Find and clean up any popup overlays
    const overlays = document.querySelectorAll('.typeform-popup-overlay, .typeform-popup-wrapper, .typeform-popup-container');
    overlays.forEach(overlay => {
      try {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing overlay:`, err);
      }
    });

    // Find and remove any global Typeform styles
    const styles = document.querySelectorAll('style[id^="typeform-"]');
    styles.forEach(style => {
      try {
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      } catch (err) {
        console.error(`[TypeformResourceManager] Error removing style:`, err);
      }
    });
  } catch (error) {
    console.error(`[TypeformResourceManager] Error in cleanGenericTypeformResources:`, error);
  }
};
