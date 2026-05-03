/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { StrategicHint, AiResponse, DebugInfo } from "../types";

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const MODEL_NAME = "gemini-3.1-pro-preview";

export interface TargetCandidate {
  id: string;
  color: string;
  size: number;
  row: number;
  col: number;
  pointsPerBubble: number;
  description: string;
}

export const getStrategicHint = async (
  imageBase64: string,
  validTargets: TargetCandidate[],
  dangerRow: number
): Promise<AiResponse> => {
  
  // If no API key, use local strategy
  if (!ai) {
    return getLocalStrategy(validTargets, dangerRow);
  }

  const startTime = performance.now();
  
  const debug: DebugInfo = {
    latency: 0,
    screenshotBase64: imageBase64,
    promptContext: "",
    rawResponse: "",
    timestamp: new Date().toLocaleTimeString()
  };

  const hasDirectTargets = validTargets.length > 0;

  const targetListStr = hasDirectTargets 
    ? validTargets.map(t => 
        `- OPTION: Select ${t.color.toUpperCase()} (${t.pointsPerBubble} pts/bubble) -> Target [Row ${t.row}, Col ${t.col}]. Cluster Size: ${t.size}. Total Value: ${t.size * t.pointsPerBubble}.`
      ).join("\n")
    : "NO MATCHES AVAILABLE. Suggest a color to set up a future combo.";
  
  debug.promptContext = targetListStr;

  const prompt = `
    You are an expert strategic gaming AI analyzing a Bubble Shooter game where the player can CHOOSE their projectile color.
    I have provided a screenshot of the current board and a list of valid targets for all available colors.

    ### GAME STATE
    - Danger Level: ${dangerRow >= 6 ? "CRITICAL (Bubbles near bottom!)" : "Stable"}
    
    ### SCORING RULES
    - Bubble values: Red (100), Blue (150), Green (200), Yellow (250), Purple (300), Orange (500 pts - High Value!)
    - The player needs a total of 3 connected bubbles of the same color to create a match and clear them.
    - IMPORTANT: Shooting at a cluster of size 1 will ONLY result in a cluster of size 2 (no match). 
      To clear bubbles immediately, you MUST target a cluster of size 2 or greater!

    ### AVAILABLE MOVES (Validated Clear Shots)
    ${targetListStr}

    ### YOUR STRATEGIC TASK
    Analyze the visual board state. 
    1. Choose the BEST color for the player to equip from the available moves.
    2. Tell them where to shoot that specific color.
    
    STRATEGY PRIORITIES:
    1. **Survival**: If Danger is CRITICAL, ignore score and target the lowest bubbles to stay alive. Target clusters of size >= 2 to clear them.
    2. **Guaranteed Clears**: Highly prefer targeting clusters of size >= 2 so they clear immediately and score points.
    3. **High Score & Combos**: Hitting high-value colors (Orange/Purple) matches. Note that larger clusters give better points.
    4. **Structural / Avalanche**: Hitting high up on the board or targeting a cluster that supports many bubbles below it, to drop non-matching bubbles.
    5. **Setup**: If no size >= 2 clusters exist for good colors, prepare for the next shot by shooting at a size 1 cluster to make it size 2.

    ### OUTPUT FORMAT
    Return RAW JSON only. Do not use Markdown. Do not use code blocks.
  `;

  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
            { text: prompt },
            { 
              inlineData: {
                mimeType: "image/png",
                data: cleanBase64
              } 
            }
        ]
      },
      config: {
        maxOutputTokens: 2048,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: { type: Type.STRING, description: "Short operational directive (e.g. 'Target the Red Cluster')" },
            rationale: { type: Type.STRING, description: "One sentence explaining the strategic benefit" },
            recommendedColor: { type: Type.STRING, description: "The color to equip: red, blue, green, yellow, purple, or orange" },
            targetRow: { type: Type.INTEGER, description: "Row index of the target (integer)" },
            targetCol: { type: Type.INTEGER, description: "Col index of the target (integer)" }
          },
          required: ["message", "rationale", "recommendedColor", "targetRow", "targetCol"]
        }
      }
    });

    const endTime = performance.now();
    debug.latency = Math.round(endTime - startTime);
    
    let text = response.text || "{}";
    debug.rawResponse = text;
    
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        text = text.substring(firstBrace, lastBrace + 1);
    }

    try {
        const json = JSON.parse(text);
        debug.parsedResponse = json;
        
        const r = Number(json.targetRow);
        const c = Number(json.targetCol);
        
        if (!isNaN(r) && !isNaN(c) && json.recommendedColor) {
            return {
                hint: {
                    message: json.message || "Good shot available!",
                    rationale: json.rationale,
                    targetRow: r,
                    targetCol: c,
                    recommendedColor: json.recommendedColor.toLowerCase()
                },
                debug
            };
        }
        return {
            hint: getBestLocalTarget("AI returned invalid coordinates"),
            debug: { ...debug, error: "Invalid Coordinates in JSON" }
        };

    } catch (e: any) {
        console.warn("Failed to parse Gemini JSON:", text);
        return {
            hint: getBestLocalTarget("AI response parse error"),
            debug: { ...debug, error: `JSON Parse Error: ${e.message}` }
        };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const endTime = performance.now();
    debug.latency = Math.round(endTime - startTime);
    return {
        hint: getBestLocalTarget("AI Service Unreachable"),
        debug: { ...debug, error: error.message || "Unknown API Error" }
    };
  }
  
  function getBestLocalTarget(msg: string = "No clear shots—play defensively."): StrategicHint {
    if (validTargets.length > 0) {
        const best = validTargets.sort((a,b) => {
            const scoreA = a.size * a.pointsPerBubble;
            const scoreB = b.size * b.pointsPerBubble;
            return (scoreB - scoreA) || (a.row - b.row);
        })[0];
        
        return {
            message: `Fallback: Select ${best.color.toUpperCase()} at Row ${best.row}`,
            rationale: "Selected based on highest potential cluster score available locally.",
            targetRow: best.row,
            targetCol: best.col,
            recommendedColor: best.color as any
        };
    }
    return { message: msg, rationale: "No valid clusters found to target." };
  }
};

