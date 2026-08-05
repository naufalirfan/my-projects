import { Router } from "express";
import { z } from "zod";
import { TransactionService } from "../services/transaction";
import { authenticateApiKey, authenticateToken, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const createSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  expiresInMinutes: z.number().min(1).max(1440).optional(),
});

// Both API Key and Token can create transactions
router.post("/", authenticateApiKey, async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await TransactionService.create(req.merchant!.id, data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/:id", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const transaction = await TransactionService.getById(req.merchant!.id, req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get("/", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const result = await TransactionService.list(
      req.merchant!.id,
      page,
      limit,
      status
    );
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Public endpoint to check transaction status by external ID
router.get("/external/:externalId", async (req, res) => {
  try {
    const transaction = await TransactionService.getByExternalId(req.params.externalId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({
      externalId: transaction.externalId,
      amount: transaction.amount,
      status: transaction.status,
      paidAt: transaction.paidAt,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Check payment status via InterActive QRIS
router.post("/:externalId/check-status", async (req, res) => {
  try {
    const result = await TransactionService.checkStatus(req.params.externalId);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as transactionRouter };
