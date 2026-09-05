import type { ResearchSource } from "../types";

export interface ResearchTopic {
  id: string;
  title: string;
  keywords: string[];
  questionPatterns: string[];
  answer: string;
  sourceIds: string[];
  urgent?: boolean;
}

export const researchSources: ResearchSource[] = [
  {
    id: "src_cdc_recovery",
    title: "What to Do After a Concussion",
    type: "public-health-guidance",
    publisher: "CDC HEADS UP",
    year: 2025,
    url: "https://www.cdc.gov/heads-up/guidelines/recovery-from-concussion.html",
    evidenceNote: "Recovery guidance covering early relative rest, light activity, school return, symptom monitoring, and medical follow-up.",
  },
  {
    id: "src_cdc_school",
    title: "Returning to School After a Concussion",
    type: "public-health-guidance",
    publisher: "CDC HEADS UP",
    year: 2025,
    url: "https://www.cdc.gov/heads-up/guidelines/returning-to-school.html",
    evidenceNote: "School supports should be adjusted to the student’s symptoms and functioning.",
  },
  {
    id: "src_cdc_sports",
    title: "Returning to Sports: 6-Step Progression",
    type: "clinical-protocol",
    publisher: "CDC HEADS UP",
    year: 2025,
    url: "https://www.cdc.gov/heads-up/guidelines/returning-to-sports.html",
    evidenceNote: "Return to sport is gradual, requires healthcare-provider approval, and generally advances one step at a time.",
  },
  {
    id: "src_cdc_symptoms",
    title: "Signs and Symptoms of Concussion",
    type: "public-health-guidance",
    publisher: "CDC HEADS UP",
    year: 2025,
    url: "https://www.cdc.gov/heads-up/signs-symptoms/index.html",
    evidenceNote: "Symptoms can vary by person, change during recovery, and may appear hours or days after injury.",
  },
  {
    id: "src_amsterdam",
    title: "Amsterdam 2022 International Consensus Statement on Concussion in Sport",
    type: "consensus-statement",
    publisher: "British Journal of Sports Medicine",
    year: 2023,
    url: "https://bjsm.bmj.com/content/57/11/695",
    evidenceNote: "Management should use multimodal clinical findings; computerized or emerging measures should not be interpreted alone.",
  },
  {
    id: "src_ontario_return",
    title: "Return-to-Activity / Work / School Considerations",
    type: "clinical-protocol",
    publisher: "Living Concussion Guidelines",
    year: 2024,
    url: "https://concussionsontario.org/concussion/guideline-section/return-to-activity_work_school_considerations",
    evidenceNote: "Supports individualized pacing, graded activity, and accommodations for work, school, and daily roles after concussion.",
  },
  {
    id: "src_ontario_prolonged",
    title: "Diagnosis and Assessment of Prolonged Symptoms",
    type: "clinical-protocol",
    publisher: "Living Concussion Guidelines",
    year: 2023,
    url: "https://concussionsontario.org/concussion/guideline-section/diagnosis-assessment-of-prolonged-symptoms",
    evidenceNote: "Supports multimodal, symptom-specific follow-up when symptoms persist and recognizes factors associated with recovery variability.",
  },
  {
    id: "src_peds",
    title: "Living Guideline for Pediatric Concussion Care",
    type: "clinical-protocol",
    publisher: "PedsConcussion",
    year: 2023,
    url: "https://pedsconcussion.com/",
    evidenceNote: "Pediatric guidance covering return to school and activity, cognition, fatigue, sleep, vision, balance, and follow-up.",
  },
  {
    id: "src_fitbir_pcss",
    title: "Post-Concussion Symptom Scale (PCSS) Data Structure",
    type: "research-standard",
    publisher: "NIH FITBIR",
    year: 2017,
    url: "https://fitbir.nih.gov/dictionary/publicData/dataStructureAction%21view.action?dataStructureName=PCSS&publicArea=true&style.key=fitbir-style",
    evidenceNote: "A standardized symptom data structure used in traumatic brain injury research.",
  },
  {
    id: "src_balance_review",
    title: "Clinical Assessments of Balance in Adults with Concussion: An Update",
    type: "peer-reviewed",
    publisher: "PubMed / Current Sports Medicine Reports",
    year: 2019,
    url: "https://pubmed.ncbi.nlm.nih.gov/30616294/",
    evidenceNote: "Balance is one concussion-assessment domain, with clinical and laboratory methods measuring different aspects of postural control.",
  },
];

