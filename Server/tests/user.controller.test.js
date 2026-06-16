const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createResponse,
  createSpy,
  loadModuleWithMocks,
} = require("./helpers/controller-test-utils");

const controllerPath = path.join(__dirname, "../src/controllers/user.controller.js");

test("createUser creates an inactive user when isActive is false", async () => {
  const createdUser = {
    _id: "507f1f77bcf86cd799439071",
    id: "507f1f77bcf86cd799439071",
    name: "Dana Recruiter",
    email: "dana@example.com",
    role: "recruiter",
    isActive: false,
    createdAt: new Date("2026-06-16T08:00:00Z"),
    updatedAt: new Date("2026-06-16T08:00:00Z"),
  };

  const findOne = createSpy(async () => null);
  const create = createSpy(async (payload) => ({
    ...createdUser,
    ...payload,
    _id: createdUser._id,
    id: createdUser.id,
    createdAt: createdUser.createdAt,
    updatedAt: createdUser.updatedAt,
  }));
  const createAuditLog = createSpy(async () => undefined);

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/User": {
      findOne,
      create,
    },
    "../models/RefreshToken": {
      updateMany: createSpy(async () => ({ modifiedCount: 0 })),
    },
    "../utils/auth": {
      sanitizeUser: (user) => ({
        id: user._id || user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive !== false,
      }),
    },
    "../services/audit.service": { createAuditLog },
    "../services/workspace-settings.service": {
      getSecuritySettings: createSpy(async () => ({
        passwordMinLength: 6,
        requireStrongPasswords: false,
      })),
      validatePasswordAgainstPolicy: createSpy(() => null),
    },
  });

  try {
    const req = {
      body: {
        name: "Dana Recruiter",
        email: "dana@example.com",
        password: "ChangeMe123!",
        role: "recruiter",
        isActive: false,
      },
      user: {
        id: "507f1f77bcf86cd799439070",
      },
    };
    const res = createResponse();

    await loaded.createUser(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(create.calls.length, 1);
    assert.equal(create.calls[0][0].isActive, false);
    assert.equal(res.body.user.isActive, false);
    assert.equal(res.body.user.status, "inactive");
  } finally {
    restore();
  }
});

test("createUser rejects passwords that fail the shared workspace password policy", async () => {
  const validatePasswordAgainstPolicy = createSpy(() => "Password must be at least 10 characters");

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/User": {
      findOne: createSpy(async () => null),
      create: createSpy(async () => null),
    },
    "../models/RefreshToken": {
      updateMany: createSpy(async () => ({ modifiedCount: 0 })),
    },
    "../utils/auth": {
      sanitizeUser: (user) => user,
    },
    "../services/audit.service": { createAuditLog: createSpy(async () => undefined) },
    "../services/workspace-settings.service": {
      getSecuritySettings: createSpy(async () => ({
        passwordMinLength: 10,
        requireStrongPasswords: false,
      })),
      validatePasswordAgainstPolicy,
    },
  });

  try {
    const req = {
      body: {
        name: "Dana Recruiter",
        email: "dana@example.com",
        password: "short",
        role: "recruiter",
      },
      user: {
        id: "507f1f77bcf86cd799439070",
      },
    };
    const res = createResponse();

    await loaded.createUser(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, "Password must be at least 10 characters");
    assert.equal(res.body.errors[0].field, "password");
  } finally {
    restore();
  }
});
