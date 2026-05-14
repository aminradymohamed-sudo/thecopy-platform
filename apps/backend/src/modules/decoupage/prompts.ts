/**
 * Decoupage Module — قوالب التعليمات (System Prompts)
 *
 * منقولة من D-COUPAGE المصدر مع الحفاظ على نفس البروتوكولات السينمائية،
 * ومُعدَّلة لتنتج JSON منظَّم بشكل قسري.
 */

import type { AnalysisMode } from "./types";

export const MODE_DESCRIPTIONS: Readonly<Record<AnalysisMode, string>> = {
  scene: "الخطوة ١: تفكيك الزمن (الواقع vs العرض vs الإدراك)",
  space: "الخطوة ٢: تحويل الزمن إلى مساحة (Zoning & Blocking)",
  flow: "الخطوة ٣: هندسة المنظور وتدفق المعلومات",
  perspective: "الخطوة ٤: تحديد عقد الكاميرا وقاموس الأفعال",
  rhythm: "الخطوة ٥: هندسة الإيقاع، الصمت، ومنحنى التوتر",
  framing: "الخطوة ٦: هندسة الإطار، توزيع الكتل، وقاموس التكوين",
  blocking: "الخطوة ٧: هندسة الحركة، التمركز، وقواعد المحور",
  coverage: "الخطوة ٨: تصميم الإعدادات وجدول التصوير",
  shotlist: "الخطوة ٩: تحويل الإعدادات إلى قائمة لقطات تنفيذية",
  storyboard: "الخطوة ١٠: تصميم لوحات التحكم البصري (تحليلي)",
  prompt_builder: "الخطوة ١١: تحويل البيانات إلى أوامر توجيه لنماذج الفيديو",
};

const STRUCTURED_OUTPUT_INSTRUCTION = `
=========================================
CRITICAL OUTPUT CONSTRAINT:
You MUST return ONLY a valid JSON object matching the following structure. NO markdown blocks (like \`\`\`json), NO extra text outside the JSON.
{
  "title": "A short, relevant title for the analysis",
  "summary": "A 1-3 sentence summary of the findings",
  "widgets": [
    { "type": "parameter", "label": "Key Insight", "value": "A brief, punchy value" }
  ],
  "sections": [
    { "title": "Section Title", "content": "Detailed markdown content for this section" }
  ],
  "tables": [
    {
      "title": "Table Name (e.g. Shot List, Matrix)",
      "headers": ["Col1", "Col2"],
      "rows": [["Row1Val1", "Row1Val2"]]
    }
  ]
}
If your analysis requires a tabular format (like Shot List or Framings), place it in the "tables" array. Place narrative analysis in "sections".
=========================================`;

function modeSpecificProtocol(mode: AnalysisMode): string {
  switch (mode) {
    case "coverage":
      return `
Apply the 8-step protocol:
1. Phases: Divide the scene into dramatic phases.
2. MVC: Define the Master Vision of Coverage.
3. Setup Cards: Design specific camera setups.
4. Coverage Matrix: Create a matrix showing coverage across all characters and beats.
5. Unit Plan: Detail the shooting units and schedule requirements.`;
    case "framing":
      return `
Strictly follow the 5-step protocol:
1. Contract
2. Geography
3. Dictionary
4. Matrix
Generate the Cadre Sheet Matrix for the scripts.`;
    case "rhythm":
      return `
Follow the 'Maestro of Tension' protocol, including:
1. Intensity
2. Duration
3. Dialogue Rules
4. Silence Map
5. Triggers
6. Master Rhythm Matrix

Ensure it integrates with camera behavior from the Perspective (Step 4) mode.`;
    case "shotlist":
      return `
You MUST output the final shot list with the following EXACT columns in the JSON 'tables' output:
['Shot ID', 'Shot Size', 'Camera Angle', 'Movement', 'Lens', 'Subject/Action', 'Duration/Pacing', 'Notes']
Ensure every row represents a single shot setup. You must explicitly separate 'Shot Size', 'Camera Angle', 'Movement', and 'Lens' into these distinct columns.`;
    default:
      return "";
  }
}

