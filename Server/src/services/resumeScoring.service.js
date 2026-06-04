const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");
const OpenAI = require("openai");
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
const RESUME_UPLOADS_DIRECTORY = path.join(__dirname, "..", "..", "uploads", "resumes");
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "will",
  "this",
  "their",
  "into",
  "your",
  "our",
  "you",
  "we",
  "role",
  "job",
  "work",
  "using",
  "used",
  "have",
  "has",
  "had",
]);

let openaiClient = null;

const getOpenAIClient = () => {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return openaiClient;
};

const stripHtml = (value = "") =>
  value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const tokenize = (value = "") =>
  Array.from(
    new Set(
      normalizeWhitespace(value)
        .toLowerCase()
        .split(/[^a-z0-9+#.]+/i)
        .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    )
  );

const buildHash = (value) => crypto.createHash("sha256").update(value).digest("hex");

const cosineSimilarity = (left, right) => {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftNorm += left[index] ** 2;
    rightNorm += right[index] ** 2;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const dedupeItems = (items) =>
  Array.from(
    new Set(
      items
        .map((item) => normalizeWhitespace(String(item || "")))
        .filter(Boolean)
    )
  );

const resolveResumePath = (resumeUrl) => {
  if (!resumeUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(resumeUrl);
    const filename = path.basename(parsedUrl.pathname);
    const resolvedPath = path.resolve(RESUME_UPLOADS_DIRECTORY, filename);

    if (!resolvedPath.startsWith(path.resolve(RESUME_UPLOADS_DIRECTORY))) {
      return null;
    }

    return resolvedPath;
  } catch (_error) {
    return null;
  }
};

const extractResumeText = async (candidate) => {
  const resolvedPath = resolveResumePath(candidate.resumeUrl);
  if (!resolvedPath) {
    throw new Error("Resume file path could not be resolved");
  }

  const mimeType = candidate.resumeMeta?.mimeType || "";
  const filename = candidate.resumeMeta?.filename || path.basename(resolvedPath);
  const extension = path.extname(filename).toLowerCase();
  const buffer = await fs.readFile(resolvedPath);

  if (mimeType === "application/pdf" || extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return normalizeWhitespace(parsed.text || "");
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return normalizeWhitespace(parsed.value || "");
  }

  if (mimeType === "application/msword" || extension === ".doc") {
    throw new Error("Legacy DOC resumes are uploaded successfully, but AI parsing currently supports PDF and DOCX only");
  }

  throw new Error("Unsupported resume file type for AI scoring");
};

const buildJobText = (job) => {
  const sections = [
    job.title,
    job.department,
    job.location,
    job.type,
    stripHtml(job.descriptionHTML),
    job.requirements?.qualification,
    ...(job.requirements?.skills || []),
    ...(job.requirements?.certifications || []),
    ...(job.tags || []),
  ];

  if (typeof job.requirements?.yearsOfExperience === "number") {
    sections.push(`${job.requirements.yearsOfExperience} years experience`);
  }

  return normalizeWhitespace(sections.filter(Boolean).join("\n"));
};

const buildCandidateProfileText = (candidate, resumeText) => {
  const educationText = (candidate.education || [])
    .map((item) => [item.degree, item.college, item.year].filter(Boolean).join(" "))
    .join("\n");

  const sections = [
    resumeText,
    candidate.name,
    candidate.currentRole,
    candidate.currentCompany,
    candidate.coverLetter,
    candidate.location,
    candidate.workAuthorization,
    candidate.noticePeriod,
    ...(candidate.skills || []),
    ...(candidate.certifications || []),
    ...(candidate.languages || []),
    educationText,
  ];

  if (candidate.experience) {
    sections.push(`${candidate.experience.years || 0} years ${candidate.experience.months || 0} months experience`);
  }

  return normalizeWhitespace(sections.filter(Boolean).join("\n"));
};

const getJobEmbedding = async (client, job, jobText) => {
  const textHash = buildHash(jobText);

  if (
    job.aiEmbedding?.model === EMBEDDING_MODEL &&
    job.aiEmbedding?.textHash === textHash &&
    Array.isArray(job.aiEmbedding?.values) &&
    job.aiEmbedding.values.length > 0
  ) {
    return job.aiEmbedding.values;
  }

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: jobText,
  });

  job.aiEmbedding = {
    values: response.data[0].embedding,
    model: EMBEDDING_MODEL,
    textHash,
    updatedAt: new Date(),
  };
  await job.save();

  return job.aiEmbedding.values;
};

const computeKeywordCoverage = (candidateTokens, jobSkills = [], jobTags = []) => {
  const expectedKeywords = dedupeItems([...(jobSkills || []), ...(jobTags || [])]).map((item) => item.toLowerCase());

  if (!expectedKeywords.length) {
    return {
      coverage: 0.5,
      matched: [],
      missing: [],
    };
  }

  const matched = expectedKeywords.filter((keyword) => {
    const keywordTokens = keyword.split(/[^a-z0-9+#.]+/i).filter(Boolean);
    return keywordTokens.some((token) => candidateTokens.includes(token));
  });

  const missing = expectedKeywords.filter((keyword) => !matched.includes(keyword));

  return {
    coverage: matched.length / expectedKeywords.length,
    matched: matched.slice(0, 6),
    missing: missing.slice(0, 4),
  };
};

const computeExperienceAlignment = (candidate, job) => {
  const expectedYears = job.requirements?.yearsOfExperience;
  if (typeof expectedYears !== "number") {
    return {
      score: 0.5,
      message: "",
    };
  }

  const candidateYears =
    Number(candidate.experience?.years || 0) + Number(candidate.experience?.months || 0) / 12;

  if (candidateYears >= expectedYears) {
    return {
      score: 1,
      message: `Experience appears aligned with the ${expectedYears}+ year expectation.`,
    };
  }

  if (candidateYears >= Math.max(0, expectedYears - 1)) {
    return {
      score: 0.7,
      message: `Experience is slightly below the ${expectedYears}+ year target.`,
    };
  }

  return {
    score: 0.3,
    message: `Experience looks below the ${expectedYears}+ year target.`,
  };
};

const buildReasoning = ({ matched, missing, experienceMessage, resumeTextAvailable }) => {
  const parts = [];

  if (matched.length) {
    parts.push(`Strongest overlap: ${matched.join(", ")}.`);
  } else {
    parts.push("Resume-to-job overlap is limited in the current extracted text.");
  }

  if (missing.length) {
    parts.push(`Lower coverage around: ${missing.join(", ")}.`);
  }

  if (experienceMessage) {
    parts.push(experienceMessage);
  }

  if (!resumeTextAvailable) {
    parts.push("Score was estimated from structured profile fields because resume text extraction returned little usable text.");
  }

  return parts.join(" ");
};

const updateCandidateScoreState = async (candidateId, updates) => {
  await Candidate.updateOne({ _id: candidateId }, updates);
};

const markUnavailable = async (candidateId, message) => {
  await updateCandidateScoreState(candidateId, {
    aiScore: null,
    aiReasoning: message,
    aiStatus: "unavailable",
    aiError: message,
    aiScoredAt: null,
    aiModel: "",
    aiInputHash: "",
  });
};

const scoreCandidateResume = async (candidateId) => {
  const client = getOpenAIClient();
  if (!client) {
    await markUnavailable(
      candidateId,
      "AI scoring is unavailable until OPENAI_API_KEY is configured on the server."
    );
    return;
  }

  const candidate = await Candidate.findById(candidateId);
  if (!candidate || candidate.archived || !candidate.resumeUrl) {
    return;
  }

  const job = await Job.findById(candidate.jobId);
  if (!job || job.archived) {
    throw new Error("Candidate job could not be loaded for AI scoring");
  }

  await updateCandidateScoreState(candidateId, {
    aiStatus: "processing",
    aiError: "",
    aiReasoning: "Resume parsing in progress. AI scoring is analyzing the resume against the job requirements.",
  });

  const resumeText = await extractResumeText(candidate);
  const jobText = buildJobText(job);
  const candidateText = buildCandidateProfileText(candidate, resumeText);

  if (!candidateText || candidateText.length < 40) {
    throw new Error("Resume text extraction returned too little content to score this candidate");
  }

  const inputHash = buildHash(`${jobText}\n---\n${candidateText}`);
  if (
    candidate.aiStatus === "completed" &&
    candidate.aiInputHash === inputHash &&
    typeof candidate.aiScore === "number"
  ) {
    return;
  }

  const jobEmbedding = await getJobEmbedding(client, job, jobText);
  const embeddingResponse = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: candidateText,
  });
  const candidateEmbedding = embeddingResponse.data[0].embedding;

  const similarity = clamp(cosineSimilarity(candidateEmbedding, jobEmbedding), 0, 1);
  const candidateTokens = tokenize(candidateText);
  const keywordCoverage = computeKeywordCoverage(candidateTokens, job.requirements?.skills, job.tags);
  const experienceAlignment = computeExperienceAlignment(candidate, job);

  const score = Math.round(
    clamp(similarity * 0.65 + keywordCoverage.coverage * 0.25 + experienceAlignment.score * 0.1, 0, 1) * 100
  );

  const reasoning = buildReasoning({
    matched: keywordCoverage.matched,
    missing: keywordCoverage.missing,
    experienceMessage: experienceAlignment.message,
    resumeTextAvailable: Boolean(resumeText),
  });

  await updateCandidateScoreState(candidateId, {
    aiScore: score,
    aiReasoning: reasoning,
    aiStatus: "completed",
    aiError: "",
    aiScoredAt: new Date(),
    aiInputHash: inputHash,
    aiModel: EMBEDDING_MODEL,
  });
};

const queueCandidateResumeScoring = async (candidateId) => {
  const candidate = await Candidate.findById(candidateId).select("resumeUrl");
  if (!candidate?.resumeUrl) {
    await updateCandidateScoreState(candidateId, {
      aiScore: null,
      aiReasoning: "",
      aiStatus: "not-started",
      aiError: "",
      aiScoredAt: null,
      aiInputHash: "",
      aiModel: "",
    });
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    await markUnavailable(
      candidateId,
      "AI scoring is unavailable until OPENAI_API_KEY is configured on the server."
    );
    return;
  }

  await updateCandidateScoreState(candidateId, {
    aiScore: null,
    aiStatus: "queued",
    aiError: "",
    aiReasoning: "Resume uploaded. AI scoring has been queued and will complete shortly.",
    aiScoredAt: null,
    aiInputHash: "",
    aiModel: "",
  });

  setImmediate(async () => {
    try {
      await scoreCandidateResume(candidateId);
    } catch (error) {
      await updateCandidateScoreState(candidateId, {
        aiScore: null,
        aiStatus: "failed",
        aiError: error.message,
        aiReasoning: error.message,
        aiScoredAt: null,
        aiModel: EMBEDDING_MODEL,
      });
    }
  });
};

module.exports = {
  EMBEDDING_MODEL,
  queueCandidateResumeScoring,
  scoreCandidateResume,
};
