import fs from "fs";
import csv from "csv-parser";

export const getCsvRows = async (path: string): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];

    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("end", () => {
        const emails = rows.map((row) => row.email);
        resolve(emails);
      })
      .on("error", (err) => reject(err));
  });
};
