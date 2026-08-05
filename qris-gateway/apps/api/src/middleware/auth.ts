import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthRequest extends Request {
  merchant?: {
    id: string;
    email: string;
    name: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { merchantId: string };
    const merchant = await prisma.merchant.findUnique({
      where: { id: decoded.merchantId },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!merchant || merchant.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid or inactive merchant" });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

export const authenticateApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string;

  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    const merchant = await prisma.merchant.findUnique({
      where: { apiKey },
      select: { id: true, email: true, name: true, status: true },
    });

    if (!merchant || merchant.status !== "ACTIVE") {
      return res.status(401).json({ error: "Invalid or inactive merchant" });
    }

    req.merchant = merchant;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid API key" });
  }
};

export const generateToken = (merchantId: string): string => {
  return jwt.sign({ merchantId }, JWT_SECRET, { expiresIn: "24h" });
};
