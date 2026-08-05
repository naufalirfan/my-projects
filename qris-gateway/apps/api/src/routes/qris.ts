import { Router } from "express";
import { z } from "zod";
import { QrisService } from "../services/qris";
import { authenticateApiKey, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const generateSchema = z.object({
  amount: z.number().positive(),
  merchantName: z.string().optional(),
  reference: z.string().optional(),
  description: z.string().optional(),
});

// Generate QRIS QR code
router.post("/generate", authenticateApiKey, async (req: AuthRequest, res) => {
  try {
    const data = generateSchema.parse(req.body);
    const result = await QrisService.generate({
      merchantId: req.merchant!.id,
      merchantName: data.merchantName || req.merchant!.name,
      amount: data.amount,
      reference: data.reference || "",
      description: data.description,
    });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Parse QRIS data
router.post("/parse", async (req, res) => {
  try {
    const { qrisString } = req.body;
    if (!qrisString) {
      return res.status(400).json({ error: "qrisString required" });
    }
    const parsed = QrisService.parseQrisData(qrisString);
    res.json(parsed);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as qrisRouter };
