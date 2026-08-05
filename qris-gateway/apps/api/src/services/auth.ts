import { prisma } from "../utils/prisma";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { generateToken } from "../middleware/auth";

export interface RegisterInput {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.merchant.findUnique({
      where: { email: input.email },
    });

    if (existing) {
      throw new Error("Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const apiKey = uuidv4();
    const secretKey = uuidv4();

    const merchant = await prisma.merchant.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        apiKey,
        secretKey,
      },
    });

    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey,
      secretKey: merchant.secretKey,
      token: generateToken(merchant.id),
    };
  }

  static async login(input: LoginInput) {
    const merchant = await prisma.merchant.findUnique({
      where: { email: input.email },
    });

    if (!merchant) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(input.password, merchant.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    if (merchant.status !== "ACTIVE") {
      throw new Error("Account is not active");
    }

    return {
      id: merchant.id,
      name: merchant.name,
      email: merchant.email,
      apiKey: merchant.apiKey,
      token: generateToken(merchant.id),
    };
  }

  static async getProfile(merchantId: string) {
    return prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        apiKey: true,
        status: true,
        createdAt: true,
      },
    });
  }

  static async regenerateApiKey(merchantId: string) {
    const newApiKey = uuidv4();
    await prisma.merchant.update({
      where: { id: merchantId },
      data: { apiKey: newApiKey },
    });
    return newApiKey;
  }
}
