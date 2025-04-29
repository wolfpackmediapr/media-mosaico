
import { useEffect } from "react";
import { useTypeform } from "@/hooks/use-typeform";

const TvTypeformEmbed = () => {
  // Use the enhanced useTypeform hook instead of implementing script loading directly
  // Pass true as second parameter to disable microphone access
  useTypeform(true, true);

  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
      <div 
        data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK" 
        data-tf-disable-microphone="true"
        data-tf-disable-audio="true"
        className="h-[500px] md:h-[600px]"
      ></div>
    </div>
  );
};

export default TvTypeformEmbed;
