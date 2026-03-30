import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";
import { useAppStore } from "../store";
import { isSupabaseConfigured, supabase } from "../supabaseClient";
import { getDistrictOptions, INDIA_STATES, lookupIndianPin } from "../helpers/indiaLocation";

const METHODS = ["HPLC", "Immunoassay", "Point-of-Care", "Enzymatic", "Capillary Electrophoresis", "Other"];
const FASTING = ["Fasting", "Non-Fasting", "Unknown"];
const DIABETES_TYPES = ["Type 1", "Type 2", "Gestational", "MODY", "LADA", "Secondary", "Unknown"];
const TREATMENTS = ["Diet", "OHA", "Insulin", "OHA+Insulin", "CSII", "Other"];
const MEDS = ["Metformin", "Sulfonylurea", "DPP-4i", "GLP-1 RA", "SGLT-2i", "Insulin"];
const INSULIN = ["Basal", "Basal-Bolus", "Premixed", "Pump"];
const COMORBIDITIES = ["Hypertension", "Dyslipidaemia", "CKD", "CVD", "Retinopathy", "Neuropathy", "Nephropathy", "NAFLD", "Hypothyroidism", "PCOS"];
const DIETS = ["Vegetarian", "Vegan", "Eggetarian", "Non-Vegetarian", "Jain"];
const ACTIVITIES = ["Sedentary", "Lightly Active", "Moderately Active", "Very Active"];
const TOBACCO = ["Never", "Smoking", "Smokeless (gutka/pan masala)", "Both", "Quit"];
const ALCOHOL = ["Never", "Occasional", "Regular", "Quit"];
const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Other", "Not Disclosed"];
const CATEGORIES = ["General", "OBC", "SC", "ST", "Other"];
const SOCIOECONOMIC_CLASSES = ["BPL", "APL", "Kuppuswamy Scale I", "Kuppuswamy Scale II", "Kuppuswamy Scale III", "Kuppuswamy Scale IV", "Kuppuswamy Scale V"];
const LANGUAGES = ["Hindi", "English", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Gujarati", "Bengali", "Punjabi", "Odia", "Assamese", "Urdu", "Sanskrit", "Konkani", "Maithili", "Manipuri", "Nepali", "Bodo", "Dogri", "Santhali", "Kashmiri"];

const initialForm = {
  abhaId: "", patientName: "", dateOfBirth: "", gender: "", mobileNumber: "", aadhaarLast4: "",
  pinCode: "", state: "", district: "", city: "", talukOrBlock: "", villageOrTown: "",
  whatsappConsent: false, religion: "", category: "", socioeconomicClass: "", preferredLanguage: "",
  hba1c: "", testDate: "", testingMethod: "", labName: "", physicianName: "", nmcRegistrationId: "", fastingStatus: "",
  diabetesType: "", yearOfDiagnosis: "", treatmentModality: [], currentMedications: [], insulinRegimen: "",
  comorbidities: [], systolicBP: "", diastolicBP: "", heightCm: "", weightKg: "", waistCircumference: "",
  dietType: "", physicalActivity: "", tobaccoUse: "", alcoholUse: ""
};

const inputStyle = { width: "100%", padding: "12px 14px", border: "1px solid #dbe5f0", borderRadius: "12px", background: "#f8fafc", color: "#1f2937" };
const inputWrapperStyle = { position: "relative" };
const sectionStyle = { marginBottom: "24px", padding: "20px", border: "1px solid #dbe5f0", borderRadius: "16px", background: "#f8fafc" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" };

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

function calcAge(dob) {
  if (!dob) return "";
  const birth = new Date(dob);
  const now = new Date();
  if (Number.isNaN(birth.getTime()) || birth > now) return "";
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function formatAbhaId(value) {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  const parts = [];

  if (digits.slice(0, 4)) parts.push(digits.slice(0, 4));
  if (digits.slice(4, 8)) parts.push(digits.slice(4, 8));
  if (digits.slice(8, 12)) parts.push(digits.slice(8, 12));
  if (digits.slice(12, 14)) parts.push(digits.slice(12, 14));

  return parts.join("-");
}

function isValidLuhn(value) {
  const digits = value.replace(/\D/g, "");

  if (digits.length !== 14) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);

    if (shouldDouble) {
      digit *= 2;

      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

function calcMmol(hba1c) {
  if (hba1c === "") return "";
  const v = Number(hba1c);
  if (Number.isNaN(v)) return "";
  return ((v - 2.15) * 10.929).toFixed(1);
}

function glycaemicStatus(hba1c) {
  const v = Number(hba1c);
  if (!hba1c || Number.isNaN(v)) return "";
  if (v > 10) return "High Risk";
  if (v >= 6.5) return "Diabetic";
  if (v >= 5.7) return "Prediabetes";
  return "Normal";
}

function bmiValue(heightCm, weightKg) {
  if (!heightCm || !weightKg) return "";
  const h = Number(heightCm);
  const w = Number(weightKg);
  if (Number.isNaN(h) || Number.isNaN(w) || h <= 0) return "";
  return (w / (h / 100) ** 2).toFixed(1);
}

function bmiCategory(bmi) {
  const v = Number(bmi);
  if (!bmi || Number.isNaN(v)) return "";
  if (v >= 25) return "Obese";
  if (v >= 23) return "Overweight";
  return "Healthy";
}

function durationYears(year) {
  if (!/^\d{4}$/.test(year)) return "";
  return new Date().getFullYear() - Number(year);
}

function daysOld(dateValue) {
  if (!dateValue) return null;
  const value = new Date(dateValue);
  if (Number.isNaN(value.getTime())) return null;
  return Math.floor((new Date().getTime() - value.getTime()) / (1000 * 60 * 60 * 24));
}

function badgeStyle(label) {
  const map = {
    Normal: { background: "#dcfce7", color: "#166534" },
    Prediabetes: { background: "#fef3c7", color: "#92400e" },
    Diabetic: { background: "#ffedd5", color: "#c2410c" },
    "High Risk": { background: "#fee2e2", color: "#b91c1c" },
    Healthy: { background: "#dcfce7", color: "#166534" },
    Overweight: { background: "#fef3c7", color: "#92400e" },
    Obese: { background: "#fee2e2", color: "#b91c1c" }
  };
  return map[label] || { background: "#e2e8f0", color: "#334155" };
}

function errorsFor(form, age, pinDetails, isDuplicateAbha) {
  const errors = {};
  const currentYear = new Date().getFullYear();
  const abhaDigits = form.abhaId.replace(/\D/g, "");
  if (!form.abhaId.trim()) errors.abhaId = "ABHA ID is required.";
  else if (abhaDigits.length !== 14 || !isValidLuhn(form.abhaId)) errors.abhaId = "Invalid ABHA ID";
  else if (isDuplicateAbha) errors.abhaId = "Patient with this ABHA ID already exists";
  if (!form.patientName.trim()) errors.patientName = "Patient name is required.";
  else if (form.patientName.trim().length < 2) errors.patientName = "Patient name must be at least 2 characters.";
  else if (!/^[A-Za-z ]+$/.test(form.patientName.trim())) errors.patientName = "Patient name can contain only alphabets and spaces.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Date of birth is required.";
  else if (age === "") errors.dateOfBirth = "Date of birth must be a valid past date.";
  else if (age < 0 || age > 120) errors.dateOfBirth = "Age must be between 0 and 120 years.";
  if (!form.gender) errors.gender = "Gender is required.";
  if (!/^[6-9][0-9]{9}$/.test(form.mobileNumber)) errors.mobileNumber = "Enter valid 10-digit Indian mobile number";
  if (form.aadhaarLast4 && !/^\d{4}$/.test(form.aadhaarLast4)) errors.aadhaarLast4 = "Aadhaar must contain exactly 4 digits.";
  if (!/^\d{6}$/.test(form.pinCode)) errors.pinCode = "PIN code must contain exactly 6 digits.";
  else if (!pinDetails) errors.pinCode = "Enter a valid Indian PIN code.";
  if (!form.state) errors.state = "State is required.";
  if (!form.district) errors.district = "District is required.";
  if (form.hba1c === "") errors.hba1c = "HbA1C is required.";
  else if (!/^\d{1,2}(\.\d)?$/.test(form.hba1c)) errors.hba1c = "HbA1C must be numeric with up to 1 decimal place.";
  else if (Number(form.hba1c) < 3 || Number(form.hba1c) > 20) errors.hba1c = "HbA1C must be between 3.0 and 20.0.";
  if (!form.testDate) errors.testDate = "Test date is required.";
  else if (new Date(form.testDate) > new Date()) errors.testDate = "Test date cannot be in the future.";
  if (!form.testingMethod) errors.testingMethod = "Testing method is required.";
  if (!form.labName.trim()) errors.labName = "Lab name is required.";
  if (!form.physicianName.trim()) errors.physicianName = "Physician name is required.";
  if (!form.nmcRegistrationId.trim()) errors.nmcRegistrationId = "NMC Registration ID is required.";
  else if (!/^[A-Za-z0-9]+$/.test(form.nmcRegistrationId.trim())) errors.nmcRegistrationId = "NMC Registration ID must be alphanumeric.";
  if (!form.diabetesType) errors.diabetesType = "Diabetes type is required.";
  if (form.yearOfDiagnosis) {
    if (!/^\d{4}$/.test(form.yearOfDiagnosis)) errors.yearOfDiagnosis = "Enter a valid year between 1900 and current year";
    else if (Number(form.yearOfDiagnosis) < 1900 || Number(form.yearOfDiagnosis) > currentYear) errors.yearOfDiagnosis = "Enter a valid year between 1900 and current year";
  }
  if (form.treatmentModality.includes("Insulin") && !form.insulinRegimen) errors.insulinRegimen = "Select an insulin regimen.";
  if (form.systolicBP && Number(form.systolicBP) <= 0) errors.systolicBP = "Systolic BP must be greater than 0.";
  if (form.diastolicBP && Number(form.diastolicBP) <= 0) errors.diastolicBP = "Diastolic BP must be greater than 0.";
  if (form.heightCm && (Number(form.heightCm) < 50 || Number(form.heightCm) > 250)) errors.heightCm = "Height must be between 50 and 250 cm.";
  if (form.weightKg && (Number(form.weightKg) < 10 || Number(form.weightKg) > 300)) errors.weightKg = "Weight must be between 10 and 300 kg.";
  return errors;
}

function FieldError({ show, message }) {
  return (
    <p className={`field-error${show && message ? " field-error--visible" : ""}`}>
      {show && message ? message : " "}
    </p>
  );
}

function StatusBadge({ label }) {
  return (
    <span style={{ display: "inline-flex", padding: "6px 12px", borderRadius: "999px", fontWeight: 600, ...badgeStyle(label) }}>
      {label}
    </span>
  );
}

function FieldLabel({ htmlFor, text, required = false }) {
  return (
    <label htmlFor={htmlFor}>
      {text}
      {required && <span style={{ color: "#dc2626", marginLeft: "4px" }}>*</span>}
    </label>
  );
}

function CheckGroup({ options, selected, onToggle }) {
  return (
    <div className="checkbox-group">
      {options.map((option) => (
        <label key={option} className="checkbox-item">
          <input
            type="checkbox"
            checked={selected.includes(option)}
            onChange={() => onToggle(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}

function PatientForm() {
  const { patients, savePatientRecord } = useAppStore();
  const [form, setForm] = useState(initialForm);
  const [pinDetails, setPinDetails] = useState(null);
  const [touched, setTouched] = useState({});
  const [isDuplicateAbha, setIsDuplicateAbha] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const age = calcAge(form.dateOfBirth);
  const mmol = calcMmol(form.hba1c);
  const status = glycaemicStatus(form.hba1c);
  const bmi = bmiValue(form.heightCm, form.weightKg);
  const bmiLabel = bmiCategory(bmi);
  const duration = durationYears(form.yearOfDiagnosis);
  const districts = getDistrictOptions(form.state);
  const oldTest = daysOld(form.testDate);
  const isValidAbha = form.abhaId.trim() !== "" && isValidLuhn(form.abhaId);
  const errors = errorsFor(form, age, pinDetails, isDuplicateAbha);
  const isValid = Object.keys(errors).length === 0;
  const abhaVerified = isValidAbha && !isDuplicateAbha;
  const disabledReasonKeys = Object.keys(errors);
  const hasStartedForm = Object.values(form).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return String(value).trim() !== "";
  });

  const previousRecord = useMemo(() => {
    return [...patients].reverse().find((patient) =>
      patient.name?.trim().toLowerCase() === form.patientName.trim().toLowerCase() &&
      patient.mobileNumber === form.mobileNumber &&
      typeof patient.hba1c !== "undefined"
    );
  }, [patients, form.patientName, form.mobileNumber]);

  const trendValue = previousRecord && form.hba1c !== "" ? (Number(form.hba1c) - Number(previousRecord.hba1c)).toFixed(1) : "";
  const trendArrow = trendValue === "" ? "" : Number(trendValue) > 0 ? "↑" : Number(trendValue) < 0 ? "↓" : "→";
  const hba1cAlert = form.hba1c !== "" && Number(form.hba1c) < 4 ? "Low HbA1C alert: the value is below 4.0%." : form.hba1c !== "" && Number(form.hba1c) > 14 ? "High Risk alert: the value is above 14.0%." : "";
  const bpAlert = Number(form.systolicBP) > 180 || Number(form.diastolicBP) > 110 ? "Blood pressure is in a critical range." : "";
  const waistAlert = form.waistCircumference && ((form.gender === "Male" && Number(form.waistCircumference) > 90) || (form.gender === "Female" && Number(form.waistCircumference) > 80)) ? "Waist circumference is above South Asian risk thresholds." : "";

  useEffect(() => {
    let isActive = true;

    async function checkAbhaDuplicate() {
      if (!form.abhaId.trim() || !isValidAbha) {
        if (isActive) {
          setIsDuplicateAbha(false);
        }
        return;
      }

      const duplicateInState = patients.some(
        (patient) => patient.abhaId === form.abhaId
      );

      if (duplicateInState) {
        if (isActive) {
          setIsDuplicateAbha(true);
        }
        return;
      }

      if (!isSupabaseConfigured) {
        if (isActive) {
          setIsDuplicateAbha(false);
        }
        return;
      }

      const { data, error: lookupError } = await supabase
        .from("patients")
        .select("id")
        .eq("abha_id", form.abhaId)
        .maybeSingle();

      if (isActive) {
        setIsDuplicateAbha(!lookupError && Boolean(data));
      }
    }

    checkAbhaDuplicate();

    return () => {
      isActive = false;
    };
  }, [form.abhaId, isValidAbha, patients]);

  const setField = (field, value) => {
    setError("");
    setSuccess("");
    setForm((current) => ({ ...current, [field]: value }));
  };

  const markTouched = (field) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const toggle = (field, value) => {
    setError("");
    setSuccess("");
    setForm((current) => {
      const next = current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value];
      return { ...current, [field]: next, ...(field === "treatmentModality" && !next.includes("Insulin") ? { insulinRegimen: "" } : {}) };
    });
  };

  const onPinChange = (value) => {
    const pin = value.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setPinDetails(null);
      setForm((current) => ({ ...current, pinCode: pin, state: "", district: "", city: "" }));
      return;
    }
    const details = lookupIndianPin(pin);
    setPinDetails(details);
    setForm((current) => ({ ...current, pinCode: pin, state: details?.state || "", district: details?.district || "", city: details?.city || "" }));
  };

  const savePatient = async () => {
    setShowErrors(true);
    setError("");
    setSuccess("");
    if (!isValid) {
      setError("Please fix the validation errors before saving.");
      return;
    }

    const trimmedName = form.patientName.trim();
    if (isDuplicateAbha) {
      setError("Patient with this ABHA ID already exists");
      return;
    }

    const duplicate = patients.find((patient) => patient.name?.trim().toLowerCase() === trimmedName.toLowerCase() && Number(patient.age) === Number(age));
    if (duplicate) {
      setError("A patient with the same name and age already exists.");
      return;
    }

    const newPatient = {
      id: createId("PT"),
      abhaId: form.abhaId,
      name: trimmedName,
      dateOfBirth: form.dateOfBirth,
      age: Number(age),
      gender: form.gender,
      mobileNumber: form.mobileNumber,
      aadhaarLast4: form.aadhaarLast4,
      pinCode: form.pinCode,
      state: form.state,
      district: form.district,
      city: form.city,
      talukOrBlock: form.talukOrBlock,
      villageOrTown: form.villageOrTown,
      whatsappConsent: form.whatsappConsent,
      religion: form.religion,
      category: form.category,
      socioeconomicClass: form.socioeconomicClass,
      preferredLanguage: form.preferredLanguage,
      hba1c: Number(form.hba1c),
      hba1cMmol: mmol,
      glycaemicStatus: status,
      testDate: form.testDate,
      testingMethod: form.testingMethod,
      labName: form.labName.trim(),
      physicianName: form.physicianName.trim(),
      nmcRegistrationId: form.nmcRegistrationId.trim(),
      orderingPhysician: `${form.physicianName.trim()} (${form.nmcRegistrationId.trim()})`,
      fastingStatus: form.fastingStatus,
      trendVsPrevious: trendValue === "" ? "No previous result" : `${trendArrow} ${trendValue}`,
      diabetesType: form.diabetesType,
      yearOfDiagnosis: form.yearOfDiagnosis,
      duration,
      treatmentModality: form.treatmentModality,
      currentMedications: form.currentMedications,
      insulinRegimen: form.insulinRegimen,
      comorbidities: form.comorbidities,
      systolicBP: form.systolicBP,
      diastolicBP: form.diastolicBP,
      bloodPressure: form.systolicBP || form.diastolicBP ? `${form.systolicBP || "--"}/${form.diastolicBP || "--"}` : "--",
      heightCm: form.heightCm,
      weightKg: form.weightKg,
      bmi,
      bmiCategory: bmiLabel,
      waistCircumference: form.waistCircumference,
      dietType: form.dietType,
      physicalActivity: form.physicalActivity,
      tobaccoUse: form.tobaccoUse,
      alcoholUse: form.alcoholUse,
      createdAt: new Date().toISOString()
    };

    const result = await savePatientRecord(newPatient);

    if (!result.success) {
      setError(result.message);
      return;
    }

    setSuccess(result.message);
    setShowErrors(false);
    setPinDetails(null);
    setTouched({});
    setForm(initialForm);
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="page-card" style={{ maxWidth: "1080px", margin: "0 auto" }}>
          <div className="page-header">
            <h2>Patient Entry Form</h2>
            <p>Capture patient details, HbA1C information, clinical profile, and lifestyle metrics with structured validation.</p>
          </div>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Patient Identification</h3>
            <div style={gridStyle}>
              <div className="form-group">
                <FieldLabel htmlFor="abha-id" text="ABHA ID" required />
                <div style={inputWrapperStyle}>
                  <input
                    id="abha-id"
                    value={form.abhaId}
                    onChange={(e) => {
                      markTouched("abhaId");
                      setField("abhaId", formatAbhaId(e.target.value));
                    }}
                    onBlur={() => markTouched("abhaId")}
                    placeholder="1234-1234-1234-12"
                    style={{
                      ...inputStyle,
                      paddingRight: abhaVerified ? "42px" : "14px",
                      borderColor: (showErrors || touched.abhaId) && errors.abhaId ? "#dc2626" : "#dbe5f0"
                    }}
                  />
                  {abhaVerified && (
                    <span
                      style={{
                        position: "absolute",
                        top: "50%",
                        right: "14px",
                        transform: "translateY(-50%)",
                        color: "#16a34a",
                        fontSize: "18px",
                        fontWeight: 700
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
                <FieldError show={showErrors || touched.abhaId} message={errors.abhaId} />
              </div>
              <div className="form-group"><FieldLabel htmlFor="patient-name" text="Patient Name" required /><input id="patient-name" value={form.patientName} onChange={(e) => setField("patientName", e.target.value)} placeholder="Enter patient name" style={{ ...inputStyle, borderColor: showErrors && errors.patientName ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.patientName} /></div>
              <div className="form-group"><FieldLabel htmlFor="dob" text="Date of Birth" required /><input id="dob" type="date" max={new Date().toISOString().split("T")[0]} value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.dateOfBirth ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.dateOfBirth} /></div>
              <div className="form-group"><FieldLabel htmlFor="age" text="Age" /><input id="age" value={age} readOnly placeholder="Auto-calculated" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel htmlFor="gender" text="Gender" required /><select id="gender" value={form.gender} onChange={(e) => setField("gender", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.gender ? "#dc2626" : "#dbe5f0" }}><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Transgender">Transgender</option><option value="Prefer not to say">Prefer not to say</option></select><FieldError show={showErrors} message={errors.gender} /></div>
              <div className="form-group"><FieldLabel htmlFor="mobile" text="Mobile Number" required /><input id="mobile" type="tel" maxLength={10} value={form.mobileNumber} onChange={(e) => setField("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" style={{ ...inputStyle, borderColor: showErrors && errors.mobileNumber ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.mobileNumber} /></div>
              <div className="form-group"><FieldLabel htmlFor="aadhaar" text="Aadhaar Last 4 digits" /><input id="aadhaar" maxLength={4} value={form.aadhaarLast4} onChange={(e) => setField("aadhaarLast4", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Optional" style={{ ...inputStyle, borderColor: showErrors && errors.aadhaarLast4 ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.aadhaarLast4} /></div>
            </div>
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Demographic Details</h3>
            <div style={gridStyle}>
              <div className="form-group"><FieldLabel htmlFor="pin" text="PIN Code" required /><input id="pin" maxLength={6} value={form.pinCode} onChange={(e) => onPinChange(e.target.value)} placeholder="Enter 6-digit PIN code" style={{ ...inputStyle, borderColor: showErrors && errors.pinCode ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.pinCode} /></div>
              <div className="form-group"><FieldLabel htmlFor="state" text="State" required /><select id="state" value={form.state} onChange={(e) => setField("state", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.state ? "#dc2626" : "#dbe5f0" }}><option value="">Select state</option>{INDIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}</select><FieldError show={showErrors} message={errors.state} /></div>
              <div className="form-group"><FieldLabel htmlFor="district" text="District" required /><select id="district" value={form.district} onChange={(e) => setField("district", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.district ? "#dc2626" : "#dbe5f0" }}><option value="">Select district</option>{districts.map((district) => <option key={district} value={district}>{district}</option>)}</select><FieldError show={showErrors} message={errors.district} /></div>
              <div className="form-group"><FieldLabel htmlFor="city" text="City" /><input id="city" value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Auto-filled from PIN, editable" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel htmlFor="taluk" text="Taluk / Block" /><input id="taluk" value={form.talukOrBlock} onChange={(e) => setField("talukOrBlock", e.target.value)} placeholder="Optional" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel htmlFor="village" text="Village / Town" /><input id="village" value={form.villageOrTown} onChange={(e) => setField("villageOrTown", e.target.value)} placeholder="Optional" style={inputStyle} /></div>
              <div className="form-group" style={{ justifyContent: "center" }}>
                <label
                  htmlFor="whatsapp-consent"
                  style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 500 }}
                >
                  <input
                    id="whatsapp-consent"
                    type="checkbox"
                    checked={form.whatsappConsent}
                    onChange={(e) => setField("whatsappConsent", e.target.checked)}
                  />
                  <span>Patient consents to receive WhatsApp communication</span>
                </label>
                <FieldError show={false} message="" />
              </div>
              <div className="form-group"><FieldLabel htmlFor="religion" text="Religion" /><select id="religion" value={form.religion} onChange={(e) => setField("religion", e.target.value)} style={inputStyle}><option value="">Select religion</option>{RELIGIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="category" text="Category" /><select id="category" value={form.category} onChange={(e) => setField("category", e.target.value)} style={inputStyle}><option value="">Select category</option>{CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="socioeconomic-class" text="Socioeconomic Class" /><select id="socioeconomic-class" value={form.socioeconomicClass} onChange={(e) => setField("socioeconomicClass", e.target.value)} style={inputStyle}><option value="">Select socioeconomic class</option>{SOCIOECONOMIC_CLASSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="preferred-language" text="Preferred Language" /><select id="preferred-language" value={form.preferredLanguage} onChange={(e) => setField("preferredLanguage", e.target.value)} style={inputStyle}><option value="">Select preferred language</option>{LANGUAGES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>HbA1C Details</h3>
            <div style={gridStyle}>
              <div className="form-group"><FieldLabel htmlFor="hba1c" text="HbA1C (%)" required /><input id="hba1c" type="number" step="0.1" min="3" max="20" value={form.hba1c} onChange={(e) => setField("hba1c", e.target.value)} placeholder="Enter HbA1C" style={{ ...inputStyle, borderColor: showErrors && errors.hba1c ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.hba1c} /></div>
              <div className="form-group"><FieldLabel htmlFor="mmol" text="HbA1C (mmol/mol)" /><input id="mmol" readOnly value={mmol} placeholder="Auto-calculated" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel text="Glycaemic Status" /><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#fff" }}>{status ? <StatusBadge label={status} /> : <span style={{ color: "#64748b" }}>Auto-calculated</span>}</div></div>
              <div className="form-group"><FieldLabel htmlFor="test-date" text="Test Date" required /><input id="test-date" type="date" max={new Date().toISOString().split("T")[0]} value={form.testDate} onChange={(e) => setField("testDate", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.testDate ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.testDate} /></div>
              <div className="form-group"><FieldLabel htmlFor="method" text="Testing Method" required /><select id="method" value={form.testingMethod} onChange={(e) => setField("testingMethod", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.testingMethod ? "#dc2626" : "#dbe5f0" }}><option value="">Select testing method</option>{METHODS.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError show={showErrors} message={errors.testingMethod} /></div>
              <div className="form-group"><FieldLabel htmlFor="lab" text="Lab Name" required /><input id="lab" value={form.labName} onChange={(e) => setField("labName", e.target.value)} placeholder="Enter lab name" style={{ ...inputStyle, borderColor: showErrors && errors.labName ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.labName} /></div>
              <div className="form-group"><FieldLabel htmlFor="physician-name" text="Physician Name" required /><input id="physician-name" value={form.physicianName} onChange={(e) => setField("physicianName", e.target.value)} placeholder="Enter physician name" style={{ ...inputStyle, borderColor: showErrors && errors.physicianName ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.physicianName} /></div>
              <div className="form-group"><FieldLabel htmlFor="nmc-registration-id" text="NMC Registration ID" required /><input id="nmc-registration-id" value={form.nmcRegistrationId} onChange={(e) => setField("nmcRegistrationId", e.target.value)} placeholder="Enter NMC registration ID" style={{ ...inputStyle, borderColor: showErrors && errors.nmcRegistrationId ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.nmcRegistrationId} /></div>
              <div className="form-group"><FieldLabel htmlFor="fasting" text="Fasting Status" /><select id="fasting" value={form.fastingStatus} onChange={(e) => setField("fastingStatus", e.target.value)} style={inputStyle}><option value="">Select fasting status</option>{FASTING.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
            {hba1cAlert && <p className="message message-error">{hba1cAlert}</p>}
            {oldTest !== null && oldTest > 90 && <p className="message message-error">Test date is older than 90 days.</p>}
            {previousRecord && <p className="message message-success">Trend vs Previous: {trendArrow} {trendValue} from previous HbA1C of {previousRecord.hba1c} on {previousRecord.testDate || "previous record"}.</p>}
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Diabetes Clinical Profile</h3>
            <div style={gridStyle}>
              <div className="form-group"><FieldLabel htmlFor="diabetes-type" text="Diabetes Type" required /><select id="diabetes-type" value={form.diabetesType} onChange={(e) => setField("diabetesType", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.diabetesType ? "#dc2626" : "#dbe5f0" }}><option value="">Select diabetes type</option>{DIABETES_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError show={showErrors} message={errors.diabetesType} /></div>
              <div className="form-group"><FieldLabel htmlFor="diagnosis-year" text="Year of Diagnosis" /><input id="diagnosis-year" maxLength={4} value={form.yearOfDiagnosis} onChange={(e) => { markTouched("yearOfDiagnosis"); setField("yearOfDiagnosis", e.target.value.replace(/\D/g, "").slice(0, 4)); }} onBlur={() => markTouched("yearOfDiagnosis")} placeholder="YYYY" style={{ ...inputStyle, borderColor: (showErrors || touched.yearOfDiagnosis) && errors.yearOfDiagnosis ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors || touched.yearOfDiagnosis} message={errors.yearOfDiagnosis} /></div>
              <div className="form-group"><FieldLabel htmlFor="duration" text="Duration" /><input id="duration" readOnly value={errors.yearOfDiagnosis ? "" : duration} placeholder="Auto-calculated" style={inputStyle} /></div>
            </div>
            <div className="form-group"><FieldLabel text="Treatment Modality" /><CheckGroup options={TREATMENTS} selected={form.treatmentModality} onToggle={(value) => toggle("treatmentModality", value)} /></div>
            <div className="form-group"><FieldLabel text="Current Medications" /><CheckGroup options={MEDS} selected={form.currentMedications} onToggle={(value) => toggle("currentMedications", value)} /></div>
            {form.treatmentModality.includes("Insulin") && <div className="form-group"><FieldLabel htmlFor="insulin-regimen" text="Insulin Regimen" /><select id="insulin-regimen" value={form.insulinRegimen} onChange={(e) => setField("insulinRegimen", e.target.value)} style={{ ...inputStyle, borderColor: showErrors && errors.insulinRegimen ? "#dc2626" : "#dbe5f0" }}><option value="">Select insulin regimen</option>{INSULIN.map((item) => <option key={item} value={item}>{item}</option>)}</select><FieldError show={showErrors} message={errors.insulinRegimen} /></div>}
            <div className="form-group"><FieldLabel text="Comorbidities" /><CheckGroup options={COMORBIDITIES} selected={form.comorbidities} onToggle={(value) => toggle("comorbidities", value)} /></div>
            <div style={gridStyle}>
              <div className="form-group"><FieldLabel htmlFor="sys" text="Systolic BP" /><input id="sys" type="number" value={form.systolicBP} onChange={(e) => setField("systolicBP", e.target.value)} placeholder="mmHg" style={{ ...inputStyle, borderColor: showErrors && errors.systolicBP ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.systolicBP} /></div>
              <div className="form-group"><FieldLabel htmlFor="dia" text="Diastolic BP" /><input id="dia" type="number" value={form.diastolicBP} onChange={(e) => setField("diastolicBP", e.target.value)} placeholder="mmHg" style={{ ...inputStyle, borderColor: showErrors && errors.diastolicBP ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors} message={errors.diastolicBP} /></div>
            </div>
            {bpAlert && <p className="message message-error">{bpAlert}</p>}
          </section>

          <section style={sectionStyle}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Anthropometric & Lifestyle</h3>
            <div style={gridStyle}>
              <div className="form-group"><FieldLabel htmlFor="height" text="Height (cm)" /><input id="height" type="number" step="0.1" value={form.heightCm} onChange={(e) => { markTouched("heightCm"); setField("heightCm", e.target.value); }} onBlur={() => markTouched("heightCm")} placeholder="50 to 250" style={{ ...inputStyle, borderColor: (showErrors || touched.heightCm) && errors.heightCm ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors || touched.heightCm} message={errors.heightCm} /></div>
              <div className="form-group"><FieldLabel htmlFor="weight" text="Weight (kg)" /><input id="weight" type="number" step="0.1" value={form.weightKg} onChange={(e) => { markTouched("weightKg"); setField("weightKg", e.target.value); }} onBlur={() => markTouched("weightKg")} placeholder="10 to 300" style={{ ...inputStyle, borderColor: (showErrors || touched.weightKg) && errors.weightKg ? "#dc2626" : "#dbe5f0" }} /><FieldError show={showErrors || touched.weightKg} message={errors.weightKg} /></div>
              <div className="form-group"><FieldLabel htmlFor="bmi" text="BMI" /><input id="bmi" readOnly value={bmi} placeholder="Auto-calculated" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel text="BMI Category" /><div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#fff" }}>{bmiLabel ? <StatusBadge label={bmiLabel} /> : <span style={{ color: "#64748b" }}>Auto-calculated</span>}</div></div>
              <div className="form-group"><FieldLabel htmlFor="waist" text="Waist Circumference" /><input id="waist" type="number" value={form.waistCircumference} onChange={(e) => setField("waistCircumference", e.target.value)} placeholder="Enter waist circumference" style={inputStyle} /></div>
              <div className="form-group"><FieldLabel htmlFor="diet" text="Diet Type" /><select id="diet" value={form.dietType} onChange={(e) => setField("dietType", e.target.value)} style={inputStyle}><option value="">Select diet type</option>{DIETS.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="activity" text="Physical Activity" /><select id="activity" value={form.physicalActivity} onChange={(e) => setField("physicalActivity", e.target.value)} style={inputStyle}><option value="">Select physical activity</option>{ACTIVITIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="tobacco" text="Tobacco Use" /><select id="tobacco" value={form.tobaccoUse} onChange={(e) => setField("tobaccoUse", e.target.value)} style={inputStyle}><option value="">Select tobacco use</option>{TOBACCO.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
              <div className="form-group"><FieldLabel htmlFor="alcohol" text="Alcohol Use" /><select id="alcohol" value={form.alcoholUse} onChange={(e) => setField("alcoholUse", e.target.value)} style={inputStyle}><option value="">Select alcohol use</option>{ALCOHOL.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            </div>
            {waistAlert && <p className="message message-error">{waistAlert}</p>}
          </section>
          {!isValid && hasStartedForm && (
            <p className="message message-error">
              Save is blocked by: {disabledReasonKeys.join(", ")}
            </p>
          )}
          <button
            className="btn"
            onClick={savePatient}
            disabled={!isValid}
            title={!isValid ? `Blocked by: ${Object.keys(errors).join(", ")}` : "Ready to save"}
          >
            Save Patient
          </button>
          {error && <p className="message message-error">{error}</p>}
          {success && <p className="message message-success">{success}</p>}
        </section>
      </main>
    </div>
  );
}

export default PatientForm;