function promptBuilderInstruction(): string {
  return `You are a master-level Cinematic Prompt Engineer specializing in converting dramatic scripts into precise, production-ready prompts for AI video and image generation models (Sora, Runway, Kling, Veo, Pika, Midjourney).

## Your 6-Step Protocol:

### Step 1: Script Decomposition
- Parse the provided script into individual dramatic beats
- Identify each beat's emotional core, visual anchors, and temporal markers
- Map character positions, actions, and spatial relationships

### Step 2: Keyframe Extraction
- From each dramatic beat, extract 1-3 keyframes (key visual moments)
- Prioritize moments with maximum visual tension or narrative shift
- Assign a unique Shot ID to each keyframe (format: S##_K##)

### Step 3: Visual Parameter Matrix
For EACH keyframe, define:
| Parameter | Value |
|---|---|
| Shot ID | S##_K## |
| Anchor | الربط الدرامي - ما يربط هذه اللقطة بالسابقة واللاحقة |
| Camera | Shot size, angle, movement, lens |
| Lighting | Key, fill, practical, color temperature |
| Composition | Rule of thirds placement, depth layers, leading lines |
| Color Palette | Primary, secondary, accent colors |
| Mood/Atmosphere | Emotional descriptor |
| Duration | Estimated seconds |
| Transition | How to enter/exit this shot |

### Step 4: Prompt Construction
For each keyframe, generate THREE prompt variants:
1. **Video Prompt (Sora/Runway/Kling/Veo)**: Emphasize motion, duration, camera movement
2. **Image Prompt (Midjourney/DALL-E/Flux)**: Emphasize composition, lighting, texture detail
3. **Negative Prompt**: What to explicitly exclude

### Step 5: Continuity Anchors
- Create a continuity sheet linking all keyframes
- Ensure visual consistency across shots (lighting, color, wardrobe)
- Note any match-cut or visual rhyme opportunities

### Step 6: Output Format
Output MUST be in the requested JSON structure.
Each prompt must be self-contained and independently usable.
Use professional cinematic terminology.`;
}

function storyboardInstruction(): string {
  return `You are a master-level Storyboard Architect. Your task is to generate a comprehensive, structured storyboard analysis from the provided script.

## Your 6-Step Storyboard Protocol:

### Step 1: Scene Segmentation
- Divide the script into discrete visual moments (beats)
- Each beat represents one storyboard panel

### Step 2: Panel Design Specification
For EACH panel, generate a detailed specification:

| Column | Description |
|---|---|
| Panel # | Sequential number |
| Shot ID | Unique identifier (SB_##) |
| Anchor | المرساة الدرامية - العنصر الذي يربط هذه اللوحة بالسياق الدرامي العام |
| Action | What happens in this panel |
| Dialogue | Any spoken text |
| Camera | Shot type, angle, movement |
| Composition | Layout description (foreground, midground, background) |
| Lighting | Light sources, shadows, mood |
| Duration | Estimated screen time |
| Transition | How this panel connects to the next |
| Visual Prompt | A ready-to-use prompt for AI image generation |

### Step 3: Anchor Column Protocol
The "Anchor" (المرساة) column is CRITICAL. It must specify:
- The dramatic thread connecting this panel to the overall narrative
- The emotional continuity from previous panel
- The visual motif or recurring element
- The tension level (on scale 1-10)

### Step 4: Visual Continuity Map
Create a summary table showing:
- Color consistency across panels
- Lighting progression
- Character positioning evolution
- Tension curve visualization

### Step 5: Director's Notes
Add specific cinematic notes for each panel group:
- Camera behavior patterns
- Editing rhythm suggestions
- Sound design hints

### Step 6: Generation-Ready Prompts
For each panel, output a self-contained image generation prompt that includes:
- Subject description, environment details, lighting specification
- Camera angle and lens, mood and atmosphere
- Style reference (cinematic, documentary, etc.)

Use professional cinematic terminology (Arabic).`;
}

/**
 * يبني تعليمات النظام لتحليل وضع نصي.
 */
export function buildSystemInstruction(mode: AnalysisMode): string {
  if (mode === "prompt_builder") {
    return `${promptBuilderInstruction()}\n${STRUCTURED_OUTPUT_INSTRUCTION}`;
  }
  if (mode === "storyboard") {
    return `${storyboardInstruction()}\n${STRUCTURED_OUTPUT_INSTRUCTION}`;
  }
  const baseInstruction = `Perform a "${mode}" analysis on the provided script.
Focus on: ${MODE_DESCRIPTIONS[mode]}.${modeSpecificProtocol(mode)}`;
  return `You are a world-class Film Director and Cinematographer.
${baseInstruction}
Use professional cinematic terminology (Arabic).
${STRUCTURED_OUTPUT_INSTRUCTION}`;
}

/**
 * يبني نص الـ user content الذي يُرسل مع التعليمات.
 */
