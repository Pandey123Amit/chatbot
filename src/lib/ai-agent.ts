import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { groceryKnowledgeBase, escalationTriggers } from "./knowledge-base";

// Types
export interface AIAgentResponse {
  response: string;
  shouldEscalate: boolean;
  escalationReason?: string;
  confidence: number;
  sources: string[];
}

export interface ChatHistory {
  role: "user" | "assistant";
  content: string;
}

interface DocumentWithEmbedding {
  content: string;
  topic: string;
  question: string;
  embedding: number[];
}

// Singleton instances
let documentStore: DocumentWithEmbedding[] | null = null;
let llm: ChatOpenAI | null = null;
let embeddingsModel: OpenAIEmbeddings | null = null;

// Initialize the LLM
function initializeLLM(apiKey: string) {
  if (!llm) {
    llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 1500, // Supports both short support answers and longer discovery summaries
    });
  }
  return llm;
}

// Initialize embeddings
function initializeEmbeddings(apiKey: string) {
  if (!embeddingsModel) {
    embeddingsModel = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
    });
  }
  return embeddingsModel;
}

// Cosine similarity between two vectors -1 to 1
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Initialize document store with embeddings
async function initializeDocumentStore(apiKey: string): Promise<DocumentWithEmbedding[]> {
  if (documentStore) {
    return documentStore;
  }

  const emb = initializeEmbeddings(apiKey);

  // Create documents and their embeddings
  const contents = groceryKnowledgeBase.map(
    (item) => `Question: ${item.question}\nAnswer: ${item.answer}`
  );

  // Get embeddings for all documents in one batch call
  const embeddings = await emb.embedDocuments(contents);



  console.log(embeddings,"embeddings")

  documentStore = groceryKnowledgeBase.map((item, i) => ({
    content: contents[i],
    topic: item.topic,
    question: item.question,
    embedding: embeddings[i],
  }));

  console.log("Created in-memory document store with embeddings");
  return documentStore;
}

