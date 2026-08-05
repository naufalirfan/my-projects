import axios from "axios";

const BASE_URL = "https://qris.interactive.co.id/restapi/qris";
const APIKEY = process.env.INTERACTIVE_APIKEY || "";
const MID = process.env.INTERACTIVE_MID || "";

export interface CreateInvoiceParams {
  cliTrxNumber: string;
  cliTrxAmount: number;
  useTip?: "yes" | "no";
}

export interface CreateInvoiceResponse {
  qris_content: string;
  qris_request_date: string;
  qris_invoiceid: string;
  qris_nmid: string;
}

export interface CheckStatusParams {
  invid: string;
  trxvalue: number;
  trxdate: string; // YYYY-mm-dd
}

export interface CheckStatusResponse {
  qris_status: "paid" | "unpaid";
  qris_payment_customername?: string;
  qris_payment_methodby?: string;
}

export class InteractiveQrisService {
  static isConfigured(): boolean {
    return !!APIKEY && !!MID;
  }

  static async createInvoice(
    params: CreateInvoiceParams
  ): Promise<CreateInvoiceResponse> {
    if (!this.isConfigured()) {
      throw new Error("InterActive QRIS not configured (APIKEY/MID missing)");
    }

    const response = await axios.get(`${BASE_URL}/show_qris.php`, {
      params: {
        do: "create-invoice",
        apikey: APIKEY,
        mID: MID,
        cliTrxNumber: params.cliTrxNumber,
        cliTrxAmount: params.cliTrxAmount,
        useTip: params.useTip || "no",
      },
      timeout: 30000,
    });

    const body = response.data;
    if (body.status !== "success") {
      throw new Error(
        `InterActive QRIS: ${body.data?.qris_status || "create invoice failed"}`
      );
    }

    return {
      qris_content: body.data.qris_content,
      qris_request_date: body.data.qris_request_date,
      qris_invoiceid: body.data.qris_invoiceid,
      qris_nmid: body.data.qris_nmid,
    };
  }

  static async checkStatus(
    params: CheckStatusParams
  ): Promise<CheckStatusResponse> {
    if (!this.isConfigured()) {
      throw new Error("InterActive QRIS not configured (APIKEY/MID missing)");
    }

    const response = await axios.get(`${BASE_URL}/checkpaid_qris.php`, {
      params: {
        do: "checkStatus",
        apikey: APIKEY,
        mID: MID,
        invid: params.invid,
        trxvalue: params.trxvalue,
        trxdate: params.trxdate,
      },
      timeout: 15000,
    });

    const body = response.data;
    if (body.status !== "success") {
      return { qris_status: "unpaid" };
    }

    return {
      qris_status: body.data.qris_status === "paid" ? "paid" : "unpaid",
      qris_payment_customername: body.data.qris_payment_customername,
      qris_payment_methodby: body.data.qris_payment_methodby,
    };
  }
}
