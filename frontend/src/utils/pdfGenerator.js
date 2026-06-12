import { jsPDF } from 'jspdf';

export const downloadPrescriptionPDF = (rec) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Color Palette
  const primaryColor = [59, 130, 246]; // Blue theme (#3b82f6)
  const darkColor = [31, 41, 55]; // Gray-800 (#1f2937)
  const lightColor = [243, 244, 246]; // Gray-100 (#f3f4f6)
  const textColor = [55, 65, 81]; // Gray-700 (#374151)
  const accentColor = [5, 150, 105]; // Emerald-600 (#059669)

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 40, 'F');

  // Clinic Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('CarePulse Clinic', 15, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Multi-Specialty Clinical Care & Diagnostics', 15, 24);

  // Clinic Address Info (on the right)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('456 Healthcare Blvd, Medical District, Chennai', 130, 15);
  doc.text('Tel: +91 44 2490 8900 | contact@carepulse.com', 130, 20);
  doc.text('Website: www.carepulse.com', 130, 25);

  // Prescription Rx Header
  doc.setFillColor(...lightColor);
  doc.rect(15, 50, 180, 8, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PRESCRIPTION & MEDICAL RECORD', 20, 56);

  // Patient Info & Prescription Info Grid
  const dateStr = new Date(rec.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const patientName = rec.patientId?.name || 'Walk-in Patient';
  const patientAge = rec.patientId?.age ? `${rec.patientId.age} Years` : 'N/A';
  const patientGender = rec.patientId?.gender || 'N/A';
  const patientPhone = rec.patientId?.phone || 'N/A';
  const doctorName = rec.doctorId?.name ? `Dr. ${rec.doctorId.name}` : 'Attending Physician';
  const doctorSpecialty = rec.doctorId?.specialty || 'General Practitioner';
  const rxId = rec.prescriptionId || `RX-${new Date(rec.createdAt).getFullYear()}-${rec._id.substring(rec._id.length - 6).toUpperCase()}`;

  // Left Column: Patient
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PATIENT INFORMATION', 15, 68);
  doc.setLineWidth(0.3);
  doc.setDrawColor(209, 213, 219);
  doc.line(15, 70, 95, 70);

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${patientName}`, 15, 76);
  doc.text(`Age / Gender: ${patientAge} / ${patientGender}`, 15, 82);
  doc.text(`Phone: ${patientPhone}`, 15, 88);

  // Right Column: Doctor & Rx details
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIPTION DETAILS', 110, 68);
  doc.line(110, 70, 195, 70);

  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(`Rx ID: ${rxId}`, 110, 76);
  doc.text(`Date: ${dateStr}`, 110, 82);
  doc.text(`Doctor: ${doctorName} (${doctorSpecialty})`, 110, 88);

  // Vitals Row (If present)
  let yOffset = 100;
  if (rec.vitals && (rec.vitals.bloodPressure || rec.vitals.heartRate || rec.vitals.weight)) {
    doc.setFillColor(249, 250, 251);
    doc.rect(15, 96, 180, 12, 'F');
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('VITALS:', 20, 104);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    let vitalsStr = '';
    if (rec.vitals.bloodPressure) vitalsStr += `BP: ${rec.vitals.bloodPressure}  |  `;
    if (rec.vitals.heartRate) vitalsStr += `Pulse: ${rec.vitals.heartRate} bpm  |  `;
    if (rec.vitals.weight) vitalsStr += `Weight: ${rec.vitals.weight} kg`;
    if (vitalsStr.endsWith('  |  ')) vitalsStr = vitalsStr.slice(0, -5);
    
    doc.text(vitalsStr, 40, 104);
    yOffset = 118;
  }

  // Clinical Diagnosis
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('CLINICAL DIAGNOSIS', 15, yOffset);
  doc.line(15, yOffset + 2, 195, yOffset + 2);
  
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text(rec.diagnosis || 'None entered', 15, yOffset + 8);

  yOffset += 18;

  // Physician Notes
  if (rec.notes) {
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('PHYSICIAN NOTES & SYMPTOMS', 15, yOffset);
    doc.line(15, yOffset + 2, 195, yOffset + 2);

    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'oblique');
    
    // Auto wrap notes text
    const wrappedNotes = doc.splitTextToSize(rec.notes, 180);
    doc.text(wrappedNotes, 15, yOffset + 8);
    yOffset += 10 + (wrappedNotes.length * 4);
  }

  // Prescriptions Table
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIBED MEDICATIONS', 15, yOffset);
  doc.line(15, yOffset + 2, 195, yOffset + 2);
  yOffset += 8;

  if (rec.prescriptions && rec.prescriptions.length > 0) {
    // Table Header
    doc.setFillColor(...lightColor);
    doc.rect(15, yOffset, 180, 8, 'F');
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 18, yOffset + 5.5);
    doc.text('Medication Name', 30, yOffset + 5.5);
    doc.text('Dosage', 90, yOffset + 5.5);
    doc.text('Frequency', 125, yOffset + 5.5);
    doc.text('Duration', 165, yOffset + 5.5);

    yOffset += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);

    rec.prescriptions.forEach((pr, index) => {
      // Row alternate background
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, yOffset, 180, 8, 'F');
      }
      doc.text((index + 1).toString(), 18, yOffset + 5.5);
      doc.text(pr.drugName.toUpperCase(), 30, yOffset + 5.5);
      doc.text(pr.dosage, 90, yOffset + 5.5);
      doc.text(pr.frequency, 125, yOffset + 5.5);
      doc.text(pr.duration, 165, yOffset + 5.5);
      yOffset += 8;
    });
  } else {
    doc.setTextColor(...textColor);
    doc.setFont('helvetica', 'oblique');
    doc.text('No active medications prescribed.', 15, yOffset + 2);
    yOffset += 10;
  }

  // Footer / Doctor Signature
  const footerY = 265;
  doc.setLineWidth(0.3);
  doc.setDrawColor(209, 213, 219);
  doc.line(125, footerY - 5, 185, footerY - 5);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(doctorName, 125, footerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(doctorSpecialty, 125, footerY + 4);
  doc.text('Registered Medical Practitioner', 125, footerY + 8);

  // Disclaimer / Stamp
  doc.setFillColor(...lightColor);
  doc.rect(15, footerY - 5, 80, 18, 'F');
  doc.setTextColor(...accentColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('✔️ VERIFIED PRESCRIPTION', 20, footerY);
  doc.setTextColor(...textColor);
  doc.setFont('helvetica', 'normal');
  doc.text('CarePulse Digital Signatures secure', 20, footerY + 4);
  doc.text('Valid without physical signature.', 20, footerY + 8);

  // Page Border / Frame
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(1);
  doc.rect(5, 5, 200, 287);

  // Save/Download Action
  doc.save(`prescription-${rxId.toLowerCase()}.pdf`);
};
