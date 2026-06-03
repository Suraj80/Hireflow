const Department = require("../models/Department");
const Job = require("../models/Job");

const normalizeName = (value) => String(value || "").trim();
const normalizeKey = (value) => normalizeName(value).toLowerCase();

const buildDepartmentResponse = (department, options = {}) => ({
  id: String(department._id ?? options.id ?? normalizeKey(department.name)),
  name: department.name,
  isActive: options.isActive ?? department.isActive ?? true,
  isLegacy: options.isLegacy ?? false,
  createdAt: department.createdAt || null,
  updatedAt: department.updatedAt || null,
});

const getMergedDepartments = async ({ includeInactive = false } = {}) => {
  const [storedDepartments, legacyDepartmentNames] = await Promise.all([
    Department.find(includeInactive ? {} : { isActive: true }).sort({ name: 1 }),
    Job.distinct("department", { archived: false }),
  ]);

  const byKey = new Map();

  storedDepartments.forEach((department) => {
    byKey.set(normalizeKey(department.name), buildDepartmentResponse(department));
  });

  legacyDepartmentNames
    .map((name) => normalizeName(name))
    .filter(Boolean)
    .forEach((name) => {
      const key = normalizeKey(name);
      if (!byKey.has(key)) {
        byKey.set(
          key,
          buildDepartmentResponse(
            { name },
            {
              id: `legacy-${key}`,
              isActive: true,
              isLegacy: true,
            }
          )
        );
      }
    });

  return Array.from(byKey.values()).sort((left, right) => left.name.localeCompare(right.name));
};

const getDepartments = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true" && req.user?.role === "admin";
    const items = await getMergedDepartments({ includeInactive });

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const createDepartment = async (req, res) => {
  try {
    const name = normalizeName(req.body.name);

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: "Department name must be between 2 and 80 characters" });
    }

    const existing = await Department.findOne({ name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (existing) {
      return res.status(409).json({ message: "A department with this name already exists" });
    }

    const department = await Department.create({
      name,
      createdBy: req.user.id,
      updatedBy: req.user.id,
    });

    return res.status(201).json({
      message: "Department created successfully",
      item: buildDepartmentResponse(department),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({ message: "Department not found" });
    }

    const nextName = typeof req.body.name === "string" ? normalizeName(req.body.name) : department.name;
    const nextIsActive =
      typeof req.body.isActive === "boolean" ? req.body.isActive : department.isActive;

    if (nextName.length < 2 || nextName.length > 80) {
      return res.status(400).json({ message: "Department name must be between 2 and 80 characters" });
    }

    const duplicate = await Department.findOne({
      _id: { $ne: department._id },
      name: new RegExp(`^${nextName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });

    if (duplicate) {
      return res.status(409).json({ message: "A department with this name already exists" });
    }

    department.name = nextName;
    department.isActive = nextIsActive;
    department.updatedBy = req.user.id;
    await department.save();

    return res.status(200).json({
      message: "Department updated successfully",
      item: buildDepartmentResponse(department),
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getMergedDepartments,
  updateDepartment,
};
