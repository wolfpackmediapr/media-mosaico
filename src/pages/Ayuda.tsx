import ErrorBoundary from "@/components/common/ErrorBoundary";

const Ayuda = () => {
  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ayuda</h1>
          <p className="text-gray-500 mt-2">
            Centro de ayuda y soporte
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Ayuda;
