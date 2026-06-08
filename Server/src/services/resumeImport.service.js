const fs = require("fs/promises");
const path = require("path");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const normalizeWhitespace = (value = "") => value.replace(/\s+/g, " ").trim();

const normalizeLine = (value = "") => value.replace(/\s+/g, " ").trim();

const extractResumeTextFromFile = async ({ filePath, mimeType = "", filename = "" }) => {
  const extension = path.extname(filename || filePath).toLowerCase();
  const buffer = await fs.readFile(filePath);

  if (mimeType === "application/pdf" || extension === ".pdf") {
    const parser = new PDFParse({ data: buffer });

    try {
      const parsed = await parser.getText();
      return parsed.text || "";
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    const parsed = await mammoth.extractRawText({ buffer });
    return parsed.value || "";
  }

  throw new Error("Resume import currently supports PDF and DOCX only");
};

const splitLines = (value = "") =>
  value
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

const knownSectionHeadings = new Set([
  "summary",
  "experience",
  "work experience",
  "professional experience",
  "skills",
  "technical skills",
  "core skills",
  "key skills",
  "education",
  "academic background",
  "academics",
  "certifications",
  "certification",
  "licenses",
  "languages",
  "language",
  "projects",
]);

const findSection = (lines, names) => {
  const normalizedNames = names.map((name) => name.toLowerCase());
  const startIndex = lines.findIndex((line) => normalizedNames.includes(line.toLowerCase().replace(/[:\s]+$/g, "")));

  if (startIndex < 0) {
    return [];
  }

  const section = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = line.toLowerCase().replace(/[:\s]+$/g, "");

    if (knownSectionHeadings.has(normalizedLine)) {
      break;
    }

    section.push(line.replace(/^[-*•]\s*/, ""));
  }

  return section;
};

const dedupe = (items) =>
  Array.from(
    new Set(
      items
        .map((item) => normalizeWhitespace(String(item || "")))
        .filter(Boolean)
    )
  );

const extractName = (lines) =>
  lines.find(
    (line, index) =>
      index < 5 &&
      /^[A-Za-z][A-Za-z\s.'-]{2,60}$/.test(line) &&
      !/@|http|linkedin|github|resume|curriculum vitae/i.test(line)
  ) || "";

const extractEmail = (text) => text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";

const extractPhone = (text) => {
  const match = text.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/);
  return match ? normalizeWhitespace(match[0]) : "";
};

const extractUrl = (text, keyword) => {
  const regex = new RegExp(`https?:\\/\\/[^\\s]*${keyword}[^\\s]*`, "i");
  return text.match(regex)?.[0] || "";
};

const extractGenericPortfolio = (text) => {
  const urls = text.match(/https?:\/\/[^\s]+/gi) || [];
  return urls.find((url) => !/linkedin\.com/i.test(url)) || "";
};

const extractLocation = (lines) =>
  lines.find(
    (line, index) =>
      index < 8 &&
      /^[A-Za-z][A-Za-z\s.-]+,\s*[A-Za-z][A-Za-z\s.-]+$/.test(line) &&
      !/linkedin|github|http|@/i.test(line)
  ) || "";

const extractRoleAndCompany = (lines) => {
  const line =
    lines.find((entry) => /\s+\|\s+/.test(entry) || /\s+at\s+/i.test(entry) || /\s+-\s+/.test(entry)) || "";

  if (!line) {
    return { currentRole: "", currentCompany: "" };
  }

  if (/\s+at\s+/i.test(line)) {
    const [currentRole, currentCompany] = line.split(/\s+at\s+/i);
    return { currentRole: normalizeWhitespace(currentRole), currentCompany: normalizeWhitespace(currentCompany) };
  }

  const parts = line.split(/\s+\|\s+|\s+-\s+/).map(normalizeWhitespace).filter(Boolean);
  return {
    currentRole: parts[0] || "",
    currentCompany: parts[1] || "",
  };
};

const extractSkills = (lines, text) => {
  const section = findSection(lines, ["skills", "technical skills", "core skills", "key skills"]);
  const source = section.length ? section.join(",") : text;

  return dedupe(
    source
      .split(/[,|/]/)
      .map((item) => item.replace(/^[-*•]\s*/, "").trim())
      .filter((item) => item.length > 1 && item.length <= 40)
  ).slice(0, 20);
};

const extractEducation = (lines) => {
  const section = findSection(lines, ["education", "academic background", "academics"]);

  return section
    .slice(0, 3)
    .map((line) => {
      const yearMatch = line.match(/\b(19|20)\d{2}\b/);
      const parts = line.split(/,|\||-|\u2022/).map(normalizeWhitespace).filter(Boolean);
      return {
        degree: parts[0] || "",
        college: parts[1] || "",
        year: yearMatch ? Number(yearMatch[0]) : null,
      };
    })
    .filter((entry) => entry.degree || entry.college || entry.year);
};

const extractSimpleSectionItems = (lines, names) => dedupe(findSection(lines, names)).slice(0, 10);

const extractExperience = (text) => {
  const match = text.match(/(\d{1,2})\+?\s+(?:years?|yrs?)(?:\s+(\d{1,2})\s+(?:months?|mos?))?/i);
  return {
    years: match ? Number(match[1] || 0) : 0,
    months: match ? Number(match[2] || 0) : 0,
  };
};

const parseResumeCandidateData = (text) => {
  const normalizedText = normalizeWhitespace(text);
  const lines = splitLines(text);
  const { currentRole, currentCompany } = extractRoleAndCompany(lines);

  return {
    name: extractName(lines),
    email: extractEmail(normalizedText),
    phone: extractPhone(normalizedText),
    location: extractLocation(lines),
    linkedin: extractUrl(normalizedText, "linkedin.com"),
    portfolio: extractGenericPortfolio(normalizedText),
    currentRole,
    currentCompany,
    skills: extractSkills(lines, normalizedText),
    education: extractEducation(lines),
    certifications: extractSimpleSectionItems(lines, ["certifications", "certification", "licenses"]),
    languages: extractSimpleSectionItems(lines, ["languages", "language"]),
    experience: extractExperience(normalizedText),
  };
};

module.exports = {
  extractResumeTextFromFile,
  parseResumeCandidateData,
};
