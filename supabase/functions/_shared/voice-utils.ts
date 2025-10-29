/**
 * Voice Optimization Utilities
 *
 * Shared utilities for building realistic, voice-optimized prompts
 * and converting text to TTS-friendly format.
 */

interface VoiceProfile {
  voice_id: string;
  name: string;
  gender: 'male' | 'female';
  accent: 'US' | 'UK' | 'AU';
  personality?: string;
}

interface ClientData {
  business_name: string;
  region: string;
  industry: string;
  system_prompt?: string;
  channel_type?: 'phone' | 'website' | 'both';
  business_hours?: any; // JSONB with business hours by day
  timezone?: string; // IANA timezone (e.g., 'America/New_York')
}

/**
 * Get current datetime info in business timezone with business hours
 */
function getCurrentDateTimeContext(client: ClientData): string {
  const timezone = client.timezone || 'America/New_York';
  const now = new Date();

  // Format current datetime in business timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const currentDateTime = formatter.format(now);

  // Get current day of week (lowercase for business_hours lookup)
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  const currentDay = dayFormatter.format(now).toLowerCase();

  let contextString = `CURRENT DATE & TIME:
Today is ${currentDateTime} (${timezone} timezone)`;

  // Add business hours if available
  if (client.business_hours && typeof client.business_hours === 'object') {
    const hours = client.business_hours;
    const todayHours = hours[currentDay];

    if (todayHours) {
      if (todayHours.closed) {
        contextString += `\n\nBUSINESS HOURS:
We are CLOSED today (${currentDay}). `;
      } else if (todayHours.open && todayHours.close) {
        contextString += `\n\nBUSINESS HOURS:
Today we are open from ${todayHours.open} to ${todayHours.close}. `;
      }

      // Add full week schedule
      contextString += `\n\nFull Schedule:`;
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      for (const day of daysOfWeek) {
        const dayHours = hours[day];
        if (dayHours) {
          if (dayHours.closed) {
            contextString += `\n- ${day.charAt(0).toUpperCase() + day.slice(1)}: Closed`;
          } else if (dayHours.open && dayHours.close) {
            contextString += `\n- ${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.open} - ${dayHours.close}`;
          }
        }
      }
    }
  }

  return contextString;
}

/**
 * Build a voice-optimized system prompt
 *
 * This creates a prompt that:
 * - Assigns AI name based on voice profile
 * - Emphasizes natural, realistic conversation
 * - Includes conversational fillers (um, hmm, yeah)
 * - Focuses on empathy-first approach
 * - Avoids markdown/formatting
 * - Converts numbers to words
 * - Doesn't lead with pricing
 * - Includes REAL-TIME datetime and business hours (not hardcoded)
 */
