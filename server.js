const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());

const PORT = process.env.PORT || 8080;
const downloadsDir = path.join(__dirname, "downloads");

function getFirstModelId() {
  try {
    const entries = fs.readdirSync(downloadsDir, { withFileTypes: true });
    const dir = entries.find((entry) => entry.isDirectory());
    return dir ? dir.name : "";
  } catch {
    return "";
  }
}

const MODEL_ID = process.env.MODEL_ID || getFirstModelId();
const modelDir = MODEL_ID ? path.join(downloadsDir, MODEL_ID) : "";

function resolveIndexFile() {
  if (!modelDir) return "";
  const modified = path.join(modelDir, "index.modified.html");
  const normal = path.join(modelDir, "index.html");
  if (fs.existsSync(modified)) return modified;
  if (fs.existsSync(normal)) return normal;
  return "";
}

app.use(express.json({ limit: "10mb" }));

app.get("/JSNetProxy.js", (req, res) => {
  const proxyPath = path.join(__dirname, "JSNetProxy.js");
  if (fs.existsSync(proxyPath)) {
    return res.sendFile(proxyPath);
  }
  return res.status(404).send("JSNetProxy.js not found");
});

app.get("/", (req, res) => {
  if (!MODEL_ID || !modelDir) {
    return res.status(400).send("MODEL_ID not configured.");
  }
  const indexFile = resolveIndexFile();
  if (!indexFile) {
    return res.status(404).send("index.html not found for model.");
  }
  return res.sendFile(indexFile);
});

app.post("/api/v1/event", (req, res) => {
  return res.json({ ok: true });
});

app.post("/api/mp/accounts/graph", (req, res) => {
  return res.json({ data: { currentUserAccount: null } });
});

app.all("/api/mp/models/graph", (req, res, next) => {
  if (!modelDir) return next();
  const operationName = req.query.operationName;
  if (operationName) {
    const filePath = path.join(modelDir, "api", "mp", "models", `graph_${operationName}.json`);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  const fallbackPath = path.join(modelDir, "api", "mp", "models", "graph");
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }
  return next();
});

if (modelDir) {
  app.use(express.static(modelDir, { index: false, fallthrough: true }));
}

app.use((req, res) => {
  res.status(404).send("File not found");
});

app.listen(PORT, () => {
  console.log(`Server running on http://127.0.0.1:${PORT}`);
  if (MODEL_ID) {
    console.log(`Serving model: ${MODEL_ID}`);
  } else {
    console.log("No model found in downloads/. Set MODEL_ID env var.");
  }
});
