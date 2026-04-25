import request from "supertest";
import app from "../app";
import mongoose from "mongoose";
import { User } from "../models";
import { Job } from "../models";

let recruiterToken: string;

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI!);

  const res = await request(app).post("/api/v1/auth/register").send({
    name: "Recruiter Test",     // ← name not firstName/lastName
    email: "recruiter@test.com",
    password: "Password1234!",
    role: "recruiter",
  });

  recruiterToken = res.body.data.token;
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

afterEach(async () => {
  await Job.deleteMany({});
});

const jobPayload = {
  title: "Senior Backend Engineer",
  description: "Build scalable APIs",
  requirements: "5+ years experience",
  requiredSkills: ["Node.js", "TypeScript", "MongoDB"],  // ← requiredSkills not skills
  requiredExperience: 5,                                  // ← requiredExperience not experienceYears
  location: "Kigali, Rwanda",                             // ← required field
  type: "Full-time",                                      // ← required field
};

describe("Jobs — happy cases", () => {
  it("POST /api/v1/jobs — creates a job", async () => {
    const res = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send(jobPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Senior Backend Engineer");
  });

it("GET /api/v1/jobs — lists jobs", async () => {
  await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${recruiterToken}`)
    .send(jobPayload);

  const res = await request(app)
    .get("/api/v1/jobs")
    .set("Authorization", `Bearer ${recruiterToken}`);

  expect(res.status).toBe(200);
  expect(res.body.data.items.length).toBeGreaterThan(0); // ← items
  expect(res.body.data.meta.total).toBeGreaterThan(0);   // ← can also assert meta
});

  it("GET /api/v1/jobs/:id — returns a single job", async () => {
    const created = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send(jobPayload);

    const jobId = created.body.data._id;

    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(jobId);
  });

it("PUT /api/v1/jobs/:id — updates a job", async () => {
  const created = await request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${recruiterToken}`)
    .send(jobPayload);

  const jobId = created.body.data._id;

  const res = await request(app)
    .put(`/api/v1/jobs/${jobId}`)
    .set("Authorization", `Bearer ${recruiterToken}`)
    .send({ ...jobPayload, title: "Lead Backend Engineer" }); // ← send full payload

  expect(res.status).toBe(200);
  expect(res.body.data.title).toBe("Lead Backend Engineer");
});

  it("DELETE /api/v1/jobs/:id — deletes a job", async () => {
    const created = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${recruiterToken}`)
      .send(jobPayload);

    const jobId = created.body.data._id;

    const res = await request(app)
      .delete(`/api/v1/jobs/${jobId}`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(res.status).toBe(200);
  });

  it("GET /api/v1/jobs/:id — returns 404 for non-existent job", async () => {
    const fakeId = new mongoose.Types.ObjectId();

    const res = await request(app)
      .get(`/api/v1/jobs/${fakeId}`)
      .set("Authorization", `Bearer ${recruiterToken}`);

    expect(res.status).toBe(404);
  });
});