const Candidate = require("../models/Candidate");

const createCandidate = async (req, res) => {
  try {
    const { name, email, phone, resume, skills, appliedJob } = req.body;

    if (!name || !email || !appliedJob) {
      return res.status(400).json({ message: "Name, email and appliedJob are required" });
    }

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      resume,
      skills: Array.isArray(skills) ? skills : [],
      appliedJob,
    });

    return res.status(201).json(candidate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getCandidates = async (_req, res) => {
  try {
    const candidates = await Candidate.find()
      .populate("appliedJob", "title department location")
      .sort({ createdAt: -1 });
    return res.status(200).json(candidates);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    Object.assign(candidate, req.body);
    await candidate.save();

    return res.status(200).json(candidate);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteCandidate = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await candidate.deleteOne();
    return res.status(200).json({ message: "Candidate deleted" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCandidate,
  getCandidates,
  updateCandidate,
  deleteCandidate,
};
