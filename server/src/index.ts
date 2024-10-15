import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import winston from "winston";
import axios from "axios";
import dotenv from "dotenv";
import colors from "colors/safe";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ensure logs directory exists
const logsDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Custom format for colored console output
const coloredFormat = winston.format.printf(({ level, message, timestamp }) => {
  let coloredLevel;
  switch (level) {
    case "info":
      coloredLevel = colors.green(level);
      break;
    case "warn":
      coloredLevel = colors.yellow(level);
      break;
    case "error":
      coloredLevel = colors.red(level);
      break;
    default:
      coloredLevel = level;
  }
  return `${colors.gray(timestamp)} ${coloredLevel}: ${message}`;
});

// Custom format for production console output
const productionFormat = winston.format.printf(
  ({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  }
);

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

// Add console transport for all environments
if (process.env.NODE_ENV === "production") {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        productionFormat
      ),
    })
  );
} else {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.timestamp(), coloredFormat),
    })
  );
}

// Notification configuration
const NOTIFICATION_PROVIDER = process.env.NOTIFICATION_PROVIDER || "none";
const NOTIFICATION_WEBHOOK_URL = process.env.NOTIFICATION_WEBHOOK_URL;

// Function to send notification
async function sendNotification(message: string) {
  if (NOTIFICATION_PROVIDER === "none" || !NOTIFICATION_WEBHOOK_URL) {
    logger.info(
      "Notification skipped: Provider set to none or webhook URL not provided"
    );
    return;
  }

  try {
    let payload;
    switch (NOTIFICATION_PROVIDER) {
      case "discord":
        payload = { content: message };
        break;
      case "slack":
        payload = { text: message };
        break;
      case "generic":
        payload = { message: message };
        break;
      default:
        logger.warn(`Unknown notification provider: ${NOTIFICATION_PROVIDER}`);
        return;
    }

    await axios.post(NOTIFICATION_WEBHOOK_URL, payload);
    logger.info(`${NOTIFICATION_PROVIDER} notification sent successfully`);
  } catch (error) {
    logger.error(`Error sending ${NOTIFICATION_PROVIDER} notification:`, error);
  }
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

app.get("/api/internet-speeds", async (req, res) => {
  try {
    await sendNotification("Website requested internet speeds data");
    res.json(globalSpeedData);
  } catch (error) {
    logger.error("Error serving internet speeds:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/tiles", async (req, res) => {
  try {
    await sendNotification("Website requested tiles data");
    const tiles = [...new Set(globalSpeedData.map((item) => item.tile))];
    res.json(tiles);
  } catch (error) {
    logger.error("Error serving tiles:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/internet-speeds/:tile", async (req, res) => {
  try {
    const tile = req.params.tile;
    await sendNotification(`Website requested data for tile: ${tile}`);
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
