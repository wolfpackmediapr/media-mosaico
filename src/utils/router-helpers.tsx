
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

/**
 * Helper to convert regular <a> tags to React Router <Link> components
 * to prevent full page refreshes during navigation
 */
export const RouterLink: React.FC<{
  to: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}> = ({ to, children, className, onClick }) => {
  // For external links (starting with http), use regular <a> tags
  if (to.startsWith('http') || to.startsWith('//')) {
    return (
      <a 
        href={to} 
        className={className} 
        target="_blank" 
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {children}
      </a>
    );
  }
  
  // For internal links, use React Router's <Link>
  return (
    <Link to={to} className={className} onClick={onClick}>
      {children}
    </Link>
  );
};

/**
 * Custom hook to help with navigation without page refreshes
 */
export const useRouterNavigation = () => {
  const location = useLocation();
  
  const navigateTo = (path: string) => {
    // Already on this page, don't navigate
    if (location.pathname === path) {
      return;
    }
    
    // Use React Router's features to navigate without a full page refresh
    window.history.pushState({}, '', path);
    // Dispatch a location change event so React Router updates
    window.dispatchEvent(new PopStateEvent('popstate'));
  };
  
  return { navigateTo, currentPath: location.pathname };
};
