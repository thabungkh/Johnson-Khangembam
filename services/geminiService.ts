import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { UploadedFile, Topic, DocType } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

/**
 * Retry utility to handle 503 Service Unavailable or Socket Failures
 * common with large context payloads.
 */
const retryOperation = async <T>(
    operation: () => Promise<T>, 
    retries: number = 3, 
    delay: number = 2000
): Promise<T> => {
    try {
        return await operation();
    } catch (error: any) {
        // Check for 503 or specific socket error messages
        const isRetryable = 
            error.status === 503 || 
            (error.message && (
                error.message.includes("503") || 
                error.message.includes("Socket read failure") ||
                error.message.includes("UNAVAILABLE")
            ));

        if (retries > 0 && isRetryable) {
            console.warn(`Gemini API Error (${error.status || 'Network'}). Retrying in ${delay}ms... Attempts left: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw error;
    }
};

/**
 * Step 1: Analyze Main Notes to generate the Table of Contents / Chapter List.
 */
export const extractChaptersFromNotes = async (mainFiles: UploadedFile[]): Promise<Topic[]> => {
  if (!apiKey) throw new Error("API Key is missing");

  const model = "gemini-2.5-flash";

  const prompt = `
    You are an expert Study Companion.
    Scan the attached 'Main Study Notes' (e.g., Mrunal or Standard Books).
    
    Your goal is to extract the **Table of Contents** or the **Major Chapters/Units**.
    Identify 10-15 distinct, high-level topics.
    
    For each topic, provide:
    1. **Name**: Exact Chapter Title.
    2. **Relevance**: (High/Medium/Low) based on typical UPSC exam weightage.
    3. **Complexity**: (Hard/Medium/Easy) based on conceptual depth.
    4. **Subtopics**: A list of 3-5 key sub-themes or concepts within this chapter.
    
    Return the result strictly as a JSON array of objects with 'id', 'name', 'relevance', 'complexity', and 'subtopics'.
  `;

  const parts: any[] = [{ text: prompt }];

  mainFiles.forEach((file, index) => {
    parts.push({ text: `\n--- Main Note Document ${index + 1}: ${file.name} ---` });
    parts.push({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64
      }
    });
  });

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    relevance: { type: Type.STRING },
                    complexity: { type: Type.STRING },
                    subtopics: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ["id", "name", "relevance", "complexity", "subtopics"]
            }
        }
      }
    }));

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as Topic[];

  } catch (error) {
    console.error("Error extracting chapters:", error);
    throw new Error("Failed to extract chapters from notes. The file might be too large or the service is busy.");
  }
};

/**
 * Step 2: Synthesize a specific topic.
 */
export const synthesizeTopic = async (
  topicName: string,
  files: UploadedFile[]
): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing");

    const mainFiles = files.filter(f => f.type === DocType.MAIN);
    const ncertFiles = files.filter(f => f.type === DocType.NCERT);
    const currentFiles = files.filter(f => f.type === DocType.CURRENT);
    const pyqFiles = files.filter(f => f.type === DocType.PYQ);

    const parts: any[] = [];
    
    let prompt = `
    You are a strict **Reading Guide Strategist** for the topic: "${topicName}".
    The user is reading this chapter from the attached 'Main Notes'.

    **Your Goal:** 
    Do NOT summarize the content. 
    Break the chapter down into sub-sections and tell the user **exactly what to focus on**.

    **STRICT CONSTRAINTS:**
    1. **LANGUAGE**: English ONLY. Do NOT output any Hindi text.
    2. **PYQs**: If a PYQ matches a section, you MUST quote the **FULL ORIGINAL QUESTION TEXT**. Do not summarize the question.

    **Output Format (Use Markdown):**
    
    # Reading Guide: ${topicName}

    ## 📋 Section-by-Section Breakdown
    
    Scan the Main Note text and list every major sub-heading/topic. For each, provide:

    ### [Sub-Heading Name] (Approx Page: [Number if found])
    - **Verdict**: [READ / SKIM / SKIP / IGNORE]
    - **Relevance**: [High / Medium / Low]
    - **Instruction**: 
       - *If Relevant*: "Read this carefully for [Concept]. Pay attention to [Keyword]."
       - *If Irrelevant*: "Skip. Reason: [Why]."
    - **Linkages**:
       - *NCERT*: "Concepts overlap with Class [X] Chapter [Y]."
       - *Current Affairs*: "Related to recent news: [Headline]."
    - **PYQ Hit**: 
       - *If a PYQ matches*: "📌 **Question ([Year]):** [INSERT FULL QUESTION TEXT HERE]"
       - *If no PYQ*: Leave blank.

    (Do not add a General Instructions section at the end.)
    `;

    parts.push({ text: prompt });

    const addFiles = (fileList: UploadedFile[], label: string) => {
        fileList.forEach(file => {
            parts.push({ text: `\n--- Document: ${label} (${file.name}) ---` });
            parts.push({ inlineData: { mimeType: file.mimeType, data: file.base64 }});
        });
    };

    addFiles(mainFiles, "Main Notes (Mrunal)");
    addFiles(pyqFiles, "Previous Year Questions (PYQ)");
    addFiles(ncertFiles, "NCERT Basics");
    addFiles(currentFiles, "Current Affairs PDF");

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: { parts },
            config: {
                 temperature: 0.2,
            }
        }));

        return response.text || "No content generated.";
    } catch (error) {
        console.error("Error synthesizing topic:", error);
        return "## Error\nUnable to generate reading guide. Please try again.";
    }
};

/**
 * Step 3: Find Web Links (Grounding)
 */
export const findWebLinks = async (topicName: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing");

    const prompt = `
      Find 2 to 3 high-quality, recent web resources for the UPSC Economy topic: "${topicName}".
      Prioritize PIB (Press Information Bureau) and Indian Express Explained.
      Return a simple markdown list. 
      Format: - [Title of Article](URL) - Brief 1-line description.
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            }
        }));

        let output = "\n\n## 🌐 Live Web Resources (PIB/News)\n";
        output += response.text || "";

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (groundingChunks) {
            output += "\n\n**Source Citations:**\n";
            groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                   output += `- [${chunk.web.title}](${chunk.web.uri})\n`;
                }
            });
        }

        return output;
    } catch (error) {
        console.error("Search failed", error);
        return "\n\n*Failed to fetch live web links at this time.*";
    }
}

/**
 * Step 4: Generate Diagram (Mermaid)
 */
export const generateDiagram = async (topicName: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing");

    const prompt = `
        Create a visual flowchart or concept map for the topic "${topicName}" using **Mermaid.js syntax**.
        
        Rules:
        1. If the topic is abstract and NOT suitable for a diagram (like a simple definition), return strictly the string: "NO_DIAGRAM".
        2. If suitable, return ONLY the mermaid code block. Start with 'graph TD' or 'flowchart LR'.
        3. Keep the diagram simple and high-level. Max 10 nodes.
        4. Use simple node labels (no special characters that break mermaid).
        
        Example Output:
        graph TD
        A[Reserve Bank of India] --> B[Monetary Policy]
        B --> C[Repo Rate]
        B --> D[Reverse Repo Rate]
    `;

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        }));
        
        let text = response.text?.trim() || "";
        // clean up markdown code blocks if present
        text = text.replace(/```mermaid/g, '').replace(/```/g, '').trim();
        
        return text;
    } catch (error) {
        return "NO_DIAGRAM";
    }
};