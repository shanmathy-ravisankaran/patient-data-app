import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabaseClient";

const AUTH_KEY = "patientDataAppAuth";

const AppStoreContext = createContext(null);

function readStorage(key, fallbackValue) {
  try {
    const savedValue = localStorage.getItem(key);

    if (!savedValue) {
      return fallbackValue;
    }

    return JSON.parse(savedValue);
  } catch (error) {
    return fallbackValue;
  }
}

function formatAuditLog(row) {
  return {
    id: row.id,
    action: "Patient Created",
    patientId: row.patient_id,
    patientAbhaId: row.patients?.abha_id || "",
    type: row.field_name,
    from: row.old_value,
    to: row.new_value,
    timestamp: new Date(row.created_at).toLocaleString()
  };
}

function buildAuditRows(patientId, patientRecord) {
  const rows = [
    ["ABHA ID", patientRecord.abhaId],
    ["Patient Name", patientRecord.name],
    ["Date of Birth", patientRecord.dateOfBirth],
    ["Age", patientRecord.age],
    ["Gender", patientRecord.gender],
    ["Mobile Number", patientRecord.mobileNumber],
    ["Aadhaar Last 4", patientRecord.aadhaarLast4 || "--"],
    ["State", patientRecord.state],
    ["District", patientRecord.district],
    ["City", patientRecord.city],
    ["Taluk / Block", patientRecord.talukOrBlock || "--"],
    ["Village / Town", patientRecord.villageOrTown || "--"],
    ["Religion", patientRecord.religion || "--"],
    ["Category", patientRecord.category || "--"],
    ["Socioeconomic Class", patientRecord.socioeconomicClass || "--"],
    ["Preferred Language", patientRecord.preferredLanguage || "--"],
    ["PIN Code", patientRecord.pinCode],
    ["HbA1C (%)", patientRecord.hba1c],
    ["HbA1C (mmol/mol)", patientRecord.hba1cMmol],
    ["Glycaemic Status", patientRecord.glycaemicStatus],
    ["Test Date", patientRecord.testDate],
    ["Testing Method", patientRecord.testingMethod],
    ["Lab Name", patientRecord.labName],
    ["Physician Name", patientRecord.physicianName],
    ["NMC Registration ID", patientRecord.nmcRegistrationId],
    ["Ordering Physician", patientRecord.orderingPhysician],
    ["Fasting Status", patientRecord.fastingStatus],
    ["Trend vs Previous", patientRecord.trendVsPrevious],
    ["Diabetes Type", patientRecord.diabetesType],
    ["Year of Diagnosis", patientRecord.yearOfDiagnosis || "--"],
    ["Duration", patientRecord.duration || "--"],
    [
      "Treatment Modality",
      patientRecord.treatmentModality.length > 0
        ? patientRecord.treatmentModality.join(", ")
        : "--"
    ],
    [
      "Current Medications",
      patientRecord.currentMedications.length > 0
        ? patientRecord.currentMedications.join(", ")
        : "--"
    ],
    ["Insulin Regimen", patientRecord.insulinRegimen || "--"],
    [
      "Comorbidities",
      patientRecord.comorbidities.length > 0
        ? patientRecord.comorbidities.join(", ")
        : "--"
    ],
    ["Blood Pressure", patientRecord.bloodPressure],
    ["Height (cm)", patientRecord.heightCm || "--"],
    ["Weight (kg)", patientRecord.weightKg || "--"],
    ["BMI", patientRecord.bmi || "--"],
    ["BMI Category", patientRecord.bmiCategory || "--"],
    ["Waist Circumference", patientRecord.waistCircumference || "--"],
    ["Diet Type", patientRecord.dietType || "--"],
    ["Physical Activity", patientRecord.physicalActivity || "--"],
    ["Tobacco Use", patientRecord.tobaccoUse || "--"],
    ["Alcohol Use", patientRecord.alcoholUse || "--"]
  ];

  return rows.map(([field_name, new_value]) => ({
    patient_id: patientId,
    field_name,
    old_value: "--",
    new_value: String(new_value ?? "--")
  }));
}

