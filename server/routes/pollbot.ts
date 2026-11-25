import { GoogleGenAI } from '@google/genai';
import { Router } from 'express';
import { db } from '../db.ts';

export const pollbotRouter = Router();

export interface FaqItem {
  id: string;
  topic: string;
  question: { en: string; ta: string; hi: string };
  answer: { en: string; ta: string; hi: string };
}

export const POLLBOT_FAQS: FaqItem[] = [
  {
    id: 'faq-services',
    topic: 'Voter Services',
    question: {
      en: 'What services are available on Smart Election Portal?',
      ta: 'ஸ்மார்ட் தேர்தல் போர்ட்டலில் என்ன சேவைகள் கிடைக்கின்றன?',
      hi: 'स्मार्ट इलेक्शन पोर्टल पर कौन-सी सेवाएं उपलब्ध हैं?',
    },
    answer: {
      en: 'You can explore voter registration demonstrations, submit and track service applications, view your Digital Voter Profile (demonstration only), locate fictional polling stations, inspect neutral candidate profiles, file grievances, and test simulated face & QR verification workflows.',
      ta: 'வாக்காளர் பதிவு செயல்முறை, விண்ணப்ப சமர்ப்பிப்பு மற்றும் கண்காணிப்பு, டிஜிட்டல் வாக்காளர் சுயவிவரம் (மாதிரி), வாக்குச்சாவடி தேடல், வேட்பாளர் விவரங்கள், புகார் பதிவு மற்றும் சிமுலேஷன் சரிபார்ப்பு ஆகியவற்றை நீங்கள் பயன்படுத்தலாம்.',
      hi: 'आप मतदाता पंजीकरण डेमो, आवेदन जमा और ट्रैकिंग, डिजिटल मतदाता प्रोफ़ाइल (केवल प्रदर्शन), मतदान केंद्र खोज, तटस्थ उम्मीदवार जानकारी, शिकायत पोर्टल और सिमुलेटेड सत्यापन का उपयोग कर सकते हैं।',
    },
  },
  {
    id: 'faq-tracking',
    topic: 'Application Tracking',
    question: {
      en: 'How do I track my submitted demonstration application?',
      ta: 'சமர்ப்பித்த மாதிரி விண்ணப்பத்தின் நிலையை எவ்வாறு கண்காணிப்பது?',
      hi: 'मैं अपने जमा किए गए डेमो आवेदन की स्थिति कैसे ट्रैक करूं?',
    },
    answer: {
      en: 'Open the Applications page or your Voter Dashboard and enter your unique reference number (for example, APP-DEMO-2026-1001). You will see the current status and a timestamped history of every officer review.',
      ta: 'விண்ணப்பங்கள் பக்கம் அல்லது உங்கள் டாஷ்போர்டில் உங்கள் குறிப்பு எண்ணை (உதா: APP-DEMO-2026-1001) உள்ளிடவும். தற்போதைய நிலை மற்றும் அதிகாரியின் முழு வரலாற்றையும் காணலாம்.',
      hi: 'आवेदन पृष्ठ या अपने डैशबोर्ड में अपना संदर्भ नंबर (जैसे APP-DEMO-2026-1001) दर्ज करें। आप वर्तमान स्थिति और अधिकारी समीक्षा का पूरा समय-वार इतिहास देख सकते हैं।',
    },
  },
  {
    id: 'faq-stations',
    topic: 'Polling Stations',
    question: {
      en: 'How can I find a polling station and check accessibility facilities?',
      ta: 'வாக்குச்சாவடி மற்றும் மாற்றுத்திறனாளி வசதிகளை எவ்வாறு தேடுவது?',
      hi: 'मैं मतदान केंद्र और सुगम्यता सुविधाएं कैसे खोज सकता हूं?',
    },
    answer: {
      en: 'Visit the Polling Stations page and search by PIN code, district, constituency, or station name. Each station card lists wheelchair ramps, tactile paths, drinking water, map coordinates, and directions.',
      ta: 'வாக்குச்சாவடிகள் பக்கத்தில் அஞ்சல் குறியீடு, மாவட்டம், தொகுதி அல்லது பெயர் மூலம் தேடவும். சக்கர நாற்காலி சாய்வுதளம், குடிநீர், வரைபடம் மற்றும் வழிகாட்டுதல் விவரங்கள் காண்பிக்கப்படும்.',
      hi: 'मतदान केंद्र पृष्ठ पर पिन कोड, जिला, निर्वाचन क्षेत्र या केंद्र के नाम से खोजें। प्रत्येक केंद्र पर रैंप, पेयजल, मानचित्र और दिशा-निर्देश दिखाई देते हैं।',
    },
  },
  {
    id: 'faq-candidates',
    topic: 'Candidate Information',
    question: {
      en: 'Can I compare candidates side by side?',
      ta: 'வேட்பாளர்களை அருகருகே ஒப்பிட்டு பார்க்க முடியுமா?',
      hi: 'क्या मैं उम्मीदवारों की साथ-साथ तुलना कर सकता हूं?',
    },
    answer: {
      en: 'Yes. On the Candidates directory page, filter by constituency or political party and select up to three candidates to compare their education, experience, manifesto summary, and declaration links side by side neutrally.',
      ta: 'ஆம். வேட்பாளர்கள் பக்கத்தில் தொகுதி அல்லது கட்சி வாரியாக வடிகட்டி, மூன்று வேட்பாளர்களைத் தேர்ந்தெடுத்து கல்வி, அனுபவம் மற்றும் தேர்தல் அறிக்கையை நடுநிலையாக ஒப்பிடலாம்.',
      hi: 'हाँ। उम्मीदवार निर्देशिका पृष्ठ पर निर्वाचन क्षेत्र या पार्टी के अनुसार फ़िल्टर करें और शिक्षा, अनुभव व घोषणापत्र की तटस्थ तुलना के लिए तीन तक उम्मीदवार चुनें।',
    },
  },
  {
    id: 'faq-complaints',
    topic: 'Complaint Submission',
    question: {
      en: 'How do I submit and follow up on a grievance?',
      ta: 'புகார் பதிவு செய்து அதன் நிலையை எவ்வாறு பார்ப்பது?',
      hi: 'मैं शिकायत कैसे दर्ज करूं और उसकी स्थिति कैसे देखूं?',
    },
    answer: {
      en: 'Sign in as a voter, open the Complaints portal, choose a category (Application Issue, Polling Information, Accessibility Issue, Portal Technical Issue, or General Enquiry), and submit your description. You receive a reference ID immediately and only you and authorized officers can view your complaint.',
      ta: 'வாக்காளராக உள்நுழைந்து, புகார்கள் பக்கத்தில் வகையைத் தேர்ந்தெடுத்து சமர்ப்பிக்கவும். உடனடி குறிப்பு எண் வழங்கப்படும்; உங்கள் புகாரை நீங்களும் அதிகாரிகளும் மட்டுமே பார்க்க முடியும்.',
      hi: 'मतदाता के रूप में साइन इन करें, शिकायत पोर्टल खोलें, श्रेणी चुनें और विवरण जमा करें। आपको तुरंत संदर्भ संख्या मिलती है और केवल आप तथा अधिकृत अधिकारी इसे देख सकते हैं।',
    },
  },
  {
    id: 'faq-verification',
    topic: 'Simulated Verification',
    question: {
      en: 'Does Face Verification Demo collect my real photo or biometrics?',
      ta: 'முக சரிபார்ப்பு செயல்முறை எனது உண்மையான புகைப்படத்தை சேகரிக்குமா?',
      hi: 'क्या फेस वेरिफिकेशन डेमो मेरी वास्तविक तस्वीर या बायोमेट्रिक्स एकत्र करता है?',
    },
    answer: {
      en: 'No. The Face Verification Demonstration never accesses your camera and never collects, processes, or stores real facial images, embeddings, or biometric templates. It uses fictional demonstration profiles strictly for academic workflow illustration.',
      ta: 'இல்லை. முக சரிபார்ப்பு செயல்முறை உங்கள் கேமராவை அணுகாது; எந்த உண்மையான புகைப்படமோ பயோமெட்ரிக் தரவோ சேகரிக்கப்படாது. கற்பனை மாதிரி சுயவிவரங்கள் மட்டுமே பயன்படுத்தப்படுகின்றன.',
      hi: 'नहीं। फेस वेरिफिकेशन डेमो न तो कैमरा एक्सेस करता है और न ही वास्तविक चेहरे की छवि या बायोमेट्रिक डेटा संग्रहीत करता है। यह केवल काल्पनिक डेमो प्रोफ़ाइल का उपयोग करता है।',
    },
  },
  {
    id: 'faq-voting',
    topic: 'Election Awareness',
    question: {
      en: 'Can I cast an official vote or register as an official voter here?',
      ta: 'இங்கே உண்மையான வாக்குப்பதிவு அல்லது அதிகாரப்பூர்வ பதிவு செய்ய முடியுமா?',
      hi: 'क्या मैं यहां आधिकारिक वोट डाल सकता हूं या आधिकारिक पंजीकरण कर सकता हूं?',
    },
    answer: {
      en: 'No. This is an independent educational demonstration project. It is not affiliated with the Election Commission of India or any government authority, and it does not conduct online voting, ballot casting, or official voter registration.',
      ta: 'இல்லை. இது ஒரு சுயாதீன கல்வி செயல்முறை திட்டம் மட்டுமே. இது இந்திய தேர்தல் ஆணையத்துடன் இணைக்கப்படவில்லை மற்றும் ஆன்லைன் வாக்குப்பதிவு நடத்தாது.',
      hi: 'नहीं। यह एक स्वतंत्र शैक्षिक प्रदर्शन परियोजना है। यह भारत निर्वाचन आयोग या किसी सरकारी प्राधिकरण से संबद्ध नहीं है और ऑनलाइन मतदान नहीं कराती।',
    },
  },
];

