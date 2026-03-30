import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import { isSupabaseConfigured, supabase } from "../supabaseClient";

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px"
};

const sectionStyle = {
  marginTop: "20px",
  padding: "20px",
  border: "1px solid #dbe5f0",
  borderRadius: "16px",
  background: "#f8fafc"
};

function DetailItem({ label, value }) {
  return (
    <div>
      <strong style={{ display: "block", marginBottom: "6px" }}>{label}</strong>
      <span>{value || "--"}</span>
    </div>
  );
}

function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPatient() {
      if (!isSupabaseConfigured) {
        setError("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("patients")
        .select(
          `
            id,
            abha_id,
            name,
            dob,
            age,
            gender,
            mobile,
            aadhaar_last4,
            demographics (*),
            hba1c_records (*),
            clinical_profile (*),
            lifestyle (*)
          `
        )
        .eq("id", id)
        .single();

      if (fetchError || !data) {
        setError(fetchError?.message || "Unable to load patient details.");
        setIsLoading(false);
        return;
      }

      const demographics = data.demographics?.[0] || {};
      const hba1cRecord = data.hba1c_records?.[0] || {};
      const clinicalProfile = data.clinical_profile?.[0] || {};
      const lifestyle = data.lifestyle?.[0] || {};

      setPatient({
        abhaId: data.abha_id,
        name: data.name,
        age: data.age,
        gender: data.gender,
        mobileNumber: data.mobile,
        aadhaarLast4: data.aadhaar_last4,
        dateOfBirth: data.dob,
        state: demographics.state,
        district: demographics.district,
        city: demographics.city,
        pinCode: demographics.pin_code,
        hba1c: hba1cRecord.hba1c_percent,
        hba1cMmol: hba1cRecord.hba1c_mmol,
        glycaemicStatus: hba1cRecord.glycaemic_status,
        testDate: hba1cRecord.test_date,
        testingMethod: hba1cRecord.testing_method,
        labName: hba1cRecord.lab_name,
        fastingStatus: hba1cRecord.fasting_status,
        diabetesType: clinicalProfile.diabetes_type,
        diagnosisYear: clinicalProfile.diagnosis_year,
        duration: clinicalProfile.duration,
        bloodPressure: clinicalProfile.blood_pressure_systolic || clinicalProfile.blood_pressure_diastolic
          ? `${clinicalProfile.blood_pressure_systolic || "--"}/${clinicalProfile.blood_pressure_diastolic || "--"}`
          : "--",
        height: lifestyle.height,
        weight: lifestyle.weight,
        bmi: lifestyle.bmi,
        waist: lifestyle.waist,
        dietType: lifestyle.diet_type,
        physicalActivity: lifestyle.physical_activity,
        tobaccoUse: lifestyle.tobacco_use,
        alcoholUse: lifestyle.alcohol_use
      });
      setIsLoading(false);
    }

    loadPatient();
  }, [id]);

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="page-card">
          <div className="page-header">
            <h2>Patient Details</h2>
            <p>Review the full patient record in one place.</p>
          </div>

          <button
            className="btn btn-secondary"
            onClick={() => navigate("/history")}
            style={{ marginBottom: "16px" }}
          >
            Back to History
          </button>

          {isLoading && <p className="empty-state">Loading patient details...</p>}
          {!isLoading && error && <p className="message message-error">{error}</p>}

          {!isLoading && patient && (
            <>
              <section style={sectionStyle}>
                <h3 style={{ marginTop: 0 }}>Patient Summary</h3>
                <div style={detailGridStyle}>
                  <DetailItem label="ABHA ID" value={patient.abhaId} />
                  <DetailItem label="Patient Name" value={patient.name} />
                  <DetailItem label="Age" value={patient.age} />
                  <DetailItem label="Gender" value={patient.gender} />
                  <DetailItem label="Date of Birth" value={patient.dateOfBirth} />
                  <DetailItem label="Mobile Number" value={patient.mobileNumber} />
                </div>
              </section>

              <section style={sectionStyle}>
                <h3 style={{ marginTop: 0 }}>HbA1C Details</h3>
                <div style={detailGridStyle}>
                  <DetailItem label="HbA1C (%)" value={patient.hba1c} />
                  <DetailItem label="HbA1C (mmol/mol)" value={patient.hba1cMmol} />
                  <DetailItem label="Glycaemic Status" value={patient.glycaemicStatus} />
                  <DetailItem label="Test Date" value={patient.testDate} />
                  <DetailItem label="Testing Method" value={patient.testingMethod} />
                  <DetailItem label="Lab Name" value={patient.labName} />
                  <DetailItem label="Fasting Status" value={patient.fastingStatus} />
                </div>
              </section>

              <section style={sectionStyle}>
                <h3 style={{ marginTop: 0 }}>Clinical Profile</h3>
                <div style={detailGridStyle}>
                  <DetailItem label="Diabetes Type" value={patient.diabetesType} />
                  <DetailItem label="Diagnosis Year" value={patient.diagnosisYear} />
                  <DetailItem label="Duration" value={patient.duration} />
                  <DetailItem label="Blood Pressure" value={patient.bloodPressure} />
                  <DetailItem label="State" value={patient.state} />
                  <DetailItem label="District" value={patient.district} />
                  <DetailItem label="City" value={patient.city} />
                  <DetailItem label="PIN Code" value={patient.pinCode} />
                </div>
              </section>

              <section style={sectionStyle}>
                <h3 style={{ marginTop: 0 }}>Lifestyle Data</h3>
                <div style={detailGridStyle}>
                  <DetailItem label="Height" value={patient.height} />
                  <DetailItem label="Weight" value={patient.weight} />
                  <DetailItem label="BMI" value={patient.bmi} />
                  <DetailItem label="Waist Circumference" value={patient.waist} />
                  <DetailItem label="Diet Type" value={patient.dietType} />
                  <DetailItem label="Physical Activity" value={patient.physicalActivity} />
                  <DetailItem label="Tobacco Use" value={patient.tobaccoUse} />
                  <DetailItem label="Alcohol Use" value={patient.alcoholUse} />
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default PatientDetails;