export function AppProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    readStorage(AUTH_KEY, false)
  );

  useEffect(() => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(isAuthenticated));
  }, [isAuthenticated]);

  const refreshPatients = async () => {
    if (!isSupabaseConfigured) {
      setPatients([]);
      return;
    }

    const { data, error } = await supabase
      .from("patients")
      .select("id, abha_id, name, dob, age, gender, mobile, aadhaar_last4, created_at")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPatients(
        data.map((row) => ({
          id: row.id,
          abhaId: row.abha_id,
          name: row.name,
          dateOfBirth: row.dob,
          age: row.age,
          gender: row.gender,
          mobileNumber: row.mobile,
          aadhaarLast4: row.aadhaar_last4,
          createdAt: row.created_at
        }))
      );
    }
  };

  const refreshAuditLogs = async () => {
    if (!isSupabaseConfigured) {
      setAuditLogs([]);
      return;
    }

    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, patient_id, field_name, old_value, new_value, created_at, patients(abha_id)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAuditLogs(data.map(formatAuditLog));
    }
  };

  useEffect(() => {
    refreshPatients();
    refreshAuditLogs();
  }, []);

  const savePatientRecord = async (patientRecord) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        message: "Update your Supabase URL and publishable key before saving."
      };
    }

    const isDuplicate = patients.some(
      (patient) =>
        patient.name.trim().toLowerCase() === patientRecord.name.trim().toLowerCase() &&
        Number(patient.age) === Number(patientRecord.age)
    );

    if (isDuplicate) {
      return {
        success: false,
        message: "A patient with the same name and age already exists."
      };
    }

    const { data: patientRow, error: patientError } = await supabase
      .from("patients")
      .insert({
        abha_id: patientRecord.abhaId,
        name: patientRecord.name,
        dob: patientRecord.dateOfBirth || null,
        age: patientRecord.age,
        gender: patientRecord.gender,
        mobile: patientRecord.mobileNumber,
        aadhaar_last4: patientRecord.aadhaarLast4 || null
      })
      .select("id")
      .single();

    if (patientError || !patientRow) {
      return {
        success: false,
        message: patientError?.message || "Failed to save patient."
      };
    }

    const patientId = patientRow.id;

    const writes = [
      supabase.from("demographics").insert({
        patient_id: patientId,
        state: patientRecord.state,
        district: patientRecord.district,
        city: patientRecord.city,
        pin_code: patientRecord.pinCode
      }),
      supabase.from("hba1c_records").insert({
        patient_id: patientId,
        hba1c_percent: patientRecord.hba1c,
        hba1c_mmol: patientRecord.hba1cMmol,
        glycaemic_status: patientRecord.glycaemicStatus,
        test_date: patientRecord.testDate || null,
        testing_method: patientRecord.testingMethod,
        lab_name: patientRecord.labName,
        fasting_status: patientRecord.fastingStatus
      }),
      supabase.from("clinical_profile").insert({
        patient_id: patientId,
        diabetes_type: patientRecord.diabetesType,
        diagnosis_year: patientRecord.yearOfDiagnosis || null,
        duration: patientRecord.duration || null,
        blood_pressure_systolic: patientRecord.systolicBP || null,
        blood_pressure_diastolic: patientRecord.diastolicBP || null
      }),
      supabase.from("lifestyle").insert({
        patient_id: patientId,
        height: patientRecord.heightCm || null,
        weight: patientRecord.weightKg || null,
        bmi: patientRecord.bmi || null,
        waist: patientRecord.waistCircumference || null,
        diet_type: patientRecord.dietType || null,
        physical_activity: patientRecord.physicalActivity || null,
        tobacco_use: patientRecord.tobaccoUse || null,
        alcohol_use: patientRecord.alcoholUse || null
      }),
      supabase.from("audit_logs").insert(buildAuditRows(patientId, patientRecord))
    ];

    const results = await Promise.all(writes);
    const failedWrite = results.find((result) => result.error);

    if (failedWrite?.error) {
      return {
        success: false,
        message: failedWrite.error.message || "Patient was only partially saved."
      };
    }

    await Promise.all([refreshPatients(), refreshAuditLogs()]);

    return {
      success: true,
      message: "Patient saved successfully."
    };
  };

  const login = () => {
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AppStoreContext.Provider
      value={{
        patients,
        auditLogs,
        isAuthenticated,
        savePatientRecord,
        refreshPatients,
        refreshAuditLogs,
        login,
        logout
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppStoreContext);

  if (!context) {
    throw new Error("useAppStore must be used inside AppProvider");
  }

  return context;
}
