#!/usr/bin/env node
import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 80;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// Store active processes to prevent conflicts
const activeProcesses = new Map();

// HTML form template
const formHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nightscout Autotune</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            color: #555;
        }
        input[type="text"], input[type="number"], input[type="password"] {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
            box-sizing: border-box;
        }
        .checkbox-group {
            display: flex;
            align-items: center;
        }
        .checkbox-group input[type="checkbox"] {
            width: auto;
            margin-right: 10px;
        }
        button {
            background-color: #007bff;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            width: 100%;
            transition: background-color 0.3s;
        }
        button:hover {
            background-color: #0056b3;
        }
        button:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .loading {
            text-align: center;
            color: #666;
            margin-top: 20px;
        }
        .error {
            color: #dc3545;
            background-color: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 10px;
            border-radius: 4px;
            margin-top: 20px;
        }
        .result {
            margin-top: 20px;
            padding: 20px;
            background-color: #d4edda;
            border: 1px solid #c3e6cb;
            border-radius: 4px;
            color: #155724;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Nightscout Autotune</h1>
        <form id="autotuneForm">
            <div class="form-group">
                <label for="ns_host">Host:</label>
                <input type="text" id="ns_host" name="ns_host" placeholder="https://your.nightscout.host" required>
            </div>

            <div class="form-group">
                <label for="autotune_days">Days:</label>
                <input type="number" id="autotune_days" name="autotune_days" min="1" max="90" value="7" required>
            </div>

            <div class="form-group">
                <label for="api_secret">Access Token:</label>
                <input type="password" id="api_secret" name="api_secret" placeholder="API secret or token (optional)">
            </div>

            <div class="form-group">
                <div class="checkbox-group">
                    <input type="checkbox" id="uam_as_basal" name="uam_as_basal" value="true">
                    <label for="uam_as_basal">UAM as basal</label>
                </div>
            </div>

            <button type="submit" id="submitBtn">Run Autotune</button>
        </form>

        <div id="loading" class="loading" style="display: none;">
            Running autotune... This may take several minutes.
        </div>

        <div id="error" class="error" style="display: none;"></div>

        <div id="result" class="result" style="display: none;"></div>
    </div>

    <script>
        const form = document.getElementById('autotuneForm');
        const submitBtn = document.getElementById('submitBtn');
        const loading = document.getElementById('loading');
        const errorDiv = document.getElementById('error');
        const resultDiv = document.getElementById('result');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Hide previous messages
            errorDiv.style.display = 'none';
            resultDiv.style.display = 'none';

            // Show loading
            loading.style.display = 'block';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Running...';

            const formData = new FormData(form);

            try {
                const formDataObj = {};
                for (let [key, value] of formData.entries()) {
                    formDataObj[key] = value;
                }

                const response = await fetch('/run-autotune', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formDataObj)
                });

                const data = await response.json();

                if (response.ok) {
                    resultDiv.innerHTML = data.html;
                    resultDiv.style.display = 'block';
                } else {
                    errorDiv.textContent = data.error || 'An error occurred';
                    errorDiv.style.display = 'block';
                }
            } catch (err) {
                errorDiv.textContent = 'Network error: ' + err.message;
                errorDiv.style.display = 'block';
            } finally {
                loading.style.display = 'none';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Run Autotune';
            }
        });
    </script>
</body>
</html>
`;

// Routes
app.get("/", (req, res) => {
  res.send(formHtml);
});

app.post("/run-autotune", async (req, res) => {
  const { ns_host, autotune_days, api_secret, uam_as_basal } = req.body;

  // Validate required fields
  if (!ns_host || !autotune_days) {
    return res.status(400).json({ error: "Host and days are required" });
  }

  // Generate unique ID for this request
  const requestId = crypto.randomUUID();
  const workDir = `/tmp/autotune-${requestId}`;

  // Check if we have too many active processes
  if (activeProcesses.size >= 5) {
    return res
      .status(429)
      .json({ error: "Too many concurrent requests. Please try again later." });
  }

  try {
    // Mark as active
    activeProcesses.set(requestId, true);

    // Set environment variables
    const env = {
      ...process.env,
      NS_HOST: ns_host,
      AUTOTUNE_DAYS: autotune_days,
      UAM_AS_BASAL: uam_as_basal === "true" ? "true" : "false",
      HTML_EXPORT: "true",
      OPENAPS_WORKDIR: workDir,
    };

    if (api_secret) {
      // Try to determine if it's a token or API secret
      // For simplicity, assume it's an API secret if it doesn't look like a token
      if (api_secret.length === 40 && /^[a-f0-9]+$/i.test(api_secret)) {
        env.NS_TOKEN = api_secret;
      } else {
        env.NS_API_SECRET = api_secret;
      }
    }

    // Run the autotune process
    const child = spawn("nightscout-autotune", [], {
      env,
      stdio: ["pipe", "pipe", "pipe"],
      cwd: "/converter",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", async (code) => {
      // Remove from active processes
      activeProcesses.delete(requestId);

      try {
        if (code === 0) {
          // Try to read the HTML export file
          const htmlFile = path.join(
            workDir,
            "autotune",
            "autotune_recommendations.html"
          );
          const html = await fs.readFile(htmlFile, "utf8");

          // Clean up work directory
          await fs.rm(workDir, { recursive: true, force: true });

          res.json({ html });
        } else {
          // Clean up work directory
          await fs.rm(workDir, { recursive: true, force: true });

          res.status(500).json({
            error: `Autotune failed with exit code ${code}. stderr: ${stderr}`,
          });
        }
      } catch (err) {
        // Clean up work directory
        await fs.rm(workDir, { recursive: true, force: true });

        res.status(500).json({
          error: `Failed to read results: ${err.message}`,
        });
      }
    });

    child.on("error", (err) => {
      activeProcesses.delete(requestId);
      res.status(500).json({ error: `Process error: ${err.message}` });
    });
  } catch (err) {
    activeProcesses.delete(requestId);
    res.status(500).json({ error: `Setup error: ${err.message}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Nightscout Autotune web server running on port ${PORT}`);
});
