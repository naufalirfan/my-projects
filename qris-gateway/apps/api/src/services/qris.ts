import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";

export interface QrisPayload {
  merchantId: string;
  merchantName: string;
  amount: number;
  reference: string;
  description?: string;
}

export interface QrisTag {
  id: string;
  length: string;
  value: string;
  children?: QrisTag[];
}

// EMV QRIS Standard Tags
const TAGS = {
  ROOT: "00",
  POINT_OF_INITIATION: "01",
  MERCHANT_ACCOUNT: "29",
  MERCHANT_CATEGORY: "52",
  TRANSACTION_CURRENCY: "53",
  TRANSACTION_AMOUNT: "54",
  COUNTRY_CODE: "58",
  MERCHANT_NAME: "59",
  MERCHANT_CITY: "60",
  ADDITIONAL_DATA: "62",
  CRC: "63",
};

const QRIS_MERCHANT_ACCOUNT_TEMPLATE = "0011ID.CO.QRIS.WWW011893600012345678901234560215ID1020000000003030510901";

export class QrisService {
  private static calculateCRC(data: string): string {
    let crc = 0xffff;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = ((crc << 1) ^ polynomial) & 0xffff;
        } else {
          crc = (crc << 1) & 0xffff;
        }
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, "0");
  }

  private static formatTag(id: string, value: string): string {
    const length = value.length.toString().padStart(2, "0");
    return `${id}${length}${value}`;
  }

  private static buildMerchantAccount(
    merchantId: string,
    merchantName: string
  ): string {
    const template = QRIS_MERCHANT_ACCOUNT_TEMPLATE;
    const tag00 = this.formatTag("00", "ID.CO.QRIS.WWW");
    const tag01 = this.formatTag("01", `936000${merchantId}`);

    return this.formatTag("29", tag00 + tag01);
  }

  static async generate(payload: QrisPayload): Promise<{
    qrString: string;
    qrDataUrl: string;
    reference: string;
  }> {
    const reference = payload.reference || uuidv4();

    // Build EMV QRIS data
    let qrData = "";

    // Tag 00: Payload Format Indicator
    qrData += this.formatTag("00", "01");

    // Tag 01: Point of Initiation Method (12 = dynamic QR)
    qrData += this.formatTag("01", "12");

    // Tag 29: Merchant Account Information
    const merchantAccount = this.buildMerchantAccount(
      payload.merchantId,
      payload.merchantName
    );
    qrData += merchantAccount;

    // Tag 52: Merchant Category Code
    qrData += this.formatTag("52", "0000");

    // Tag 53: Transaction Currency (IDR)
    qrData += this.formatTag("53", "360");

    // Tag 54: Transaction Amount
    qrData += this.formatTag("54", payload.amount.toFixed(2));

    // Tag 58: Country Code
    qrData += this.formatTag("58", "ID");

    // Tag 59: Merchant Name
    qrData += this.formatTag("59", payload.merchantName.substring(0, 25));

    // Tag 60: Merchant City
    qrData += this.formatTag("60", "JAKARTA");

    // Tag 62: Additional Data
    const tag62 = this.formatTag("01", reference);
    qrData += this.formatTag("62", tag62);

    // Calculate CRC (placeholder - actual CRC at end)
    const crcData = qrData + "6304";
    const crc = this.calculateCRC(crcData);
    qrData += `6304${crc}`;

    // Generate QR Code
    const qrDataUrl = await QRCode.toDataURL(qrData, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    return {
      qrString: qrData,
      qrDataUrl,
      reference,
    };
  }

  static parseQrisData(qrisString: string): Record<string, any> {
    const result: Record<string, any> = {};
    let pos = 0;

    while (pos < qrisString.length - 4) {
      const tagId = qrisString.substring(pos, pos + 2);
      const length = parseInt(qrisString.substring(pos + 2, pos + 4));
      const value = qrisString.substring(pos + 4, pos + 4 + length);

      result[tagId] = value;
      pos += 4 + length;
    }

    return result;
  }
}
