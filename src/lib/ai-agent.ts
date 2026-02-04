import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { Document } from "@langchain/core/documents";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableSequence, RunnablePassthrough } from "@langchain/core/runnables";
import { AIMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { groceryKnowledgeBase, escalationTriggers } from "./knowledge-base";
import path from "path";
import fs from "fs";

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

// Singleton instances
let vectorStore: HNSWLib | null = null;
let llm: ChatOpenAI | null = null;
let embeddings: OpenAIEmbeddings | null = null;

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
  if (!embeddings) {
    embeddings = new OpenAIEmbeddings({
      openAIApiKey: apiKey,
      modelName: "text-embedding-3-small",
    });
  }
  return embeddings;
}

// Initialize or load vector store with knowledge base
async function initializeVectorStore(apiKey: string): Promise<HNSWLib> {
  if (vectorStore) {
    return vectorStore;
  }

  const emb = initializeEmbeddings(apiKey);
  const vectorStorePath = path.join(process.cwd(), "data", "vectorstore");

  // Check if vector store already exists
  if (fs.existsSync(vectorStorePath)) {
    try {
      vectorStore = await HNSWLib.load(vectorStorePath, emb);
      console.log("Loaded existing vector store");
      return vectorStore;
    } catch {
      console.log("Failed to load existing vector store, creating new one");
    }
  }

  // Create documents from knowledge base
  const documents = groceryKnowledgeBase.map(
    (item) =>
      new Document({
        pageContent: `Question: ${item.question}\nAnswer: ${item.answer}`,
        metadata: {
          topic: item.topic,
          question: item.question,
        },
      })
  );

  // Create vector store
  vectorStore = await HNSWLib.fromDocuments(documents, emb);

  // Save vector store for future use
  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  await vectorStore.save(vectorStorePath);
  console.log("Created and saved new vector store");

  return vectorStore;
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
        "I understand you'd like to speak with a human agent. Let me connect you with one of our support team members right away.",
      shouldEscalate: true,
      escalationReason: escalationCheck.reason,
      confidence: 1,
      sources: [],
    };
  }

  try {
    // Initialize components
    const model = initializeLLM(openAIKey);
    const store = await initializeVectorStore(openAIKey);

    // Retrieve relevant documents
    const retriever = store.asRetriever({
      k: 3, // Get top 3 relevant documents
      searchType: "similarity",
    });

    const relevantDocs = await retriever.invoke(userMessage);
    const context = relevantDocs
      .map((doc) => doc.pageContent)
      .join("\n\n---\n\n");
    const sources = relevantDocs.map((doc) => doc.metadata.topic as string);

    // Create the prompt template
    const systemPrompt = `You are a helpful customer support AI assistant for a 30-minute grocery delivery app. Your name is "GroceryBot".

Your primary goals are:
1. Help customers with their questions about orders, delivery, payments, and app usage
2. Be friendly, professional, and empathetic
3. Provide accurate information based on the knowledge base
4. Know when to escalate to a human agent

Guidelines:
- Always greet the customer warmly on first interaction
- Use the provided context to answer questions accurately
- If you're not confident about an answer (less than 70% sure), admit it and offer to connect them with a human agent
- Keep responses concise but helpful (2-4 sentences typically)
- For order-specific issues (checking status, refunds for specific orders), you'll need to escalate to a human agent who can access the order system
- Never make up information not in the context
- If the customer seems frustrated or the issue is complex, offer to escalate

Context from knowledge base:
{context}

Important: If you cannot answer the question confidently based on the context provided, respond with a message that includes the phrase "ESCALATE_TO_HUMAN" at the end. This will automatically connect the customer with a human agent.`;

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
          "\n\nLet me connect you with a human agent who can better assist you."
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

// Function to rebuild vector store (useful when knowledge base is updated)
export async function rebuildVectorStore(apiKey: string): Promise<boolean> {
  try {
    vectorStore = null; // Clear existing store
    const vectorStorePath = path.join(process.cwd(), "data", "vectorstore");

    // Delete existing store
    if (fs.existsSync(vectorStorePath)) {
      fs.rmSync(vectorStorePath, { recursive: true });
    }

    // Reinitialize
    await initializeVectorStore(apiKey);
    return true;
  } catch (error) {
    console.error("Error rebuilding vector store:", error);
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
    return "Hello! Welcome to GroceryMart support. I'm GroceryBot, your AI assistant. How can I help you today? You can ask me about orders, delivery, payments, or any other questions!";
  }

  // Thank you responses
  if (lowerMessage.match(/(thank|thanks|thx)/)) {
    return "You're welcome! Is there anything else I can help you with?";
  }

  // Goodbye responses
  if (lowerMessage.match(/(bye|goodbye|see you|take care)/)) {
    return "Thank you for chatting with us! Have a great day, and happy shopping! 🛒";
  }

  return null;
}