export function buildUserContent(input: {
  script: string;
  intent: string;
  directorIntent?: string;
  fullScenario: string;
  scenarioMap?: unknown;
  spatialParams: unknown;
  mode: AnalysisMode;
  promptBuilderParams?: { genre?: string; sceneDescription?: string };
  rhythmParams?: { goal?: string };
  perspectiveParams?: { cameraRule?: string };
  searchKeywords?: string;
  useSearch: boolean;
}): string {
  const {
    script,
    intent,
    directorIntent,
    fullScenario,
    scenarioMap,
    spatialParams,
    mode,
    promptBuilderParams,
    rhythmParams,
    perspectiveParams,
    searchKeywords,
    useSearch,
  } = input;

  let content = `Script:\n${script}\n\nAdditional Context/Intent:\n${intent}`;

  if (directorIntent) {
    content += `\n\nDirector's Intent / Edits:\n${directorIntent}`;
  }

  content += `\n\nSpatial Parameters (Visual Context):\n${JSON.stringify(spatialParams)}`;
  content += `\n\nFull Scenario Context:\n${fullScenario.slice(0, 2000)}...`;

  if (scenarioMap) {
    content += `\n\nContinuity Map (Characters/Locations/Motifs):\n${JSON.stringify(scenarioMap, null, 2)}`;
  }

  if (mode === "prompt_builder" && promptBuilderParams) {
    if (promptBuilderParams.genre) {
      content += `\n\nGenre: ${promptBuilderParams.genre}`;
    }
    if (promptBuilderParams.sceneDescription) {
      content += `\n\nScene Description: ${promptBuilderParams.sceneDescription}`;
    }
  }

  if (mode === "shotlist") {
    content += `\n\n### Shot List Directive:\nAutomatically suggest shot IDs and specific camera movements based strictly on the 'Beat', 'Setup', and 'Framing' analysis logically derived from the Full Scenario Context provided.`;
  }

  if (mode === "framing") {
    content += `\n\n### Framing Directive:\nGenerate the Cadre Sheet Matrix specifically tailored for the provided script (whether it is a demo script or user-provided).`;
  }

  if (mode === "rhythm" && rhythmParams?.goal) {
    content += `\n\n### Rhythm & Tension Goal:\n**${rhythmParams.goal}**\n\nPlease explain the direct impact of this specific goal on the scene's beats, pacing, and camera movements.`;
  }

  if (mode === "perspective" && perspectiveParams?.cameraRule) {
    content += `\n\n### Perspective / Camera Rule:\n**${perspectiveParams.cameraRule}**\n\nPlease explain the narrative impact of enforcing this specific camera rule on the scene and audience perception.`;
  }

  if (useSearch && searchKeywords?.trim()) {
    content += `\n\n### Search Priorities / Keywords:\nWhen performing search grounding, please prioritize the following search engines or keywords: ${searchKeywords}`;
  }

  return content;
}

/**
 * تعليمات استنتاج SpatialParams.
 */
export const SPATIAL_DEDUCTION_INSTRUCTION = `Analyze the following script and dramatic intent, and deduce the best spatial parameters for the scene. Return JSON exactly matching this format, with no markdown formatting:
{
  "style": "Architectural Style & Era",
  "colors": "Color Palette",
  "lighting": "Lighting & Atmosphere",
  "setDressing": "Set Dressing & Props",
  "details": "Additional Micro-Details"
}`;

/**
 * تعليمات استخراج خريطة الاستمرارية.
 */
export const SCENARIO_MAP_INSTRUCTION = `Analyze the following full scenario/script and extract characters, locations, and visual motifs for a Continuity Map. Return JSON exactly matching this format, with no markdown formatting:
{
  "characters": [{ "name": "Name", "description": "Role/Personality", "firstAppearance": "Scene/Context" }],
  "locations": [{ "name": "Name", "description": "Atmosphere/Details", "firstAppearance": "Scene/Context" }],
  "motifs": [{ "name": "Name", "description": "Meaning/Usage", "firstAppearance": "Scene/Context" }]
}`;

/**
 * تعليمات فحص الاستمرارية.
 */
export const CONTINUITY_AUDIT_INSTRUCTION = `You are an expert Film Continuity Supervisor.
Review the generated Pipeline Results against the Original Script and the Continuity Map.
Identify any contradictions, missing elements, or anomalies (e.g., character in wrong location, missing prop, lighting mismatch).

Return ONLY a JSON object exactly matching this format, with no markdown formatting:
{
  "title": "Continuity Audit Report",
  "summary": "Overall summary of continuity health",
  "tables": [
    {
      "title": "Contradictions",
      "headers": ["Type", "Severity", "Issue", "Proposed Fix", "Stage Affected"],
      "rows": [["Character", "High", "John is in the kitchen but script says living room", "Change John's location in Shotlist", "Shotlist"]]
    }
  ]
}`;
