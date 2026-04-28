import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import Replicate from "replicate";
import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Replicate client
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  });

  // Background Removal (Remove.bg)
  app.post("/api/ai/remove-bg", async (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "No image provided" });

      const apiKey = process.env.REMOVE_BG_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "REMOVE_BG_API_KEY not configured" });

      const formData = new FormData();
      formData.append("size", "auto");
      formData.append("image_file", Buffer.from(image.split(",")[1], 'base64'), 'image.png');

      const response = await axios.post("https://api.remove.bg/v1.0/removebg", formData, {
        headers: {
          ...formData.getHeaders(),
          "X-Api-Key": apiKey,
        },
        responseType: "arraybuffer",
      });

      const base64 = Buffer.from(response.data, "binary").toString("base64");
      res.json({ image: `data:image/png;base64,${base64}` });
    } catch (error: any) {
      console.error("RemoveBG Error:", error.response?.data?.toString() || error.message);
      res.status(500).json({ error: "Failed to remove background" });
    }
  });

  // Face Swap (Replicate)
  app.post("/api/ai/face-swap", async (req, res) => {
    try {
      const { targetImage, swapImage } = req.body;
      if (!targetImage || !swapImage) return res.status(400).json({ error: "Target and swap images required" });

      if (!process.env.REPLICATE_API_TOKEN) {
        return res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });
      }

      console.log("Starting Face Swap with Replicate...");

      // Using a more reliable faceswap model
      const output = await replicate.run(
        "gpuhost/face-swap:785f7a0dc0f865f3a09a5cb4030a2f588a51dede07730e60abb272d7f872d8e1",
        {
          input: {
            target_image: targetImage,
            swap_image: swapImage,
          }
        }
      );

      console.log("Face Swap successful:", output);
      res.json({ image: output });
    } catch (error: any) {
      console.error("FaceSwap Error:", error.message);
      res.status(500).json({ error: `Face swap failed: ${error.message}` });
    }
  });

  // Generative Fill (Stability AI)
  app.post("/api/ai/gen-fill", async (req, res) => {
    try {
      const { image, mask, prompt } = req.body;
      if (!image || !mask || !prompt) return res.status(400).json({ error: "Missing required fields" });

      const apiKey = process.env.STABILITY_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "STABILITY_API_KEY not configured" });

      const formData = new FormData();
      formData.append("image", Buffer.from(image.split(",")[1], 'base64'), 'image.png');
      formData.append("mask", Buffer.from(mask.split(",")[1], 'base64'), 'mask.png');
      formData.append("prompt", prompt);
      formData.append("output_format", "webp");

      const response = await axios.post(
        "https://api.stability.ai/v2beta/stable-image/edit/inpaint",
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
            Accept: "image/*",
          },
          responseType: "arraybuffer",
        }
      );

      const base64 = Buffer.from(response.data, "binary").toString("base64");
      res.json({ image: `data:image/webp;base64,${base64}` });
    } catch (error: any) {
      const errorMsg = error.response?.data?.toString() || error.message;
      console.error("GenFill Error:", errorMsg);
      res.status(500).json({ error: `Generative fill failed: ${errorMsg}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
