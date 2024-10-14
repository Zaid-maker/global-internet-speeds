import express from "express";
import cors from "cors";
import fs from "fs";
import csv from "csv-parser";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface SpeedData {
  tile: string;
  avgDownloadSpeed: number;
  avgUploadSpeed: number;
  avgLatency: number;
  tests: number;
  devices: number;
  year: number;
  quarter: number;
}

let globalSpeedData: SpeedData[] = [];

const readCSV = (filePath: string): Promise<SpeedData[]> => {
  return new Promise((resolve, reject) => {
    const results: SpeedData[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push({
          tile: data.tile,
          avgDownloadSpeed: parseFloat(data.avg_d_kbps) / 1000,
          avgUploadSpeed: parseFloat(data.avg_u_kbps) / 1000,
          avgLatency: parseFloat(data.avg_lat_ms),
          tests: parseInt(data.tests),
          devices: parseInt(data.devices),
          year: parseInt(data.year),
          quarter: parseInt(data.quarter),
        });
      })
      .on("end", () => {
        resolve(results);
      })
      .on("error", (error) => {
        reject(error);
      });
  });
};

readCSV("./data/sample.csv")
  .then((data) => {
    globalSpeedData = data
      .sort((a, b) => b.avgDownloadSpeed - a.avgDownloadSpeed)
      .slice(0, 10);
    console.log("Data loaded successfully");
  })
  .catch((error) => {
    console.error("Error loading data:", error);
  });

app.get("/api/internet-speeds", (req, res) => {
  res.json(globalSpeedData);
});

app.get("/api/tiles", (req, res) => {
  const tiles = [...new Set(globalSpeedData.map((item) => item.tile))];
  res.json(tiles);
});

app.get("/api/internet-speeds/:tile", (req, res) => {
  const tile = req.params.tile;
  const tileData = globalSpeedData.find((item) => item.tile === tile);
  if (tileData) {
    res.json(tileData);
  } else {
    res.status(404).json({ message: "Tile not found" });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
