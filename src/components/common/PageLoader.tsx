
const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center">
    <div className="flex flex-col items-center space-y-4">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      <p className="text-lg font-medium text-gray-600 dark:text-gray-300">Cargando...</p>
    </div>
  </div>
);

export default PageLoader;
