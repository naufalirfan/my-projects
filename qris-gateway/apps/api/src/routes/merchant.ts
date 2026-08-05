import { Router } from "express";
import { z } from "zod";
import { MerchantService } from "../services/merchant";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
});

const bankAccountSchema = z.object({
  bankCode: z.string(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  isDefault: z.boolean().optional(),
});

router.use(authenticateToken);

/**
 * @swagger
 * /api/merchants/profile:
 *   get:
 *     summary: Get merchant profile
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profile }
 */
router.get("/profile", async (req: AuthRequest, res) => {
  try {
    const profile = await MerchantService.getProfile(req.merchant!.id);
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/merchants/profile:
 *   put:
 *     summary: Update merchant profile
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Updated }
 */
router.put("/profile", async (req: AuthRequest, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const result = await MerchantService.updateProfile(req.merchant!.id, data);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/merchants/bank-accounts:
 *   post:
 *     summary: Add bank account
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Created }
 */
router.post("/bank-accounts", async (req: AuthRequest, res) => {
  try {
    const data = bankAccountSchema.parse(req.body);
    const result = await MerchantService.createBankAccount(req.merchant!.id, data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/merchants/bank-accounts:
 *   get:
 *     summary: Get bank accounts
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Bank accounts }
 */
router.get("/bank-accounts", async (req: AuthRequest, res) => {
  try {
    const accounts = await MerchantService.getBankAccounts(req.merchant!.id);
    res.json(accounts);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/merchants/bank-accounts/:id:
 *   delete:
 *     summary: Delete bank account
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Deleted }
 */
router.delete("/bank-accounts/:id", async (req: AuthRequest, res) => {
  try {
    await MerchantService.deleteBankAccount(req.merchant!.id, req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/merchants/stats:
 *   get:
 *     summary: Get merchant stats
 *     tags: [Merchant]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Stats }
 */
router.get("/stats", async (req: AuthRequest, res) => {
  try {
    const stats = await MerchantService.getStats(req.merchant!.id);
    res.json(stats);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as merchantRouter };
