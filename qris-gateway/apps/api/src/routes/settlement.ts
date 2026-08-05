import { Router } from "express";
import { z } from "zod";
import { SettlementService } from "../services/settlement";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const createSchema = z.object({
  bankAccountId: z.string(),
});

router.use(authenticateToken);

/**
 * @swagger
 * /api/settlements:
 *   get:
 *     summary: List settlements
 *     tags: [Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Settlements }
 */
router.get("/", async (req: AuthRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const result = await SettlementService.list(req.merchant!.id, page, limit, status);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settlements/calculate:
 *   get:
 *     summary: Calculate pending settlement
 *     tags: [Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Calculation }
 */
router.get("/calculate", async (req: AuthRequest, res) => {
  try {
    const result = await SettlementService.calculateSettlement(req.merchant!.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settlements:
 *   post:
 *     summary: Create settlement
 *     tags: [Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Created }
 */
router.post("/", async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await SettlementService.createSettlement(
      req.merchant!.id,
      data.bankAccountId
    );
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settlements/:id:
 *   get:
 *     summary: Get settlement detail
 *     tags: [Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Settlement }
 */
router.get("/:id", async (req: AuthRequest, res) => {
  try {
    const settlement = await SettlementService.getById(req.merchant!.id, req.params.id);
    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found" });
    }
    res.json(settlement);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/settlements/:id/process:
 *   post:
 *     summary: Process settlement
 *     tags: [Settlement]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Processed }
 */
router.post("/:id/process", async (req: AuthRequest, res) => {
  try {
    const result = await SettlementService.processSettlement(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as settlementRouter };
