import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../services/auth";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register new merchant
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: Merchant registered }
 */
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login merchant
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 */
router.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data);
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get merchant profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Merchant profile }
 */
router.get("/profile", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const profile = await AuthService.getProfile(req.merchant!.id);
    res.json(profile);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/regenerate-key:
 *   post:
 *     summary: Regenerate API key
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: New API key }
 */
router.post("/regenerate-key", authenticateToken, async (req: AuthRequest, res) => {
  try {
    const apiKey = await AuthService.regenerateApiKey(req.merchant!.id);
    res.json({ apiKey });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as authRouter };
