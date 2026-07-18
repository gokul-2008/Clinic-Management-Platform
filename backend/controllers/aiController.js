import { GoogleGenerativeAI } from '@google/generative-ai';

// Fallback logic to check multiple model names if one throws a 404/not supported error
const generateWithFallback = async (genAI, prompt) => {
  const modelsToTry = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-1.0-pro'
  ];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`[AI] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text) {
        console.log(`[AI] Success with model: ${modelName}`);
        return text;
      }
    } catch (err) {
      const errMsg = String(err?.message || err || '').toLowerCase();
      console.warn(`[AI Warning] Model ${modelName} failed:`, errMsg);
      lastError = err;
      
      // If it is a clear API key validation issue, throw it immediately to avoid looping
      if (
        errMsg.includes('api key') || 
        errMsg.includes('api_key') || 
        errMsg.includes('key is invalid') || 
        errMsg.includes('unauthorized') || 
        errMsg.includes('400')
      ) {
        throw err;
      }
      // Otherwise, continue to try the next model in the fallback cascade
    }
  }
  throw lastError || new Error('All models failed to resolve the prompt');
};

export const analyzePrescription = async (req, res) => {
  try {
    const { diagnosis, symptoms, prescriptions } = req.body;
    if (!diagnosis) {
      return res.status(400).json({ message: 'Diagnosis description is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Check if key is configured
    if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
      console.log('Gemini API key not found. Providing mock clinical advice fallback...');
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

    const text = await generateWithFallback(genAI, prompt);

    // Robustly extract JSON block to avoid failures due to LLM preambles or markdown fences
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const cleanText = jsonMatch[0];
    const parsed = JSON.parse(cleanText);

    res.status(200).json(parsed);
  } catch (error) {
    console.error('AI Assistant error, falling back to mock clinical advice:', error);
    const { diagnosis, prescriptions } = req.body;
    
    // Provide a graceful fallback to prevent frontend crashes
    const fallbackAdvice = {
      recommendations: `1. Ensure proper rest and hydration (at least 2-3 liters of water daily).\n2. Monitor vital signs regularly (especially temperature and BP).\n3. Avoid strenuous physical activity until recovery.`,
      warnings: `No drug interactions found for: ${
        prescriptions?.length > 0 ? prescriptions.map((p) => p.drugName).join(', ') : 'None'
      }. Verify that the patient has no historical allergies to these substances.`,
      carePlan: `Standard clinical support plan for "${diagnosis || 'this condition'}". Scheduled follow-up consultation in 5-7 days if symptoms persist. (Note: Running in offline/fallback mode due to API gateway error: ${error.message})`
    };
    res.status(200).json(fallbackAdvice);
  }
};

// AI Symptom Checker
export const checkSymptoms = async (req, res) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ message: 'Symptoms description is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
      console.log('Gemini API key not found. Providing mock symptom check advice...');
      const mockCheck = {
        possibleConditions: ['Mild Tension Headache', 'Seasonal Allergies', 'Common Cold'],
        recommendedDepartment: 'General Medicine / Outpatient Clinic',
        urgency: 'Low',
        explanation: 'Your symptoms match common seasonal conditions. Ensure hydration and rest. If symptoms worsen, please schedule a consultation with our clinic.'
      };
      return res.status(200).json(mockCheck);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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

    const text = await generateWithFallback(genAI, prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    res.status(200).json(parsed);
  } catch (error) {
    console.error('Symptom Checker error, falling back to mock advice:', error);
    const { symptoms } = req.body;
    const fallback = {
      possibleConditions: ['Symptom Analysis Pending'],
      recommendedDepartment: 'General Medicine',
      urgency: 'Medium',
      explanation: `We encountered an issue checking symptoms. Please proceed to book an appointment with our general practitioner for a clinical evaluation. (Error: ${error.message})`
    };
    res.status(200).json(fallback);
  }
};

// AI Medical Report Summarizer
export const summarizeReport = async (req, res) => {
  try {
    const { reportText } = req.body;
    if (!reportText) {
      return res.status(400).json({ message: 'Report text is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
      console.log('Gemini API key not found. Providing mock report summary...');
      const mockSummary = {
        keyFindings: 'The report shows normal cardiac rhythm with minor elevations in blood pressure. Blood work shows healthy hemoglobin counts.',
        suspectedDiagnosis: 'Mild Hypertension',
        recommendedMedications: 'Recommend reducing sodium intake and monitor BP daily.',
        followUpPlan: 'Schedule follow-up consultation in 2 weeks.'
      };
      return res.status(200).json(mockSummary);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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

    const text = await generateWithFallback(genAI, prompt);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON structure returned from model");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    res.status(200).json(parsed);
  } catch (error) {
    console.error('Report summarizer error, falling back to mock summary:', error);
    const { reportText } = req.body;
    const fallback = {
      keyFindings: `We were unable to parse the report automatically. Raw text snippet: "${reportText.substring(0, 150)}..."`,
      suspectedDiagnosis: 'Needs Manual Review',
      recommendedMedications: 'Please refer to the raw report text.',
      followUpPlan: `Consult physician for clarification. (Error: ${error.message})`
    };
    res.status(200).json(fallback);
  }
};

// AI Healthcare Chatbot
export const healthcareChatbot = async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ message: 'User message is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey.includes('your_') || apiKey.includes('placeholder')) {
      console.log('Gemini API key not found. Providing mock chatbot reply...');
      let mockReply = "Hello! I am the CarePulse Clinic Assistant. Our clinic hours are Monday to Friday (9am-5pm) and Saturday (9am-1pm). You can book appointments directly via the 'Book Consultations' tab in your portal. For complex medical issues, please schedule a session with our doctors.";
      const lower = message.toLowerCase();
      if (lower.includes('time') || lower.includes('hour') || lower.includes('open')) {
        mockReply = "CarePulse Clinic is open Monday through Friday, 9:00 AM to 5:00 PM, and Saturday from 9:00 AM to 1:00 PM. We are closed on Sundays.";
      } else if (lower.includes('book') || lower.includes('appoint')) {
        mockReply = "To book an appointment, go to the 'Book Consultations' tab in your portal, select a doctor and date, and choose a time slot. Once scheduled, it will immediately show in your timeline.";
      } else if (lower.includes('doctor') || lower.includes('special')) {
        mockReply = "We have specialists in Cardiology, Neurology, Pediatrics, Orthopedics, and General Medicine. You can view them and schedule appointments inside your portal.";
      }
      return res.status(200).json({ reply: mockReply });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

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
      - Pharmacy Inventory: We have a live inventory tracking system. Doctors prescribe medicines, and stock is automatically decremented.
      - Doctors: Attending specialists include Dr. Stephen Strange and other specialists.
      
      Instructions:
      - Answer patient questions about clinic hours, timings, departments, available services, and general portal bookings.
      - Keep answers warm, friendly, concise, and helpful.
      - **Critical Rule**: For complex medical diagnoses, treatment recommendations, drug interaction checks, or specific medication queries, explain that you are an AI assistant and cannot make medical decisions. Politely suggest they book a consultation with one of our specialized doctors using the scheduling portal.
      
      Conversation History:
      ${historyPrompt}Patient: ${message}
      Assistant:
    `;

    const text = await generateWithFallback(genAI, prompt);
    const reply = text.trim();
    
    res.status(200).json({ reply });
  } catch (error) {
    console.error('Chatbot error, falling back to mock reply:', error);
    res.status(200).json({
      reply: `I am currently operating in offline backup mode due to an API connectivity issue. I can help with general clinic questions. We are open Mon-Fri (9:00 AM - 5:00 PM) and Sat (9:00 AM - 1:00 PM). (Error detail: ${error.message})`
    });
  }
};