pollbotRouter.get('/faqs', (_req, res) => {
  res.json({ faqs: POLLBOT_FAQS });
});

pollbotRouter.post('/chat', async (req, res) => {
  const { message, language = 'en', mode = 'ai', history = [] } = req.body as {
    message?: string;
    language?: 'en' | 'ta' | 'hi';
    mode?: 'ai' | 'faq';
    history?: Array<{ role: 'user' | 'assistant'; text: string }>;
  };

  const trimmed = (message || '').trim();
  if (!trimmed) {
    res.status(400).json({ error: 'Please enter a question for PollBot.' });
    return;
  }

  const langKey: 'en' | 'ta' | 'hi' = language === 'ta' || language === 'hi' ? language : 'en';

  if (mode === 'faq') {
    const qLower = trimmed.toLowerCase();
    const scored = POLLBOT_FAQS.map((item) => {
      const hay = `${item.topic} ${item.question.en} ${item.question.ta} ${item.question.hi} ${item.answer.en}`.toLowerCase();
      let score = 0;
      for (const word of qLower.split(/\s+/)) {
        if (word.length > 2 && hay.includes(word)) score += 1;
      }
      return { item, score };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score > 0) {
      res.json({
        reply: best.item.answer[langKey],
        source: 'faq',
        matchedTopic: best.item.topic,
      });
      return;
    }

    const fallbackMsg = {
      en: 'Here are the main topics I can help with: Voter Services, Application Tracking, Polling Stations, Candidate Information, Complaint Submission, and Simulated Verification. Pick a quick topic below or switch to AI Assistant mode.',
      ta: 'நான் உதவக்கூடிய தலைப்புகள்: வாக்காளர் சேவைகள், விண்ணப்ப கண்காணிப்பு, வாக்குச்சாவடிகள், வேட்பாளர் விவரம், புகார் பதிவு மற்றும் மாதிரி சரிபார்ப்பு.',
      hi: 'मैं इन विषयों में मदद कर सकता हूं: मतदाता सेवाएं, आवेदन ट्रैकिंग, मतदान केंद्र, उम्मीदवार जानकारी, शिकायत दर्ज करना और डेमो सत्यापन।',
    };
    res.json({ reply: fallbackMsg[langKey], source: 'faq', matchedTopic: 'General' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error:
        'AI Assistant requires a valid GEMINI_API_KEY configured in server secrets. You can continue using PollBot Verified FAQ mode immediately.',
    });
    return;
  }

  try {
    const stationsCount = (db.prepare('SELECT COUNT(*) as cnt FROM polling_stations').get() as { cnt: number }).cnt;
    const candidatesCount = (db.prepare('SELECT COUNT(*) as cnt FROM candidates WHERE is_published = 1').get() as { cnt: number }).cnt;
    const partiesCount = (db.prepare('SELECT COUNT(*) as cnt FROM political_parties').get() as { cnt: number }).cnt;
    const upcomingElections = db
      .prepare('SELECT title, event_date, constituency, status FROM elections ORDER BY event_date ASC LIMIT 4')
      .all() as Array<{ title: string; event_date: string; constituency: string; status: string }>;

    const langLabel = langKey === 'ta' ? 'Tamil (தமிழ்)' : langKey === 'hi' ? 'Hindi (हिन्दी)' : 'English';

    const systemInstruction = `You are PollBot, the neutral civic information assistant for the Smart Election Portal (an educational demonstration application).
STRICT RULES:
1. Remain 100% neutral and non-partisan. NEVER recommend, endorse, favor, or rank any political candidate or political party.
2. Clearly remember this is a fictional educational demonstration portal with NO real online voting, NO official Election Commission affiliation, and NO real biometric collection.
3. Live portal summary from database: ${candidatesCount} published fictional candidates across ${partiesCount} fictional parties, and ${stationsCount} demonstration polling stations.
   Upcoming demo calendar items: ${upcomingElections.map((e) => `${e.title} (${e.event_date}, ${e.constituency}, ${e.status})`).join('; ')}.
4. Respond concisely (3-5 sentences max) in ${langLabel}.`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const formattedHistory = (Array.isArray(history) ? history.slice(-6) : [])
      .map((h) => `${h.role === 'user' ? 'Citizen' : 'PollBot'}: ${h.text}`)
      .join('\n');

    const prompt = formattedHistory ? `${formattedHistory}\nCitizen: ${trimmed}` : trimmed;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const text = (response.text || '').trim();
    if (!text) {
      res.status(502).json({ error: 'PollBot AI returned an empty response. Please try again or use FAQ mode.' });
      return;
    }

    res.json({ reply: text, source: 'gemini-4-hydrogen' });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unable to reach Gemini AI service.';
    res.status(502).json({
      error: `PollBot AI service error: ${errMsg}`,
    });
  }
});
