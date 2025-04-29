
import { useEffect } from "react";

const TvTypeformEmbed = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//embed.typeform.com/next/embed.js";
    script.async = true;
    document.body.appendChild(script);

    // After script loads, disable microphone access
    script.onload = () => {
      if (window.tf) {
        // Disable microphone access for Typeform
        window.tf.microphone = { enabled: false };
        
        // Add attribute to disable microphone
        const typeformElements = document.querySelectorAll('[data-tf-live]');
        typeformElements.forEach(element => {
          element.setAttribute('data-tf-disable-microphone', 'true');
        });
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="mt-8 p-6 bg-muted rounded-lg w-full">
      <h2 className="text-2xl font-bold mb-4">Alerta TV</h2>
      <div 
        data-tf-live="01JEWEP95CN5YH8JCET8GEXRSK" 
        data-tf-disable-microphone="true" 
        className="h-[500px] md:h-[600px]"
      ></div>
    </div>
  );
};

export default TvTypeformEmbed;
