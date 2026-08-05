import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import { authRouter } from "./routes/auth";
import { merchantRouter } from "./routes/merchant";
import { transactionRouter } from "./routes/transaction";
import { webhookRouter } from "./routes/webhook";
import { settlementRouter } from "./routes/settlement";
import { qrisRouter } from "./routes/qris";
import { PollerJob } from "./jobs/poller";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "QRIS Payment Gateway API",
      version: "1.0.0",
      description: "Payment Gateway API for QRIS payments",
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
        apiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "X-API-Key",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use("/api/auth", authRouter);
app.use("/api/merchants", merchantRouter);
app.use("/api/transactions", transactionRouter);
app.use("/api/webhooks", webhookRouter);
app.use("/api/settlements", settlementRouter);
app.use("/api/qris", qrisRouter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 QRIS Gateway API running on port ${PORT}`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api-docs`);

  // Start QRIS status poller
  PollerJob.start();
});

export default app;
