import axios from "axios";
import fs from "fs";

export const downloadPDF = async (pdfUrl, savePath) => {
  try {
    const response = await axios({
      url: pdfUrl,
      method: "GET",
      responseType: "stream",
    });

    // Save the PDF to local storage
    const writer = fs.createWriteStream(savePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error("Error downloading PDF:", error);
  }
};
