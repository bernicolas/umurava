import request from "supertest";
import app from "../app";
import mongoose from "mongoose";

let recruiterToken: string;
let jobId: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const res = await request(app).post("/api/v1/auth/register").send({
    name: "Screener Test",      // ← name not firstName/lastName
    email: "screener@test.com",
    password: "Password1234!",
    role: "recruiter",
  });

  recruiterToken = res.body.data.token;

  const job = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${recruiterToken}`)
    .send({
      title: "Frontend Engineer",
      description: "Build UIs",
      requirements: "3+ years",
      requiredSkills: ["React", "TypeScript"],   // ← requiredSkills
      requiredExperience: 3,                      // ← requiredExperience
      location: "Kigali, Rwanda",                 // ← required
      type: "Full-time",                          // ← required
    });

  jobId = job.body.data._id;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe("Screening — happy cases", () => {
  it("POST /api/v1/jobs/:jobId/applicants/platform — adds structured applicants", async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/applicants/platform`)
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send({
        profiles: [
  {
    firstName: "Alice",
    lastName: "Smith",
    email: "alice@test.com",
    headline: "Frontend Developer",        // ← add this
    location: "Kigali, Rwanda",            // ← add this
    skills: [{ name: "React", level: "Expert", yearsOfExperience: 4 }],
       experience: [],        // ← was workExperience
    education: [],
    projects: [],
    availability: { status: "Available", type: "Full-time" },   
  },
],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it("GET /api/v1/jobs/:jobId/applicants — lists applicants for job", async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}/applicants`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(res.status).toBe(200);
  });

  it("GET /api/v1/jobs/:jobId/screening/history — returns screening history", async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}/screening/history`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(res.status).toBe(200);
  });
});