
import React, { useEffect } from "react";

const AlertTv = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="mt-8 p-6 bg-muted rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
      <div data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK"></div>
    </div>
  );
};

export default AlertTv;
