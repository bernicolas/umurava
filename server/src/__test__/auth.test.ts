import request from "supertest";
import app from "../app";
import mongoose from "mongoose";
import { User } from "../models";

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await User.deleteMany({});
});

describe("Auth — happy cases", () => {
  it("POST /api/v1/auth/register — creates a new user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "John Doe",        // ← name not firstName/lastName
        email: "john@example.com",
        password: "Password1234!",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty("token");
    expect(res.body.data.user.email).toBe("john@example.com");
  });

  it("POST /api/v1/auth/login — logs in with valid credentials", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "Password1234!",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "john@example.com",
      password: "Password1234!",
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty("token");
  });

  it("POST /api/v1/auth/login — rejects wrong password", async () => {
    await request(app).post("/api/v1/auth/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "Password1234!",
    });

    const res = await request(app).post("/api/v1/auth/login").send({
      email: "john@example.com",
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
  });

  it("GET /api/v1/auth/me — returns current user with valid token", async () => {
    const register = await request(app).post("/api/v1/auth/register").send({
      name: "John Doe",
      email: "john@example.com",
      password: "Password1234!",
    });

    const token = register.body.data.token;

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("john@example.com");
  });

  it("GET /api/v1/auth/me — rejects request with no token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });
});