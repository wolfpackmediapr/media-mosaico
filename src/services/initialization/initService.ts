
import { seedMediaOutlets } from "../media/mediaImportService";
import { defaultCsvData } from "../media/defaultMediaData";
import { seedTvData } from "@/services/tv";

export const initializeData = async () => {
  try {
    await seedMediaOutlets(defaultCsvData);
    console.log("Media outlets seeded successfully");
    
    await seedTvData();
    console.log("TV data seeded successfully");
    
    return true;
  } catch (error) {
    console.error("Error initializing data:", error);
    return false;
  }
};