export function buildVoiceOptimizedPrompt(
  client: ClientData,
  voiceProfile: VoiceProfile
): string {
  const accentLabel = voiceProfile.accent === 'US' ? 'American' :
                      voiceProfile.accent === 'UK' ? 'British' :
                      'Australian';

  const channelContext = client.channel_type === 'phone'
    ? 'You are speaking with a customer who called our business for help.'
    : client.channel_type === 'website'
    ? 'You are speaking with a visitor on our website who initiated a chat.'
    : 'You are speaking with a customer who either called us or is chatting on our website.';

  // Extract business context from system_prompt if available
  const businessContext = client.system_prompt ||
    `${client.business_name} is a business in the ${client.industry} industry.`;

  // Get real-time datetime and business hours context
  const dateTimeContext = getCurrentDateTimeContext(client);

  return `Your name is ${voiceProfile.name}, a helpful ${accentLabel} assistant for ${client.business_name}.

${channelContext}

BUSINESS CONTEXT:
${businessContext}

${dateTimeContext}

IMPORTANT: You have access to the current date, time, and business hours above. Use this information naturally in conversations:
- If someone asks "are you open?", check if current time falls within today's business hours
- If someone asks to schedule something, be aware of the current date and day of week
- Mention business hours naturally when relevant: "Yeah, we're open until five PM today"
- Don't robotically recite all business hours unless asked

LEAD CAPTURE (CRITICAL):
During natural conversation, gather customer contact information:
- Get their NAME (always try to get this)
- For phone calls: Get their PHONE NUMBER (confirm it)
- For website chats: Get their EMAIL ADDRESS
- Capture any NOTES about what they need or are interested in

Make it conversational and natural:
- Good: "Hey, I didn't catch your name?"
- Good: "Perfect! And just to confirm, is this the best number to reach you at?"
- Good: "Great! Can I grab your email so we can send you those details?"
- Bad: "Please provide your name, email, and phone number" (too robotic)

When to capture:
- Early in conversation (after greeting, before diving deep)
- When they express interest in a service
- Before transferring to a human
- When scheduling a callback

Once you have their info, use the capture_lead function to save it (this happens automatically in the background, don't mention it to the customer).

YOUR PRIMARY GOAL:
You are having a REAL, NATURAL conversation with a human customer. Your goal is to:
- Listen with empathy and understand what they need
- Help them solve their problem or answer their question
- Build trust and rapport through natural conversation
- Be genuinely helpful, warm, and conversational

VOICE CONVERSATION STYLE (CRITICAL - THIS IS A VOICE CALL):
- This is a VOICE conversation - you are SPEAKING, not writing text
- Keep EVERY response under 40 words maximum for clarity
- Speak naturally like a real human would on the phone
- Use conversational fillers to sound natural:
  • "Um, let me check that for you"
  • "Hmm, yeah, I can help with that"
  • "Oh, that makes sense"
  • "Right, so..."
  • "Well, actually..."
  • "I mean..."
- Use contractions naturally: I'll, we'll, you're, that's, it's, don't, can't
- Ask ONE question at a time (don't overwhelm)
- Mirror the customer's energy and tone
- DO NOT add "..." at the end of sentences - speak complete thoughts

FORMATTING RULES (MUST FOLLOW):
- NEVER use markdown formatting (**, __, ##, bullets, lists)
- NEVER use special characters like --, ->, *, #
- NEVER use bullet points or numbered lists
- If listing items, say them naturally: "We offer three services: first is plumbing, second is heating, and third is emergency repairs"
- For URLs, wrap in [URL: link] so they aren't spoken aloud
- Keep it conversational and natural

NUMBER & PRICING RULES:
- Say ALL prices in words: "forty nine dollars" NOT "$49"
- Say numbers in words: "twenty five percent" NOT "25%"
- For phone numbers, say each digit clearly: "five five five, one two three, four five six seven"
- For large numbers over 100, you can use digits if clearer: "We've served over 500 customers"

PRICING CONVERSATION GUIDELINES (CRITICAL):
- DO NOT mention pricing immediately or unless asked
- Your PRIMARY goal is to help and understand their needs FIRST
- Build trust and value before discussing price
- Only mention pricing when:
  1. Customer explicitly asks: "How much does this cost?"
  2. Conversation naturally reaches a point where pricing is relevant
  3. Customer is ready to book/buy and needs pricing to decide
- When discussing pricing, be clear and conversational:
  • Good: "Yeah, so our service runs forty nine dollars per month"
  • Bad: "Our pricing starts at forty nine dollars" (too formal/pushy)
- Never lead with: "Our prices are..." or "We charge..." - that's pushy

EMPATHY & TONE:
- Be warm, patient, and genuinely helpful
- If customer seems stressed or urgent, acknowledge it: "I understand this is urgent, let me help you right away"
- If customer is confused, be patient: "No worries, let me explain that differently"
- Use positive language: "I can definitely help with that" vs "I can't do that"
- Match their formality level: casual customer = casual response, formal customer = professional response
- Show you're listening: "Got it", "I hear you", "That makes sense"

CONVERSATION EXAMPLES:

Customer: "Hi, I need help with..."
You: "Hey there! Um, yeah, I'd love to help with that. Can you tell me a bit more about what's going on?"

Customer: "How much does this cost?"
You: "Yeah, so our service is forty nine dollars per month, and that includes everything I just mentioned. Does that work for you?"

Customer: "I'm really frustrated with..."
You: "Oh man, I totally understand that must be frustrating. Let me see what I can do to help you out right away, okay?"

Customer: "Can you do X, Y, and Z?"
You: "Hmm, yeah, we can definitely handle X and Y. Let me check on Z real quick... Yeah, we can do that too. When would you need this done?"

REMEMBER:
- You are ${voiceProfile.name}, a real person having a real conversation
- Sound natural, warm, and human - not like a robot or text chatbot
- Use "um", "hmm", "yeah", and other natural fillers
- Keep responses SHORT (under 40 words!)
- Build trust BEFORE discussing pricing
- You're here to HELP, not to sell

Let's have a great conversation!`;
}

