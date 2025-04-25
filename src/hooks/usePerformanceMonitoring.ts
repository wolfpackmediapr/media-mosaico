import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  pageLoadTime: number | null;
  networkRoundTripTime: number | null;
  resourceLoadTimes: Record<string, number>;
  memoryUsage: any | null;
  firstContentfulPaint: number | null;
  largestContentfulPaint: number | null;
  firstInputDelay: number | null;
  cumulativeLayoutShift: number | null;
}

interface MonitoringOptions {
  enabled?: boolean;
  collectResourceTiming?: boolean;
  logToConsole?: boolean;
  onMetricsCollected?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceEntryExtended extends PerformanceEntry {
  processingStart?: number;
  hadRecentInput?: boolean;
  value?: number;
}

export function usePerformanceMonitoring({
  enabled = true,
  collectResourceTiming = false,
  logToConsole = false,
  onMetricsCollected
}: MonitoringOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    pageLoadTime: null,
    networkRoundTripTime: null,
    resourceLoadTimes: {},
    memoryUsage: null,
    firstContentfulPaint: null,
    largestContentfulPaint: null,
    firstInputDelay: null,
    cumulativeLayoutShift: null
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const collectNavigationTiming = () => {
      if (performance && performance.timing) {
        const timing = performance.timing;
        const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
        const networkRoundTripTime = timing.responseEnd - timing.fetchStart;
        
        const updatedMetrics = {
          ...metrics,
          pageLoadTime,
          networkRoundTripTime
        };
        
        setMetrics(updatedMetrics);
        
        if (logToConsole) {
          console.log('[Performance] Navigation Timing:', {
            pageLoadTime: `${pageLoadTime}ms`,
            networkRoundTripTime: `${networkRoundTripTime}ms`
          });
        }
        
        if (onMetricsCollected) {
          onMetricsCollected(updatedMetrics);
        }
      }
    };

    const collectMemoryUsage = () => {
      if (performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        
        const updatedMetrics = {
          ...metrics,
          memoryUsage: {
            usedJSHeapSize: memory.usedJSHeapSize,
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit
          }
        };
        
        setMetrics(updatedMetrics);
        
        if (logToConsole) {
          console.log('[Performance] Memory Usage:', {
            usedJSHeapSize: `${Math.round(memory.usedJSHeapSize / (1024 * 1024))}MB`,
            totalJSHeapSize: `${Math.round(memory.totalJSHeapSize / (1024 * 1024))}MB`,
            jsHeapSizeLimit: `${Math.round(memory.jsHeapSizeLimit / (1024 * 1024))}MB`
          });
        }
        
        if (onMetricsCollected) {
          onMetricsCollected(updatedMetrics);
        }
      }
    };

    const collectResourceTiming = () => {
      if (performance && performance.getEntriesByType && collectResourceTiming) {
        const resources = performance.getEntriesByType('resource');
        const resourceLoadTimes: Record<string, number> = {};
        
        resources.forEach(resource => {
          const { name, duration } = resource;
          const shortName = name.split('/').pop() || name;
          resourceLoadTimes[shortName] = duration;
        });
        
        const updatedMetrics = {
          ...metrics,
          resourceLoadTimes
        };
        
        setMetrics(updatedMetrics);
        
        if (logToConsole) {
          console.log('[Performance] Resource Timing:', resourceLoadTimes);
        }
        
        if (onMetricsCollected) {
          onMetricsCollected(updatedMetrics);
        }
      }
    };

    const collectWebVitals = () => {
      const paintEntries = performance.getEntriesByType('paint');
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      let lcpObserver: any;
      if ('PerformanceObserver' in window) {
        try {
          lcpObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            
            const updatedMetrics = {
              ...metrics,
              largestContentfulPaint: lastEntry.startTime
            };
            
            setMetrics(updatedMetrics);
            
            if (logToConsole) {
              console.log('[Performance] LCP:', `${lastEntry.startTime}ms`);
            }
            
            if (onMetricsCollected) {
              onMetricsCollected(updatedMetrics);
            }
          });
          
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          console.error('LCP observation failed:', e);
        }
      }
      
      let fidObserver: any;
      if ('PerformanceObserver' in window) {
        try {
          fidObserver = new PerformanceObserver((entryList) => {
            const firstInput = entryList.getEntries()[0] as PerformanceEntryExtended;
            
            if (firstInput && typeof firstInput.processingStart === 'number') {
              const firstInputDelay = firstInput.processingStart - firstInput.startTime;
              
              const updatedMetrics = {
                ...metrics,
                firstInputDelay
              };
              
              setMetrics(updatedMetrics);
              
              if (logToConsole) {
                console.log('[Performance] FID:', `${firstInputDelay}ms`);
              }
              
              if (onMetricsCollected) {
                onMetricsCollected(updatedMetrics);
              }
            }
          });
          
          fidObserver.observe({ type: 'first-input', buffered: true });
        } catch (e) {
          console.error('FID observation failed:', e);
        }
      }
      
      let clsObserver: any;
      let clsValue = 0;
      if ('PerformanceObserver' in window) {
        try {
          clsObserver = new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries() as PerformanceEntryExtended[];
            entries.forEach(entry => {
              if (entry && entry.hadRecentInput === false && typeof entry.value === 'number') {
                clsValue += entry.value;
              }
            });
            
            const updatedMetrics = {
              ...metrics,
              cumulativeLayoutShift: clsValue
            };
            
            setMetrics(updatedMetrics);
            
            if (logToConsole) {
              console.log('[Performance] CLS:', clsValue);
            }
            
            if (onMetricsCollected) {
              onMetricsCollected(updatedMetrics);
            }
          });
          
          clsObserver.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          console.error('CLS observation failed:', e);
        }
      }
      
      if (fcp) {
        const updatedMetrics = {
          ...metrics,
          firstContentfulPaint: fcp.startTime
        };
        
        setMetrics(updatedMetrics);
        
        if (logToConsole) {
          console.log('[Performance] FCP:', `${fcp.startTime}ms`);
        }
        
        if (onMetricsCollected) {
          onMetricsCollected(updatedMetrics);
        }
      }
      
      return () => {
        if (lcpObserver) lcpObserver.disconnect();
        if (fidObserver) fidObserver.disconnect();
        if (clsObserver) clsObserver.disconnect();
      };
    };

    const handleLoad = () => {
      setTimeout(() => {
        collectNavigationTiming();
        collectMemoryUsage();
        
        if (collectResourceTiming) {
          collectResourceTiming();
        }
      }, 0);
    };

    window.addEventListener('load', handleLoad);
    const cleanupVitals = collectWebVitals();

    let memoryInterval: number | null = null;
    if ((performance as any).memory) {
      memoryInterval = window.setInterval(collectMemoryUsage, 10000) as unknown as number;
    }

    return () => {
      window.removeEventListener('load', handleLoad);
      if (typeof cleanupVitals === 'function') cleanupVitals();
      if (memoryInterval) clearInterval(memoryInterval);
    };
  }, [enabled, collectResourceTiming, logToConsole, metrics, onMetricsCollected]);

  return metrics;
}
