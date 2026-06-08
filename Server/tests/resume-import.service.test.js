const test = require("node:test");
const assert = require("node:assert/strict");

const { parseResumeCandidateData } = require("../src/services/resumeImport.service");

test("parseResumeCandidateData extracts structured candidate hints from resume text", () => {
  const resumeText = `
    Avery Jordan
    Senior Frontend Engineer at Orbit Labs
    Pune, India
    avery@example.com
    +91 98765 43210
    https://linkedin.com/in/averyjordan
    https://avery.dev

    Skills
    React, TypeScript, Next.js, Node.js, GraphQL

    Education
    B.Tech Computer Science, IIT Delhi, 2020

    Certifications
    AWS Certified Developer

    Languages
    English
    Hindi

    4 years 6 months experience
  `;

  const parsed = parseResumeCandidateData(resumeText);

  assert.equal(parsed.name, "Avery Jordan");
  assert.equal(parsed.email, "avery@example.com");
  assert.equal(parsed.phone, "+91 98765 43210");
  assert.equal(parsed.location, "Pune, India");
  assert.equal(parsed.linkedin, "https://linkedin.com/in/averyjordan");
  assert.equal(parsed.portfolio, "https://avery.dev");
  assert.equal(parsed.currentRole, "Senior Frontend Engineer");
  assert.equal(parsed.currentCompany, "Orbit Labs");
  assert.deepEqual(parsed.skills.slice(0, 3), ["React", "TypeScript", "Next.js"]);
  assert.equal(parsed.education[0].degree, "B.Tech Computer Science");
  assert.equal(parsed.education[0].college, "IIT Delhi");
  assert.equal(parsed.education[0].year, 2020);
  assert.equal(parsed.certifications[0], "AWS Certified Developer");
  assert.equal(parsed.languages[0], "English");
  assert.equal(parsed.experience.years, 4);
  assert.equal(parsed.experience.months, 6);
});
