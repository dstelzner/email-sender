import { EmailController } from "../../src/controllers/email.controller";
import { EmailService } from "../../src/services/email.service";

jest.mock("../../src/services/email.service");

describe("EmailController (unit tests, no supertest)", () => {
  let controller: EmailController;
  let mockService: jest.Mocked<EmailService>;
  let mockReq: any;
  let mockRes: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      saveEmails: jest.fn().mockResolvedValue(undefined),
      sendEmails: jest.fn().mockResolvedValue(undefined),
    } as any;

    (EmailService as any).mockImplementation(() => mockService);

    controller = new EmailController();

    mockReq = {};

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test("should return 201 on success", async () => {
    await controller.sendEmails(mockReq, mockRes);

    expect(mockService.saveEmails).toHaveBeenCalledTimes(1);
    expect(mockService.sendEmails).toHaveBeenCalledTimes(1);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Emails sucessfully sent",
    });
  });

  test("should return 500 when an exception occurs", async () => {
    mockService.saveEmails.mockRejectedValueOnce(new Error("Any error"));

    await controller.sendEmails(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ message: "Error" });
  });
});
