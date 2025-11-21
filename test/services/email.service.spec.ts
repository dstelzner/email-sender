import axios from "axios";
import fs from "fs";
import { EmailService } from "../../src/services/email.service";
import { getCsvRows } from "../../src/utils/csv.utils";

jest.mock("axios");
jest.mock("fs");
jest.mock("../../src/utils/csv.utils");

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedFs = fs as unknown as jest.Mocked<typeof fs>;
const mockedGetCsvRows = getCsvRows as jest.MockedFunction<typeof getCsvRows>;

describe("EmailService", () => {
  let service: EmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailService();
  });

  test("saveEmails should read CSV and write JSON", async () => {
    mockedGetCsvRows.mockResolvedValue(["a@test.com", "b@test.com"]);
    mockedFs.promises = {
      writeFile: jest.fn().mockResolvedValue(undefined),
    } as any;

    await service.saveEmails();

    expect(mockedGetCsvRows).toHaveBeenCalledWith("mailing_list.csv");
    expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
      "mailing_list.json",
      JSON.stringify({ emails: ["a@test.com", "b@test.com"] }),
      "utf-8",
    );
  });

  test("isValidEmail should validate correctly", () => {
    expect(service["isValidEmail"]("valid@mail.com")).toBe(true);
    expect(service["isValidEmail"]("invalid")).toBe(false);
    expect(service["isValidEmail"]("@test.com")).toBe(false);
    expect(service["isValidEmail"]("abc@test")).toBe(false);
  });

  test("generateToken should return 6 digit numeric string", () => {
    const token = service["generateToken"]();
    expect(token).toMatch(/^[0-9]{6}$/);
  });

  test("getToken should return stored token if not expired", async () => {
    service["token"] = "SAVED_TOKEN";
    service["tokenExpiresAt"] = Date.now() + 10000;

    const token = await service["getToken"]();
    expect(token).toBe("SAVED_TOKEN");
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  test("getToken should request new token if expired", async () => {
    service["token"] = "OLD_TOKEN";
    service["tokenExpiresAt"] = Date.now() - 1000;

    mockedAxios.post.mockResolvedValue({
      data: { access_token: "NEW_TOKEN" },
    });

    const token = await service["getToken"]();

    expect(token).toBe("NEW_TOKEN");
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://email-test-api-475816.ue.r.appspot.com/auth/token",
      {
        username: "cnx_test",
        password: "cnx_password_2025!",
      },
    );
  });

  test("sendSingleEmail should send email successfully", async () => {
    mockedAxios.post.mockResolvedValue({});

    // sobrescreve temporariamente getToken()
    jest.spyOn(service as any, "getToken").mockResolvedValue("FAKE_TOKEN");

    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    await (service as any).sendSingleEmail("test@mail.com");

    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://email-test-api-475816.ue.r.appspot.com/send-email",
      expect.any(Object),
      expect.objectContaining({
        headers: { Authorization: "Bearer FAKE_TOKEN" },
      }),
    );

    expect(logSpy).toHaveBeenCalledWith("E-mail sent: test@mail.com");
  });

  test("sendSingleEmail should retry when rate limited (429)", async () => {
    jest.spyOn(service as any, "getToken").mockResolvedValue("FAKE_TOKEN");

    mockedAxios.post
      .mockRejectedValueOnce({ response: { status: 429 } })
      .mockResolvedValueOnce({});

    const sleepSpy = jest
      .spyOn(service as any, "sleep")
      .mockResolvedValue(undefined);

    await (service as any).sendSingleEmail("test@mail.com");

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalled(); // esperou entre tentativas
  });

  test("sendEmails should send emails filtered and in sequence", async () => {
    mockedFs.promises = {
      readFile: jest.fn().mockResolvedValue(
        JSON.stringify({
          emails: ["valid@mail.com", "invalid", "another@mail.com"],
        }),
      ),
    } as any;

    jest.spyOn(service as any, "sendSingleEmail").mockResolvedValue(undefined);
    jest.spyOn(service as any, "sleep").mockResolvedValue(undefined);

    await service.sendEmails();

    expect(service["sendSingleEmail"]).toHaveBeenCalledTimes(2);
    expect(service["sendSingleEmail"]).toHaveBeenCalledWith("valid@mail.com");
    expect(service["sendSingleEmail"]).toHaveBeenCalledWith("another@mail.com");
  });
});