// Local strategy when no API key exists
const getLocalStrategy = (validTargets: TargetCandidate[], dangerRow: number): AiResponse => {
  const hasTargets = validTargets.length > 0;
  let message = "Pinch & Pull to Shoot!";
  let rationale = "Aim for clusters of 3+ matching bubbles";
  let targetRow = -1;
  let targetCol = -1;
  let recommendedColor = 'red' as 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  
  if (hasTargets) {
    const sorted = [...validTargets].sort((a, b) => {
      const scoreA = a.size * a.pointsPerBubble;
      const scoreB = b.size * b.pointsPerBubble;
      return scoreB - scoreA || a.row - b.row;
    });
    
    const best = sorted[0];
    recommendedColor = best.color as 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
    targetRow = best.row;
    targetCol = best.col;
    
    if (dangerRow >= 6) {
      message = `DANGER! Target ${best.color.toUpperCase()} to survive`;
      rationale = "Bubbles are near the bottom - clear them fast!";
    } else if (best.size >= 3) {
      message = `Great shot! Target ${best.color.toUpperCase()} cluster`;
      rationale = `Clearing ${best.size} bubbles with ${best.pointsPerBubble} pts each`;
    } else {
      message = `Target ${best.color.toUpperCase()} at Row ${best.row}`;
      rationale = "Building towards a bigger match";
    }
  } else {
    message = "No clear matches - play defensively";
    rationale = "Shoot any color to set up future combos";
  }
  
  return {
    hint: {
      message,
      rationale,
      targetRow,
      targetCol,
      recommendedColor
    },
    debug: {
      latency: 0,
      promptContext: hasTargets ? validTargets.map(t => `${t.color} x${t.size}`).join(', ') : "No targets",
      rawResponse: "Local strategy (no API)",
      timestamp: new Date().toLocaleTimeString()
    }
  };
};