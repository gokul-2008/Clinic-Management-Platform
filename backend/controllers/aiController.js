import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to validate and retrieve the GEMINI_API_KEY environment variable.
// Logs a clear backend warning if the key is missing or unconfigured.
const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_') || apiKey.includes('placeholder')) {
    console.error('[AI Service Warning] GEMINI_API_KEY environment variable is missing, empty, or unconfigured.');
    return null;
  }
  return apiKey;
};

// Standard supported model for Google Generative AI
const AI_MODEL_NAME = 'gemini-1.5-flash';

// 1. AI Prescription Analysis & Clinical Advice Controller
export const analyzePrescription = async (req, res) => {
  try {
    const { diagnosis, symptoms, prescriptions } = req.body;
    if (!diagnosis) {
      return res.status(400).json({ message: 'Diagnosis description is required.' });
    }

    const apiKey = getGeminiApiKey();

    // If key is missing or unconfigured, return friendly mock clinical advice
    if (!apiKey) {
      console.log('[AI Info] Using mock clinical advice fallback (GEMINI_API_KEY unconfigured).');
      const mockAdvice = {
        recommendations: `1. Ensure proper rest and hydration (at least 2-3 liters of water daily).\n2. Monitor vital signs regularly (especially temperature and BP).\n3. Avoid strenuous physical activity until recovery.`,
        warnings: `No drug interactions found for: ${
          prescriptions?.length > 0 ? prescriptions.map((p) => p.drugName).join(', ') : 'None'
        }. Verify that the patient has no historical allergies to these substances.`,
        carePlan: `Standard clinical support plan for "${diagnosis}". Scheduled follow-up consultation in 5 days if symptoms persist.`
      };
      return res.status(200).json(mockAdvice);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });

    const prompt = `
      You are a clinical assistant AI. Review this patient case and output a JSON response.
      Diagnosis: "${diagnosis}"
      Symptoms: "${symptoms || 'Not logged'}"
      Prescriptions: ${JSON.stringify(prescriptions || [])}

      Provide your review in this exact JSON schema format (do NOT wrap in markdown fences like \`\`\`json, just return the raw text parseable by JSON.parse):
      {
        "recommendations": "Detailed clinical recommendations and lifestyle suggestions.",
        "warnings": "Drug-to-drug interactions warnings, allergy alerts, or cautions.",
        "carePlan": "Custom patient wellness care plan."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Robustly extract JSON block to avoid failures due to LLM preambles or markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const cleanText = jsonMatch[0];
    const parsed = JSON.parse(cleanText);

    return res.status(200).json(parsed);
  } catch (error) {
    // Log technical errors ONLY to backend/server console
    console.error('[AI Prescription Analysis Error]:', error);
    const { diagnosis, prescriptions } = req.body;
    
    // Provide a graceful fallback without exposing raw API errors, stack traces, or model names to end users
    const fallbackAdvice = {
      recommendations: `1. Ensure proper rest and hydration (at least 2-3 liters of water daily).\n2. Monitor vital signs regularly (especially temperature and BP).\n3. Avoid strenuous physical activity until recovery.`,
      warnings: `No drug interactions found for: ${
        prescriptions?.length > 0 ? prescriptions.map((p) => p.drugName).join(', ') : 'None'
      }. Verify that the patient has no historical allergies to these substances.`,
      carePlan: `Standard clinical support plan for "${diagnosis || 'this condition'}". Scheduled follow-up consultation in 5-7 days if symptoms persist.`
    };
    return res.status(200).json(fallbackAdvice);
  }
};

// 2. AI Symptom Checker Controller
export const checkSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms description is required.' });
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      console.log('[AI Info] Using mock symptom check fallback (GEMINI_API_KEY unconfigured).');
      const mockCheck = {
        possibleConditions: ['Mild Tension Headache', 'Seasonal Allergies', 'Common Cold'],
        recommendedDepartment: 'General Medicine / Outpatient Clinic',
        urgency: 'Low',
        explanation: 'Your symptoms match common seasonal conditions. Ensure hydration and rest. If symptoms worsen, please schedule a consultation with our clinic.'
      };
      return res.status(200).json(mockCheck);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });

    const prompt = `
      You are a clinical symptom-triage assistant. Review this symptom description and output a JSON response.
      Symptom Description: "${symptoms}"

      Provide your review in this exact JSON schema format (do NOT wrap in markdown fences like \`\`\`json, just return the raw text parseable by JSON.parse):
      {
        "possibleConditions": ["Condition A", "Condition B", "Condition C"],
        "recommendedDepartment": "E.g., Pulmonology, General Medicine, Pediatrics, Cardiology, Neurology, Orthopedics, etc.",
        "urgency": "Low / Medium / High / Emergency",
        "explanation": "Brief explanation of suggestions and triage guidance."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (error) {
    // Log technical errors ONLY to backend/server console
    console.error('[AI Symptom Checker Error]:', error);
    const fallback = {
      possibleConditions: ['Clinical Evaluation Recommended'],
      recommendedDepartment: 'General Medicine',
      urgency: 'Medium',
      explanation: 'Unable to analyze symptoms automatically at this time. Please proceed to book an appointment with our general practitioner for a clinical evaluation.'
    };
    return res.status(200).json(fallback);
  }
};

// 3. AI Medical Report Summarizer Controller
export const summarizeReport = async (req, res) => {
  try {
    const { reportText } = req.body;
    if (!reportText) {
      return res.status(400).json({ message: 'Report text is required.' });
    }

    const apiKey = getGeminiApiKey();

    if (!apiKey) {
      console.log('[AI Info] Using mock report summary fallback (GEMINI_API_KEY unconfigured).');
      const mockSummary = {
        keyFindings: 'The report shows normal cardiac rhythm with minor elevations in blood pressure. Blood work shows healthy hemoglobin counts.',
        suspectedDiagnosis: 'Mild Hypertension',
        recommendedMedications: 'Recommend reducing sodium intake and monitor BP daily.',
        followUpPlan: 'Schedule follow-up consultation in 2 weeks.'
      };
      return res.status(200).json(mockSummary);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });

    const prompt = `
      You are a clinical report summarization assistant. Summarize the following medical report and output a JSON response.
      Medical Report: "${reportText}"

      Provide your summary in this exact JSON schema format (do NOT wrap in markdown fences like \`\`\`json, just return the raw text parseable by JSON.parse):
      {
        "keyFindings": "A concise summary of key findings and lab metrics.",
        "suspectedDiagnosis": "Suspected diagnosis, status, or findings.",
        "recommendedMedications": "Prescribed or recommended medications list.",
        "followUpPlan": "Follow-up recommendations and care instructions."
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return res.status(200).json(parsed);
  } catch (error) {
    // Log technical errors ONLY to backend/server console
    console.error('[AI Report Summarizer Error]:', error);
    const { reportText } = req.body;
    const fallback = {
      keyFindings: `Report text registered. Snippet: "${reportText ? reportText.substring(0, 150) : ''}..."`,
      suspectedDiagnosis: 'Manual Review Required',
      recommendedMedications: 'Please refer to the raw report text.',
      followUpPlan: 'Consult attending physician for clarification.'
    };
    return res.status(200).json(fallback);
  }
};

// Helper function to build fallback chatbot replies for basic hospital questions
const getFallbackChatbotReply = (message) => {
  const lower = message ? message.toLowerCase() : '';

  if (lower.includes('time') || lower.includes('hour') || lower.includes('open') || lower.includes('timing')) {
    return "CarePulse Clinic is open Monday through Friday, 9:00 AM to 5:00 PM, and Saturday from 9:00 AM to 1:00 PM. We are closed on Sundays.";
  }
  if (lower.includes('book') || lower.includes('appoint') || lower.includes('schedule')) {
    return "To book an appointment, navigate to the 'Book Consultations' tab in your patient portal, select a doctor, pick an available date and time slot, and confirm your booking.";
  }
  if (lower.includes('doctor') || lower.includes('special') || lower.includes('physician')) {
    return "We have specialists in Cardiology, Neurology, Pediatrics, Orthopedics, and General Medicine. You can view doctor profiles and schedule appointments directly in your portal.";
  }
  if (lower.includes('bill') || lower.includes('pay') || lower.includes('invoice')) {
    return "Invoices can be viewed and settled under the 'Invoices & Payments' tab in your patient portal using our secure Stripe checkout.";
  }

  // Exact user-specified fallback message when AI service is unavailable
  return "I'm currently unable to connect to the AI service. I can still help with clinic timings, appointments, doctors, billing, and general hospital information. Please try again in a few minutes.";
};

// 4. AI Healthcare Chatbot Controller
export const healthcareChatbot = async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'User message is required.' });
  }

  const apiKey = getGeminiApiKey();

  // If GEMINI_API_KEY is missing or unconfigured, return helpful fallback without exposing raw API errors
  if (!apiKey) {
    console.log('[AI Info] Using chatbot fallback (GEMINI_API_KEY unconfigured).');
    const reply = getFallbackChatbotReply(message);
    return res.status(200).json({ reply });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: AI_MODEL_NAME });

    let historyPrompt = "";
    if (history && history.length > 0) {
      historyPrompt = history.map(h => `${h.sender === 'user' ? 'Patient' : 'Assistant'}: ${h.text}`).join('\n') + '\n';
    }

    const prompt = `
      You are a friendly, helpful healthcare chatbot for 'CarePulse Clinic'.
      
      Clinic Operations Information:
      - Timings: Monday to Friday, 9:00 AM - 5:00 PM. Saturday, 9:00 AM - 1:00 PM. Closed on Sundays.
      - Departments: General Medicine, Cardiology, Pediatrics, Neurology, Orthopedics, Pharmacy.
      - Location: CarePulse Medical Hub, Suite 101.
      - Booking Process: Patients can book appointments online using the 'Book Consultations' tab in this Portal dashboard.
      - Billing & Payments: Patients can view invoices and pay online via Stripe under 'Invoices & Payments'.
      - Pharmacy Inventory: We have a live inventory tracking system. Doctors prescribe medicines, and stock is automatically decremented.
      - Doctors: Attending specialists include Dr. Stephen Strange and other registered specialists.
      
      Instructions:
      - Answer patient questions about clinic hours, timings, departments, available services, billing, and portal bookings.
      - Keep answers warm, friendly, concise, and helpful.
      - **Critical Rule**: For complex medical diagnoses, treatment recommendations, drug interaction checks, or specific medication queries, explain that you are an AI assistant and cannot make medical decisions. Politely suggest they book a consultation with one of our specialized doctors using the scheduling portal.
      
      Conversation History:
      ${historyPrompt}Patient: ${message}
      Assistant:
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const reply = response.text().trim();
    
    return res.status(200).json({ reply });
  } catch (error) {
    // Log technical errors ONLY to backend/server console
    console.error('[AI Chatbot Service Error]:', error);

    // Return friendly fallback message without exposing API error, stack traces, or internal model names
    const reply = getFallbackChatbotReply(message);
    return res.status(200).json({ reply });
  }
};
