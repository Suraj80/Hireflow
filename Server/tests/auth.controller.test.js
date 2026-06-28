const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createQuery,
  createResponse,
  createSpy,
  loadModuleWithMocks,
} = require("./helpers/controller-test-utils");

const controllerPath = path.join(__dirname, "../src/controllers/auth.controller.js");

test("updateMe allows the signed-in user to update their email", async () => {
  const save = createSpy(async () => user);
  const user = {
    _id: "507f1f77bcf86cd799439011",
    name: "Alex Morgan",
    email: "alex@example.com",
    isActive: true,
    comparePassword: createSpy(async () => true),
    save,
  };

  const createAuditLog = createSpy(async () => undefined);

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/User": {
      findById: createSpy(() => createQuery(user)),
      findOne: createSpy(async () => null),
      create: createSpy(async () => null),
    },
    "../models/RefreshToken": {
      create: createSpy(async () => null),
      findOne: createSpy(async () => null),
      findByIdAndUpdate: createSpy(async () => null),
      updateMany: createSpy(async () => ({ modifiedCount: 0 })),
      findOneAndUpdate: createSpy(async () => null),
    },
    "../utils/auth": {
      REFRESH_TOKEN_COOKIE_NAME: "refreshToken",
      generateTokenId: createSpy(() => "token-id"),
      getRefreshCookieOptions: createSpy(() => ({})),
      getRefreshTokenExpiryDate: createSpy(() => new Date()),
      hashToken: createSpy((token) => token),
      sanitizeUser: (value) => ({
        id: value._id,
        name: value.name,
        email: value.email,
        role: value.role,
        isActive: value.isActive !== false,
        createdAt: value.createdAt || null,
        lastLoginAt: value.lastLoginAt || null,
      }),
      signAccessToken: createSpy(() => "access-token"),
      signRefreshToken: createSpy(() => "refresh-token"),
      verifyRefreshToken: createSpy(() => ({ id: "id" })),
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
        name: "Alex Morgan",
        email: "Alex.New@Example.com",
      },
      user: {
        id: "507f1f77bcf86cd799439011",
      },
    };
    const res = createResponse();

    await loaded.updateMe(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(save.calls.length, 1);
    assert.equal(user.email, "alex.new@example.com");
    assert.equal(res.body.user.email, "alex.new@example.com");
    assert.equal(createAuditLog.calls.length, 1);
  } finally {
    restore();
  }
});

test("updateMe rejects duplicate emails", async () => {
  const user = {
    _id: "507f1f77bcf86cd799439011",
    name: "Alex Morgan",
    email: "alex@example.com",
    isActive: true,
    comparePassword: createSpy(async () => true),
    save: createSpy(async () => user),
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/User": {
      findById: createSpy(() => createQuery(user)),
      findOne: createSpy(() => createQuery({ _id: "507f1f77bcf86cd799439099", email: "taken@example.com" })),
      create: createSpy(async () => null),
    },
    "../models/RefreshToken": {
      create: createSpy(async () => null),
      findOne: createSpy(async () => null),
      findByIdAndUpdate: createSpy(async () => null),
      updateMany: createSpy(async () => ({ modifiedCount: 0 })),
      findOneAndUpdate: createSpy(async () => null),
    },
    "../utils/auth": {
      REFRESH_TOKEN_COOKIE_NAME: "refreshToken",
      generateTokenId: createSpy(() => "token-id"),
      getRefreshCookieOptions: createSpy(() => ({})),
      getRefreshTokenExpiryDate: createSpy(() => new Date()),
      hashToken: createSpy((token) => token),
      sanitizeUser: (value) => value,
      signAccessToken: createSpy(() => "access-token"),
      signRefreshToken: createSpy(() => "refresh-token"),
      verifyRefreshToken: createSpy(() => ({ id: "id" })),
    },
    "../services/audit.service": { createAuditLog: createSpy(async () => undefined) },
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
        name: "Alex Morgan",
        email: "taken@example.com",
      },
      user: {
        id: "507f1f77bcf86cd799439011",
      },
    };
    const res = createResponse();

    await loaded.updateMe(req, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.message, "A user with this email already exists");
    assert.equal(user.email, "alex@example.com");
    assert.equal(user.save.calls.length, 0);
  } finally {
    restore();
  }
});

test("updateMe rejects a wrong current password when changing password", async () => {
  const user = {
    _id: "507f1f77bcf86cd799439011",
    name: "Alex Morgan",
    email: "alex@example.com",
    isActive: true,
    comparePassword: createSpy(async (candidatePassword) => candidatePassword === "correct-password"),
    save: createSpy(async () => user),
  };

  const { loaded, restore } = loadModuleWithMocks(controllerPath, {
    "../models/User": {
      findById: createSpy(() => createQuery(user)),
      findOne: createSpy(async () => null),
      create: createSpy(async () => null),
    },
    "../models/RefreshToken": {
      create: createSpy(async () => null),
      findOne: createSpy(async () => null),
      findByIdAndUpdate: createSpy(async () => null),
      updateMany: createSpy(async () => ({ modifiedCount: 0 })),
      findOneAndUpdate: createSpy(async () => null),
    },
    "../utils/auth": {
      REFRESH_TOKEN_COOKIE_NAME: "refreshToken",
      generateTokenId: createSpy(() => "token-id"),
      getRefreshCookieOptions: createSpy(() => ({})),
      getRefreshTokenExpiryDate: createSpy(() => new Date()),
      hashToken: createSpy((token) => token),
      sanitizeUser: (value) => value,
      signAccessToken: createSpy(() => "access-token"),
      signRefreshToken: createSpy(() => "refresh-token"),
      verifyRefreshToken: createSpy(() => ({ id: "id" })),
    },
    "../services/audit.service": { createAuditLog: createSpy(async () => undefined) },
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
        name: "Alex Morgan",
        email: "alex@example.com",
        currentPassword: "wrong-password",
        newPassword: "new-password",
      },
      user: {
        id: "507f1f77bcf86cd799439011",
      },
    };
    const res = createResponse();

    await loaded.updateMe(req, res);

    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, "Current password is incorrect");
    assert.equal(user.save.calls.length, 0);
  } finally {
    restore();
  }
});
