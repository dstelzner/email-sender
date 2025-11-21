import express from "express";
import { EmailController } from "../controllers/email.controller";

const router = express.Router();
const emailController = new EmailController();

router.post("/send", (req, res) => emailController.sendEmails(req, res));

export default router;