export const researchTopics: ResearchTopic[] = [
  {
    id: "screen-time",
    title: "Screen exposure and symptom aggravation",
    keywords: ["screen", "phone", "computer", "gaming", "video", "brightness", "reading", "eye strain", "visual"],
    questionPatterns: ["why do screens", "screen time", "phone makes", "computer makes"],
    answer:
      "Screen use can combine visual tracking, focusing, light exposure, and cognitive effort. Early after concussion, guidance commonly recommends temporarily reducing screen exposure when it clearly increases symptoms, then gradually reintroducing it as tolerated rather than treating all screen use as permanently harmful.",
    sourceIds: ["src_cdc_recovery", "src_amsterdam"],
  },
  {
    id: "return-school",
    title: "Return to school and accommodations",
    keywords: ["school", "class", "homework", "test", "quiz", "learning", "return to learn", "rtl", "accommodation", "break"],
    questionPatterns: ["return to school", "go back to class", "school accommodations", "return to learn"],
    answer:
      "Many students return to school before every symptom has disappeared. Supports can be adjusted to the student’s current symptoms and may include rest breaks, reduced workload, extra time, limited screen exposure, or temporary schedule changes. A healthcare professional and school team should guide the individual plan.",
    sourceIds: ["src_cdc_school", "src_amsterdam", "src_ontario_return", "src_peds"],
  },
  {
    id: "return-sport",
    title: "Return-to-sport progression",
    keywords: ["sport", "practice", "game", "play", "exercise", "workout", "return to play", "rtp", "contact", "athlete"],
    questionPatterns: ["return to sport", "return to play", "can i practice", "can i play"],
    answer:
      "Return to sport is a graduated process, not a single app score. CDC guidance uses a six-step progression under healthcare-provider approval and supervision. New or worsening symptoms are a reason to stop, return to the previous tolerated step, and contact the treating provider.",
    sourceIds: ["src_cdc_sports", "src_amsterdam", "src_peds"],
  },
  {
    id: "balance-result",
    title: "SomatoSync lateral-sway interpretation",
    keywords: ["lateral sway", "sway result", "balance result", "balance score", "movement band", "rms", "percent frame", "0.2", "0.20"],
    questionPatterns: ["what does my lateral sway", "what does 0.2", "balance score mean", "sway result mean"],
    answer:
      "SomatoSync translates lateral sway into prototype recording bands: below 0.65% is labeled lower movement, 0.65% to under 1.5% is moderate movement, and 1.5% or above is higher movement. For example, 0.20% falls in the lower band and means the recording appeared steadier. These are app interpretation bands, not clinical normal ranges, and the trend across similarly recorded sessions matters more than one value.",
    sourceIds: ["src_balance_review", "src_amsterdam"],
  },
  {
    id: "balance",
    title: "Balance and postural movement",
    keywords: ["balance", "sway", "dizzy", "dizziness", "unstable", "posture", "steadiness", "head movement", "vestibular"],
    questionPatterns: ["why am i dizzy", "head steadiness", "balance after concussion"],
    answer:
      "Balance and postural control are useful assessment domains, but no webcam measurement should be treated as a diagnosis or clearance decision. A repeated camera result is most useful for tracking change under similar lighting, stance, distance, and camera placement, alongside symptoms and a clinician’s examination.",
    sourceIds: ["src_balance_review", "src_amsterdam"],
  },
  {
    id: "symptom-scale",
    title: "PCSS symptom tracking",
    keywords: ["pcss", "symptom", "headache", "fatigue", "foggy", "nausea", "sleep", "irritable", "score"],
    questionPatterns: ["what is pcss", "symptom score", "why track symptoms", "pcss score"],
    answer:
      "The Post-Concussion Symptom Scale records the severity of multiple symptoms so changes can be followed over time. A total can summarize reported burden, but the individual symptoms and their pattern still matter; the score does not diagnose concussion or determine return-to-play clearance by itself.",
    sourceIds: ["src_fitbir_pcss", "src_amsterdam"],
  },
  {
    id: "rest-activity",
    title: "Rest and gradual activity",
    keywords: ["rest", "dark room", "walk", "activity", "exercise", "aerobic", "tired", "recovery"],
    questionPatterns: ["should i rest", "dark room", "can i walk", "when exercise"],
    answer:
      "Current guidance favors relative rest during the first one to two days rather than prolonged complete inactivity. Light daily activity such as walking may be introduced as tolerated when it does not meaningfully worsen symptoms, while activities with risk of another head injury remain restricted.",
    sourceIds: ["src_cdc_recovery", "src_amsterdam", "src_ontario_return", "src_peds"],
  },
  {
    id: "return-work-daily-life",
    title: "Return to work and daily responsibilities",
    keywords: ["work", "job", "shift", "workplace", "daily life", "caregiving", "household", "driving", "fall", "vehicle", "assault", "non sport"],
    questionPatterns: ["return to work", "not an athlete", "daily life after concussion", "work accommodations"],
    answer:
      "Concussion recovery is not limited to sport. Return to work, caregiving, household responsibilities, transportation, and community activity should be gradual and matched to symptoms, cognitive load, safety risk, and the actual demands of the role. Temporary changes can include shorter shifts, quieter work, reduced multitasking, extra breaks, and avoiding tasks where dizziness or slowed reactions could cause another injury.",
    sourceIds: ["src_ontario_return", "src_amsterdam"],
  },
  {
    id: "recovery-outlook",
    title: "Recovery variability and follow-up signals",
    keywords: ["timeline", "how long", "recover", "prolonged", "persistent", "risk", "weeks", "outlook", "prediction"],
    questionPatterns: ["when will i recover", "how long will recovery take", "risk of prolonged recovery", "persistent symptoms"],
    answer:
      "An app should not promise an individual recovery date from symptom or browser-task data. Recovery varies across people and domains. Symptoms that persist beyond about four weeks, limited functional improvement, sleep problems, high symptom burden, or repeated decline across several domains can support closer clinical follow-up, but they do not create a reliable personal probability or deadline.",
    sourceIds: ["src_amsterdam", "src_ontario_prolonged", "src_peds"],
  },
  {
    id: "danger-signs",
    title: "Urgent warning signs",
    keywords: ["emergency", "danger", "vomit", "vomiting", "seizure", "unconscious", "slurred", "weakness", "worse headache", "pupil", "confused"],
    questionPatterns: ["when emergency", "danger signs", "go to hospital", "call 911"],
    answer:
      "Some symptoms after a head injury require urgent medical evaluation. Examples include worsening severe headache, repeated vomiting, seizure, increasing confusion or unusual behavior, slurred speech, weakness or numbness, loss of consciousness, or increasing difficulty waking. Use emergency services for immediate danger rather than relying on this assistant.",
    sourceIds: ["src_cdc_symptoms", "src_cdc_recovery"],
    urgent: true,
  },
  {
    id: "multi-domain",
    title: "Why one readiness score is not enough",
    keywords: ["ready", "readiness", "overall score", "recovery score", "single score", "clearance", "combine", "metrics"],
    questionPatterns: ["am i ready", "readiness score", "overall score", "cleared"],
    answer:
      "Concussion recovery should not be reduced to one app-generated readiness number. Symptoms, cognition, balance, vestibular or ocular findings, exertion tolerance, and clinical judgment can recover at different rates. Evidence from one digital task should be interpreted as one part of a broader evaluation.",
    sourceIds: ["src_amsterdam", "src_balance_review"],
  },
];

export const sampleQuestions = [
  "What does my lateral sway result mean?",
  "How can I pace school or work?",
  "Can the app predict how long recovery will take?",
  "Why shouldn't one score determine readiness?",
];
