/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StrategicHint, AiResponse, DebugInfo } from "../types";

export interface TargetCandidate {
  id: string;
  color: string;
  size: number;
  row: number;
  col: number;
  pointsPerBubble: number;
  description: string;
}

// Local strategy - works 100% offline
export const getStrategicHint = async (
  imageBase64: string,
  validTargets: TargetCandidate[],
  dangerRow: number
): Promise<AiResponse> => {
  const hasTargets = validTargets.length > 0;
  let message = "Pinch & Pull to Shoot!";
  let rationale = "Aim for clusters of 3+ matching bubbles";
  let targetRow = -1;
  let targetCol = -1;
  let recommendedColor = 'red' as 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
  
  if (hasTargets) {
    // Sort by score potential (size * points)
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