// Retrieve similar documents
async function retrieveSimilarDocuments(
  query: string,
  apiKey: string,
  k: number = 3
): Promise<{ content: string; topic: string }[]> {
  const store = await initializeDocumentStore(apiKey);
  const emb = initializeEmbeddings(apiKey);

  // Get embedding for the query
  const queryEmbedding = await emb.embedQuery(query);

  // Calculate similarities and sort
  const scored = store.map((doc) => ({
    doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, k).map((s) => ({
    content: s.doc.content,
    topic: s.doc.topic,
  }));
}

// Check if message should trigger escalation
function checkEscalationTriggers(message: string): {
  shouldEscalate: boolean;
  reason?: string;
} {
  const lowerMessage = message.toLowerCase();

  for (const trigger of escalationTriggers) {
    if (lowerMessage.includes(trigger)) {
      return {
        shouldEscalate: true,
        reason: `Customer requested to ${trigger}`,
      };
    }
  }

  return { shouldEscalate: false };
}

// Convert chat history to LangChain messages
function convertChatHistory(history: ChatHistory[]): BaseMessage[] {
  return history.map((msg) =>
    msg.role === "user"
      ? new HumanMessage(msg.content)
      : new AIMessage(msg.content)
  );
}

// Main AI agent function
export async function getAIResponse(
  userMessage: string,
  chatHistory: ChatHistory[] = [],
  apiKey?: string
): Promise<AIAgentResponse> {
  const openAIKey = apiKey || process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return {
      response:
        "I apologize, but I'm currently unable to process your request. Please try again later or contact Amit directly at pandey.amit1598@gmail.com.",
      shouldEscalate: true,
      escalationReason: "AI service not configured",
      confidence: 0,
      sources: [],
    };
  }

  // Check for escalation triggers first
  const escalationCheck = checkEscalationTriggers(userMessage);
  if (escalationCheck.shouldEscalate) {
    return {
      response:
        "For that, I'd recommend reaching out to Amit directly. You can contact him at pandey.amit1598@gmail.com or call +91 8986605695. He'd be happy to discuss this with you!",
      shouldEscalate: true,
      escalationReason: escalationCheck.reason,
      confidence: 1,
      sources: [],
    };
  }

  try {
    // Initialize components
    const model = initializeLLM(openAIKey);

    // Retrieve relevant documents
    const relevantDocs = await retrieveSimilarDocuments(userMessage, openAIKey, 3);
    const context = relevantDocs
      .map((doc) => doc.content)
      .join("\n\n---\n\n");
    const sources = relevantDocs.map((doc) => doc.topic);

    // System prompt for Amit's resume chatbot
    const systemPrompt = `You are "AmitBot", a personal AI assistant that represents Amit Kumar Pandey. Your job is to answer questions from HR professionals, recruiters, and hiring managers about Amit's skills, experience, projects, education, and qualifications — like a smart, interactive resume.

GUIDELINES:
- Be friendly, professional, and confident about Amit's abilities
- Keep responses concise (2-5 sentences typically) but provide detail when asked
- Use the provided context to answer questions accurately
- Highlight Amit's measurable achievements (40% latency reduction, 60% faster APIs, etc.) when relevant
- If asked something not covered in the knowledge base, politely say that specific information isn't available and suggest contacting Amit directly at pandey.amit1598@gmail.com or +91 8986605695
- Never make up information not in the context
- IMPORTANT: Never use markdown formatting in your responses. Write plain text only. No markdown links like [text](url). Just write the URL directly.
- When asked about salary, availability, notice period, or interview scheduling, suggest contacting Amit directly for the most up-to-date information.
- Present Amit in a positive but honest light — focus on his real achievements and skills.
- If the recruiter asks for a summary or overview, provide a well-structured profile covering experience, skills, and key achievements.
- If asked for Amit's resume or CV, share the download link: https://remotestate-website-public.s3.ap-south-1.amazonaws.com/uploads/pdfs/a90e5079-2714-4607-8680-184f648d9194-AmitPandey_Resume_ATS__1_.pdf
- At the end of detailed responses, you may remind the recruiter that they can download the full resume or contact Amit directly.

ESCALATION:
- If asked about salary expectations, notice period, interview scheduling, or anything requiring Amit's direct input, append "ESCALATE_TO_HUMAN" at the end of your message.

Context from knowledge base:
{context}`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      new MessagesPlaceholder("chat_history"),
      ["human", "{question}"],
    ]);

    // Create the chain
    const chain = RunnableSequence.from([
      {
        context: () => context,
        question: new RunnablePassthrough(),
        chat_history: () => convertChatHistory(chatHistory),
      },
      prompt,
      model,
      new StringOutputParser(),
    ]);

    // Get response
    const response = await chain.invoke(userMessage);

    // Check if AI suggests escalation
    const shouldEscalate = response.includes("ESCALATE_TO_HUMAN");
    const cleanResponse = response
      .replace("ESCALATE_TO_HUMAN", "")
      .trim();

    // Calculate confidence based on relevance of retrieved documents
    const confidence = relevantDocs.length > 0 ? 0.8 : 0.4;

    return {
      response: shouldEscalate
        ? cleanResponse +
          "\n\nFor more details, please contact Amit directly at pandey.amit1598@gmail.com or +91 8986605695."
        : cleanResponse,
      shouldEscalate,
      escalationReason: shouldEscalate
        ? "AI could not confidently answer the question"
        : undefined,
      confidence,
      sources: [...new Set(sources)],
    };
  } catch (error) {
    console.error("AI Agent error:", error);
    return {
      response:
        "I apologize, but I'm having trouble processing your request right now. Please contact Amit directly at pandey.amit1598@gmail.com.",
      shouldEscalate: true,
      escalationReason: `AI error: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: 0,
      sources: [],
    };
  }
}

// Function to rebuild document store (useful when knowledge base is updated)
export async function rebuildDocumentStore(apiKey: string): Promise<boolean> {
  try {
    documentStore = null; // Clear existing store
    // Reinitialize
    await initializeDocumentStore(apiKey);
    return true;
  } catch (error) {
    console.error("Error rebuilding document store:", error);
    return false;
  }
}

// Quick FAQ responses for common questions (no LLM needed)
export function getQuickResponse(message: string): string | null {
  const lowerMessage = message.toLowerCase();

  // Greeting responses
  if (
    lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/)
  ) {
    return "Hello! I'm AmitBot, Amit Kumar Pandey's AI assistant. I can tell you about his skills, work experience, projects, education, and more. What would you like to know?";
  }

  // Thank you responses
  if (lowerMessage.match(/(thank|thanks|thx)/)) {
    return "You're welcome! Is there anything else you'd like to know about Amit?";
  }

  // Goodbye responses
  if (lowerMessage.match(/(bye|goodbye|see you|take care)/)) {
    return "Thanks for your interest in Amit! If you'd like to get in touch, reach him at pandey.amit1598@gmail.com or +91 8986605695. Have a great day!";
  }

  return null;
}
