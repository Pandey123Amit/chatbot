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
      modelName: "gpt-4o-mini", // Cost-effective and fast
      temperature: 0.3, // Lower temperature for more consistent responses
      maxTokens: 500,
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

    // Create the prompt template
    const systemPrompt = `You are a helpful support AI assistant for RemoteState, a software engineering company. Your name is "RemoteStateBot".

Your primary goals are:
1. Help visitors with questions about RemoteState's services, technologies, pricing, engagement models, and company information
2. Be friendly, professional, and knowledgeable
3. Provide accurate information based on the knowledge base
4. Know when to escalate to a human agent

Guidelines:
- Always greet visitors warmly on first interaction
- Use the provided context to answer questions accurately
- If you're not confident about an answer (less than 70% sure), admit it and offer to connect them with a human representative
- Keep responses concise but helpful (2-4 sentences typically)
- For project-specific inquiries (custom quotes, specific technical requirements), direct them to our contact page at https://www.remotestate.com/contactus
- Never make up information not in the context
- If the visitor seems interested in starting a project, encourage them to visit https://www.remotestate.com/contactus or email [email protected]
- If the visitor seems frustrated or the issue is complex, direct them to https://www.remotestate.com/contactus
- If the visitor writes in a language other than English, respond helpfully and direct them to https://www.remotestate.com/contactus where our team can assist them in their preferred language
- IMPORTANT: Never use markdown formatting in your responses. Write plain text only. Do not use markdown links like [text](url). Just write the URL directly as plain text.

Context from knowledge base:
{context}

Important: If you cannot answer the question confidently based on the context provided, respond with a message that includes the phrase "ESCALATE_TO_HUMAN" at the end. This will automatically connect the visitor with a human representative.`;

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
    const cleanResponse = response.replace("ESCALATE_TO_HUMAN", "").trim();

    // Calculate confidence based on relevance of retrieved documents
    // This is a simplified confidence score
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
      sources: [...new Set(sources)], // Unique sources
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
