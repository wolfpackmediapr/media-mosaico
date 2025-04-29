
import { useEffect } from "react";

const TvTypeformEmbed = () => {
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
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
      <div data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK" className="h-[500px] md:h-[600px]"></div>
    </div>
  );
};

export default TvTypeformEmbed;
