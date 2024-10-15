import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import winston from "winston";

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
    }),
  ],
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  );
}

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
        logger.error("Error reading CSV file:", error);
        reject(error);
      });
  });
};

readCSV("./data/sample.csv")
  .then((data) => {
    globalSpeedData = data
      .sort((a, b) => b.avgDownloadSpeed - a.avgDownloadSpeed)
      .slice(0, 10);
    logger.info("Data loaded successfully");
  })
  .catch((error) => {
    logger.error("Error loading data:", error);
  });

app.get("/api/internet-speeds", (req, res) => {
  try {
    res.json(globalSpeedData);
  } catch (error) {
    logger.error("Error serving internet speeds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/tiles", (req, res) => {
  try {
    const tiles = [...new Set(globalSpeedData.map((item) => item.tile))];
    res.json(tiles);
  } catch (error) {
    logger.error("Error serving tiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/internet-speeds/:tile", (req, res) => {
  try {
    const tile = req.params.tile;
    const tileData = globalSpeedData.find((item) => item.tile === tile);
    if (tileData) {
      res.json(tileData);
    } else {
      res.status(404).json({ message: "Tile not found" });
    }
  } catch (error) {
    logger.error("Error serving specific tile data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    logger.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
