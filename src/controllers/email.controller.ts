import { Request, Response } from "express";
import { EmailService } from "../services/email.service";

export class EmailController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  /**
   * @openapi
   * /emails/send:
   *   post:
   *     tags:
   *       - Emails
   *     summary: Sends e-mails from registered list
   *     responses:
   *       201:
   *         description: E-mails sent sucessfully
   */
  sendEmails = async (req: Request, res: Response) => {
    try {
      await this.emailService.saveEmails();
      await this.emailService.sendEmails();
      res.status(201).json({ message: "Emails sucessfully sent" });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Error" });
    }
  };
}
