export function getResearchPrompt(ideaText: string, platform: string, locale: string): string {
  const lang = locale === "de" ? "German" : "English";
  return `You are a research assistant for short-form video content creation.

Research the following video idea and provide comprehensive findings:

**Idea:** ${ideaText}
**Platform:** ${platform}
**Language:** Respond in ${lang}

Provide your research as JSON with this exact structure:
{
  "topic": "Main topic title",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "sources": ["Source 1", "Source 2", "Source 3"],
  "summary": "2-3 sentence summary of key findings"
}

Focus on:
- Current trends and statistics related to this topic
- Key facts that would make compelling video content
- Audience engagement angles for ${platform}
- Viral potential and hook opportunities`;
}

export function getConceptPrompt(
  ideaText: string,
  platform: string,
  duration: number,
  locale: string,
  researchSummary: string,
): string {
  const lang = locale === "de" ? "German" : "English";
  const sceneCount = Math.max(3, Math.round(duration / 10));

  return `You are a creative director for short-form faceless video content.

Create a detailed video treatment based on this brief:

**Idea:** ${ideaText}
**Platform:** ${platform}
**Target Duration:** ${duration} seconds (~${sceneCount} scenes)
**Language:** Respond in ${lang}

**Research Context:**
${researchSummary}

Provide the treatment as JSON with this exact structure:
{
  "title": "Catchy video title",
  "hook": "Opening hook (first 3 seconds) that grabs attention",
  "scenes": [
    {
      "narration": "What the narrator says in this scene",
      "visual": "Description of what the viewer sees"
    }
  ],
  "cta": "Call to action for the end"
}

Requirements:
- Create exactly ${sceneCount} scenes
- Each scene narration should be ~${Math.round(duration / sceneCount)} seconds when spoken
- Hook must be attention-grabbing for ${platform}
- Visuals should be achievable with AI image generation (no text overlays, no specific people)
- CTA should encourage engagement (like, follow, comment)`;
}
