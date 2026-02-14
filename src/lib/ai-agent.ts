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
  isSummary?: boolean;
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

// Cosine similarity between two vectors
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
        "I apologize, but I'm currently unable to process your request. Please try again later or speak to a human agent.",
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
        "I understand you'd like to speak with someone from our team. Please visit our contact page at https://www.remotestate.com/contactus to get in touch directly. Our team will be happy to assist you!",
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

    // Unified system prompt — handles both support and discovery
    const systemPrompt = `You are "RemoteStateBot", an AI assistant for RemoteState, a software engineering company. You have TWO capabilities:

CAPABILITY 1 — SUPPORT:
Answer questions about RemoteState's services, technologies, pricing, engagement models, and company information using the knowledge base context below.

CAPABILITY 2 — PROJECT DISCOVERY:
When a visitor describes a project idea, wants to build something, or asks about scoping/requirements, switch into discovery mode. Act as a product consultant and gather their requirements through a structured conversation.

GENERAL GUIDELINES:
- Be friendly, professional, and knowledgeable
- Keep responses concise (2-5 sentences typically)
- Use the provided context to answer questions accurately
- If you're not confident about an answer (less than 70% sure), admit it and offer to connect them with a human representative
- Never make up information not in the context
- If the visitor seems frustrated or the issue is complex, direct them to https://www.remotestate.com/contactus
- If the visitor writes in a language other than English, respond helpfully and direct them to https://www.remotestate.com/contactus
- IMPORTANT: Never use markdown formatting in your responses. Write plain text only. No markdown links like [text](url). Just write the URL directly.

DISCOVERY CONVERSATION RULES (when visitor is discussing a project):
1. Ask ONE question at a time. Never ask multiple questions in a single message.
2. After the user answers, briefly acknowledge their answer with a short expert insight (1-2 sentences showing you understand their domain), then ask the next topic question.
3. Be warm, conversational, and encouraging — make them feel their idea has potential.

DISCOVERY TOPICS (ask in this order, naturally):
1. Project Vision — What are they building? The elevator pitch.
2. Target Users — Who uses it? What problem does it solve?
3. Reference Apps — Any similar products they like or dislike?
4. MVP vs Full Product — Start small to validate, or full build?
5. Core Features — Must-have vs nice-to-have for v1?
6. Timeline — Target launch date?
7. Budget — Budget range to recommend the right approach?
8. Technology Preferences — Tech stack or existing systems to integrate with?
9. Design — Design assets, brand guidelines, or need design services?
10. Integrations — Third-party services, APIs, platforms to connect with?

DISCOVERY PROGRESSION:
- Skip topics the user has already answered naturally in previous messages.
- If the user gives a vague answer, you may ask ONE brief follow-up before moving on.
- If the user wants to skip a topic, move on gracefully.
- The visitor can ask support questions mid-discovery — answer them, then resume where you left off.

SUMMARY GENERATION:
- Once topics 1 through 5 have been covered (at minimum), AND the conversation feels ready to wrap up (user has answered most questions or indicates they're done), generate a structured summary.
- Before the summary, write: "Great, I have a clear picture of your project! Here's a summary of what we've discussed:"
- Format the summary as a clear, organized PROJECT REQUIREMENTS SUMMARY with sections for each covered topic.
- After the summary, ask: "Does this look accurate? Feel free to adjust anything. When you're ready, our team at RemoteState can turn this into a detailed proposal — reach out at [email protected] or visit remotestate.com/contactus."
- Append the marker DISCOVERY_COMPLETE at the very end of messages containing the summary.

ESCALATION:
- If you cannot answer confidently based on the context, append "ESCALATE_TO_HUMAN" at the end of your message.

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

    // Check for discovery complete marker
    const isDiscoveryComplete = response.includes("DISCOVERY_COMPLETE");
    // Check if AI suggests escalation
    const shouldEscalate = response.includes("ESCALATE_TO_HUMAN");
    const cleanResponse = response
      .replace("DISCOVERY_COMPLETE", "")
      .replace("ESCALATE_TO_HUMAN", "")
      .trim();

    // Calculate confidence based on relevance of retrieved documents
    const confidence = relevantDocs.length > 0 ? 0.8 : 0.4;

    return {
      response: shouldEscalate
        ? cleanResponse +
          "\n\nFor further assistance, please reach out to our team at https://www.remotestate.com/contactus"
        : cleanResponse,
      shouldEscalate,
      escalationReason: shouldEscalate
        ? "AI could not confidently answer the question"
        : undefined,
      confidence,
      sources: [...new Set(sources)],
      isSummary: isDiscoveryComplete || undefined,
    };
  } catch (error) {
    console.error("AI Agent error:", error);
    return {
      response:
        "I apologize, but I'm having trouble processing your request right now. Let me connect you with a human agent who can help.",
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
    return "Hello! Welcome to RemoteState support. I'm RemoteStateBot, your AI assistant. How can I help you today? You can ask me about our services, technologies, pricing, or anything else!";
  }

  // Thank you responses
  if (lowerMessage.match(/(thank|thanks|thx)/)) {
    return "You're welcome! Is there anything else I can help you with?";
  }

  // Goodbye responses
  if (lowerMessage.match(/(bye|goodbye|see you|take care)/)) {
    return "Thank you for chatting with us! Have a great day. Feel free to reach out anytime at [email protected]!";
  }

  return null;
}
