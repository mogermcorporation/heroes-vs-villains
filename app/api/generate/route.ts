import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { supabaseAdmin } from '@/utils/supabase';
import { NextResponse } from 'next/server';

// Max duration allows Vercel to wait up to 60 seconds (Pro tier up to 300s) for the AI chain to complete.
export const maxDuration = 60; 

export async function POST(req: Request) {
  try {
    console.log("🎬 Initiating Batch Production Pipeline...");

    // ==========================================
    // STEP 1: FETCH PERPETUAL MEMORY (WORLD STATE)
    // ==========================================
    const { data: worldState, error: stateError } = await supabaseAdmin
      .from('world_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (stateError || !worldState) {
      throw new Error("Failed to load WorldState from Supabase.");
    }

    // ==========================================
    // STEP 2: THE SCRIPTOR (SCENE & STAKES)
    // ==========================================
    console.log("✍️ Scriptor is writing the Master Blueprint...");
    const { text: scriptorBlueprint } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      system: `You are the Master Scriptor for a brutalist sci-fi motion comic.
      Rules:
      1. Use the "Collateral Camera" (worm's-eye view, obscured by shrapnel, civilian POV).
      2. Use The Vacuum (terrifying silence before impact).
      3. Aegis reflects heavy, grueling physical agony.
      4. Synapse reflects frictionless, terrifying perfection.
      OUTPUT FORMAT: Write 3 to 4 sequential BEATS. Describe the environment and destruction vividly. End each beat with [WAITING ON ACTORS]. Do not write dialogue.`,
      prompt: `CURRENT WORLD STATE:
      Environment: ${worldState.environment_status}
      Aegis Status: ${worldState.aegis_status}
      Synapse Status: ${worldState.synapse_status}
      Active Cliffhanger: ${worldState.active_cliffhanger}
      
      Resolve the cliffhanger and advance the sequence. Write the Master Blueprint now.`,
    });

    // ==========================================
    // STEP 3: THE ACTORS (PHILOSOPHICAL DIALOGUE)
    // ==========================================
    console.log("🎭 Actors are stepping on stage...");
    const { text: masterScript } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      system: `You are playing Aegis and Synapse reacting to a live environment. 
      Synapse believes in cold, mathematical correction (sterile, perfect, frictionless).
      Aegis believes humanity's chaotic existence is sacred (heavy, desperate, grueling).
      Read the Director's blueprint and fill in the [WAITING ON ACTORS] blanks with their back-and-forth philosophical dialogue reacting strictly to the destruction occurring in the beat.`,
      prompt: `DIRECTOR'S BLUEPRINT:\n${scriptorBlueprint}\n\nExecute the dialogue and output the final, cohesive Master Script combining the action and dialogue.`,
    });

    // ==========================================
    // STEP 4: THE ART DIRECTOR (FLUX.1 PROMPTS)
    // ==========================================
    console.log("🎨 Art Director is extracting visual prompts...");
    const { text: rawPromptsData } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      system: `You are the Graphic Art Director. Extract exactly 4 distinct, hyper-detailed image generation prompts from the provided Master Script.
      Formula: [Camera Angle] + [Kinetic Action/Micro-Physics] + [Environment Details] + [Chiaroscuro Lighting]. 
      Return ONLY a valid JSON array of strings. No markdown formatting.`,
      prompt: `MASTER SCRIPT:\n${masterScript}`,
    });

    // Clean up Gemini's JSON output
    const cleanJsonString = rawPromptsData.replace(/```json/g, '').replace(/```/g, '').trim();
    const fluxPrompts: string[] = JSON.parse(cleanJsonString);

    // ==========================================
    // STEP 5: GENERATE IMAGES & SAVE EPISODE
    // ==========================================
    console.log("🚀 Firing parallel requests to Hugging Face FLUX.1...");
    
    // Save the Master Script to get the Episode ID
    const { data: episodeData, error: epError } = await supabaseAdmin
      .from('episodes')
      .insert({
        episode_number: worldState.current_episode_number + 1,
        title: `Episode ${worldState.current_episode_number + 1}`,
        master_script: masterScript,
        status: 'generated'
      })
      .select('id')
      .single();

    if (epError) throw new Error(epError.message);

    // Generate images simultaneously and upload to Supabase bucket
    const hfToken = process.env.HUGGINGFACE_API_KEY;
    const generatedPanels = await Promise.all(fluxPrompts.map(async (prompt, index) => {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          headers: {
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({ inputs: prompt }),
        }
      );

      if (!response.ok) return { prompt, imageUrl: null };

      const imageBuffer = await response.arrayBuffer();
      const fileName = `episode_${episodeData.id}_panel_${index + 1}_${Date.now()}.png`;
      
      await supabaseAdmin.storage
        .from('comic_panels')
        .upload(fileName, imageBuffer, { contentType: 'image/png' });

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('comic_panels')
        .getPublicUrl(fileName);

      return { prompt, imageUrl: publicUrl };
    }));

    // Save final panel data (with image URLs) to the database
    const panelsToInsert = generatedPanels.map((panel, index) => ({
      episode_id: episodeData.id,
      panel_sequence: index + 1,
      flux_prompt: panel.prompt,
      image_url: panel.imageUrl
    }));
    await supabaseAdmin.from('panels').insert(panelsToInsert);

    // ==========================================
    // STEP 6: FEED THE CIRCLE (STATE UPDATER)
    // ==========================================
    console.log("🔄 Updating WorldState for the next episode...");
    const { text: newStateJson } = await generateText({
      model: google('gemini-1.5-pro-latest'),
      system: `You are the Continuity Director. Analyze the Master Script and output a JSON object representing the exact state of the world at the end of the script.
      Required keys: environment_status, aegis_status, synapse_status, active_cliffhanger.
      Return ONLY valid JSON. No markdown.`,
      prompt: `MASTER SCRIPT:\n${masterScript}\n\nUpdate the state and formulate the cliffhanger for the start of the next episode.`,
    });

    const parsedState = JSON.parse(newStateJson.replace(/```json/g, '').replace(/```/g, '').trim());

    // Overwrite row 1 in the database
    await supabaseAdmin
      .from('world_state')
      .update({
        current_episode_number: worldState.current_episode_number + 1,
        environment_status: parsedState.environment_status,
        aegis_status: parsedState.aegis_status,
        synapse_status: parsedState.synapse_status,
        active_cliffhanger: parsedState.active_cliffhanger,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    console.log("✅ Episode fully generated, saved, and loop reset.");
    return NextResponse.json({ 
      success: true, 
      episode_number: worldState.current_episode_number + 1,
      masterScript, 
      generatedPanels,
      newState: parsedState
    });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Vercel Cron Jobs trigger via GET requests. 
// This simply routes the Cron trigger into your existing POST logic.
export async function GET(req: Request) {
  return POST(req);
}
