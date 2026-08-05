import { Router } from "express";
import { z } from "zod";
import { WebhookService } from "../services/webhook";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router: Router = Router();

const createSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).default(["payment.success", "payment.failed"]),
});

router.use(authenticateToken);

/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: List webhooks
 *     tags: [Webhook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Webhooks }
 */
router.get("/", async (req: AuthRequest, res) => {
  try {
    const webhooks = await WebhookService.list(req.merchant!.id);
    res.json(webhooks);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Create webhook
 *     tags: [Webhook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201: { description: Created }
 */
router.post("/", async (req: AuthRequest, res) => {
  try {
    const data = createSchema.parse(req.body);
    const result = await WebhookService.create(req.merchant!.id, data.url, data.events);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks/:id:
 *   put:
 *     summary: Update webhook
 *     tags: [Webhook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Updated }
 */
router.put("/:id", async (req: AuthRequest, res) => {
  try {
    const data = createSchema.partial().parse(req.body);
    const result = await WebhookService.update(req.merchant!.id, req.params.id, data);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks/:id:
 *   delete:
 *     summary: Delete webhook
 *     tags: [Webhook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Deleted }
 */
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    await WebhookService.delete(req.merchant!.id, req.params.id);
    res.json({ message: "Deleted" });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/webhooks/:id/logs:
 *   get:
 *     summary: Get webhook logs
 *     tags: [Webhook]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Logs }
 */
router.get("/:id/logs", async (req: AuthRequest, res) => {
  try {
    const logs = await WebhookService.getLogs(req.merchant!.id, req.params.id);
    res.json(logs);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export { router as webhookRouter };