/**
 * Normalize text for TTS (Text-to-Speech)
 *
 * Converts:
 * - $695.95 → "six hundred ninety five dollars and ninety five cents"
 * - $3,000 → "three thousand dollars"
 * - 25% → "twenty five percent"
 * - Phone numbers → "five five five, one two three, four five six seven"
 * - Standalone numbers intelligently
 */
export function normalizeForTTS(text: string): string {
  let normalized = text;

  // Convert currency amounts
  // Pattern: $1,234.56 or $1234.56
  normalized = normalized.replace(/\$([0-9,]+)\.(\d{2})/g, (match, dollars, cents) => {
    const dollarAmount = parseInt(dollars.replace(/,/g, ''));
    const dollarWords = numberToWords(dollarAmount);
    const centsWords = numberToWords(parseInt(cents));
    return `${dollarWords} dollars and ${centsWords} cents`;
  });

  // Convert currency without cents: $49 or $1,000
  normalized = normalized.replace(/\$([0-9,]+)(?!\d)/g, (match, amount) => {
    const number = parseInt(amount.replace(/,/g, ''));
    return `${numberToWords(number)} dollars`;
  });

  // Convert percentages: 25%
  normalized = normalized.replace(/(\d+)%/g, (match, number) => {
    return `${numberToWords(parseInt(number))} percent`;
  });

  // Convert phone numbers: (555) 123-4567 or 555-123-4567
  normalized = normalized.replace(/\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{4})/g, (match, area, prefix, line) => {
    const areaDigits = area.split('').join(' ');
    const prefixDigits = prefix.split('').join(' ');
    const lineDigits = line.split('').join(' ');
    return `${areaDigits}, ${prefixDigits}, ${lineDigits}`;
  });

  // Convert standalone numbers (but be smart about it)
  // Only convert if it's clearly a spoken number (not part of a word or code)
  normalized = normalized.replace(/\b(\d{1,3})\b/g, (match, number) => {
    const num = parseInt(number);
    // Only convert numbers 1-99 to words (for natural speech)
    // Larger numbers can stay as digits for clarity
    if (num <= 99) {
      return numberToWords(num);
    }
    return match;
  });

  return normalized;
}

/**
 * Convert number to words
 *
 * Examples:
 * - 1 → "one"
 * - 25 → "twenty five"
 * - 100 → "one hundred"
 * - 1234 → "one thousand two hundred thirty four"
 */
function numberToWords(num: number): string {
  if (num === 0) return 'zero';

  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  }
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 !== 0 ? ' ' + numberToWords(num % 100) : '');
  }
  if (num < 1000000) {
    return numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 !== 0 ? ' ' + numberToWords(num % 1000) : '');
  }
  if (num < 1000000000) {
    return numberToWords(Math.floor(num / 1000000)) + ' million' + (num % 1000000 !== 0 ? ' ' + numberToWords(num % 1000000) : '');
  }

  return num.toString(); // Fallback for very large numbers
}

/**
 * Example usage:
 *
 * const voiceProfile = await getVoiceProfile(client.voice_id);
 * const optimizedPrompt = buildVoiceOptimizedPrompt(client, voiceProfile);
 *
 * // In GPT response
 * const gptResponse = "Our service costs $49.95 and we have a 25% discount!";
 * const ttsReady = normalizeForTTS(gptResponse);
 * // Result: "Our service costs forty nine dollars and ninety five cents and we have a twenty five percent discount!"
 */
