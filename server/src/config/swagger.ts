import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Umurava HR API",
      version: "1.0.0",
      description:
        "AI-Powered Talent Screening Platform — API Documentation",
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Local development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            _id: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string", format: "email" },
            role: {
              type: "string",
              enum: ["candidate", "recruiter", "admin"],
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        AuthResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { $ref: "#/components/schemas/User" },
          },
        },
        Job: {
          type: "object",
          properties: {
            _id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            requirements: { type: "string" },
            skills: {
              type: "array",
              items: { type: "string" },
            },
            experienceYears: { type: "number" },
            createdBy: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Applicant: {
          type: "object",
          properties: {
            _id: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            email: { type: "string" },
            skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  level: {
                    type: "string",
                    enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
                  },
                  yearsOfExperience: { type: "number" },
                },
              },
            },
          },
        },
        ScreeningResult: {
          type: "object",
          properties: {
            _id: { type: "string" },
            jobId: { type: "string" },
            shortlist: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rank: { type: "number" },
                  applicantId: { type: "string" },
                  matchScore: { type: "number" },
                  strengths: {
                    type: "array",
                    items: { type: "string" },
                  },
                  gaps: {
                    type: "array",
                    items: { type: "string" },
                  },
                  recommendation: { type: "string" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);