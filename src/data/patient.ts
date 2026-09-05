import type { Patient } from "../types";

export const currentPatient: Patient = {
  id: "pt_maya_chen",
  name: "Maya Chen",
  dateOfBirth: "2010-03-02",
  age: 16,
  activity: "Soccer — midfielder, Frisco United U16",
  injuryDate: "2026-07-14",
  recoveryDay: 14,
  provider: {
    name: "Dr. Elena Ramirez",
    role: "Sports Medicine Physician",
  },
  school: "Frisco Lone Star High School",
  hasBaseline: true,
  avatarInitials: "MC",
  emergencyContact: {
    name: "Linh Chen",
    relationship: "Parent",
    phone: "(214) 555-0142",
  },
};
