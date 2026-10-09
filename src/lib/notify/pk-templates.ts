export type AlertLocale = "en" | "ur" | "both";

export function absenceMessage(input: {
  studentName: string;
  date: string;
  className: string;
  section: string;
  schoolName: string;
  locale: AlertLocale;
  period?: number;
}): { subject: string; body: string } {
  const periodEn =
    input.period && input.period > 0 ? ` · Period ${input.period}` : "";
  const periodUr =
    input.period && input.period > 0 ? ` · پیریڈ ${input.period}` : "";
  const en = {
    subject: `Absence alert — ${input.studentName}${periodEn}`,
    body: `Assalam-o-Alaikum. ${input.studentName} (${input.className}-${input.section}${periodEn}) was marked ABSENT on ${input.date} at ${input.schoolName}. Please contact the school if this is unexpected. — IMS`,
  };
  const ur = {
    subject: `غیر حاضری — ${input.studentName}${periodUr}`,
    body: `السلام علیکم۔ ${input.studentName} (${input.className}-${input.section}${periodUr}) کو ${input.date} کو ${input.schoolName} میں غیر حاضر درج کیا گیا ہے۔ اگر یہ درست نہیں تو اسکول سے رابطہ کریں۔ — IMS`,
  };
  if (input.locale === "ur") return ur;
  if (input.locale === "en") return en;
  return {
    subject: `${en.subject} / ${ur.subject}`,
    body: `${en.body}\n\n---\n\n${ur.body}`,
  };
}

export function feeReminderMessage(input: {
  studentName: string;
  month: string;
  balance: string;
  schoolName: string;
  locale: AlertLocale;
}): { subject: string; body: string } {
  const en = {
    subject: `Fee reminder — ${input.studentName}`,
    body: `Assalam-o-Alaikum. Outstanding fee for ${input.studentName} (${input.month}) is ${input.balance} at ${input.schoolName}. Please pay via Parent Portal or school office. — IMS`,
  };
  const ur = {
    subject: `فیس یاد دہانی — ${input.studentName}`,
    body: `السلام علیکم۔ ${input.studentName} کی بقیہ فیس (${input.month}) ${input.balance} ہے — ${input.schoolName}۔ براہ کرم Parent Portal یا اسکول آفس سے ادا کریں۔ — IMS`,
  };
  if (input.locale === "ur") return ur;
  if (input.locale === "en") return en;
  return {
    subject: `${en.subject} / ${ur.subject}`,
    body: `${en.body}\n\n---\n\n${ur.body}`,
  };
}
