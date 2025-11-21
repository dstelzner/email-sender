import axios from "axios";
import { getCsvRows } from "../utils/csv.utils";
import fs from "fs";

export class EmailService {
  private readonly EMAILS_CSV_PATH = "mailing_list.csv";
  private readonly EMAILS_JSON_PATH = "mailing_list.json";
  private readonly STATIC_USERNAME = "cnx_test";
  private readonly STATIC_PASSWORD = "cnx_password_2025!";
  private readonly BASE_URL = "https://email-test-api-475816.ue.r.appspot.com";

  private readonly MAX_RETRIES = 3;
  private readonly RATE_LIMIT_WAIT = 10_000;
  private readonly BETWEEN_EMAILS_WAIT = 10_000;

  private token: string | null = null;
  private tokenExpiresAt: number | null = null;

  async saveEmails() {
    const emails = await getCsvRows(this.EMAILS_CSV_PATH);
    await fs.promises.writeFile(
      this.EMAILS_JSON_PATH,
      JSON.stringify({ emails }),
      "utf-8",
    );
  }

  async sendEmails() {
    const json = await fs.promises.readFile(this.EMAILS_JSON_PATH, "utf-8");
    const { emails } = JSON.parse(json);

    const validEmails = emails.filter(this.isValidEmail);

    for (const email of validEmails) {
      await this.sendSingleEmail(email);
      await this.sleep(this.BETWEEN_EMAILS_WAIT);
    }
  }

  private async sendSingleEmail(email: string) {
    let attempts = 0;

    while (attempts < this.MAX_RETRIES) {
      const token = await this.getToken();
      const payload = this.createEmailPayload(email, token);

      try {
        await axios.post(`${this.BASE_URL}/send-email`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log(`E-mail sent: ${email}`);
        return;
      } catch (err: any) {
        attempts++;
        const status = err.response?.status;

        await this.handleSendError(status, attempts, email);
      }
    }

    console.error(`Definite error sending e-mail ${email}`);
  }

  private createEmailPayload(email: string, token: string) {
    return {
      to: email,
      subject: "Complete your registration",
      body: `Thank you for signing up. Please verify your ${token} to continue.`,
    };
  }

  private async handleSendError(
    status: number | undefined,
    attempts: number,
    email: string,
  ) {
    if (status === 429) {
      console.warn(`Rate limit hit. Trying again...`);
      await this.sleep(this.RATE_LIMIT_WAIT);
      return;
    }

    if (attempts < this.MAX_RETRIES) {
      console.warn(`Error sending e-mail. Trying again...`);
      await this.sleep(this.RATE_LIMIT_WAIT);
      return;
    }
  }

  private async getToken() {
    const now = Date.now();

    if (this.token && this.tokenExpiresAt && now < this.tokenExpiresAt) {
      return this.token;
    }

    return await this.generateAuthorizationToken();
  }

  private async generateAuthorizationToken() {
    const body = {
      username: this.STATIC_USERNAME,
      password: this.STATIC_PASSWORD,
    };

    const res = await axios.post(`${this.BASE_URL}/auth/token`, body);
    return res.data.access_token;
  }

  private isValidEmail(email: string) {
    return /^[\w.+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
  }

  private sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
  }

  private generateToken(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
