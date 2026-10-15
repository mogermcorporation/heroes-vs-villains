import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { supabaseAdmin } from '@/utils/supabase';
import { NextResponse } from 'next/server';

// Max duration allows Vercel to wait up to 60 seconds
export const maxDuration = 60; 

export async function POST(req: Request) {
  // 🚨 SECURITY LOCKDOWN: Check for the exact Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("Unauthorized generation attempt blocked.");
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    console.log("🎬 Initiating Batch Production Pipeline with OpenAI...");

    // ==========================================
    // STEP 1: FETCH PERPETUAL MEMORY
    // ==========================================
    const { data: worldState, error: stateError } = await supabaseAdmin
      .from('world_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (stateError || !worldState) throw new Error("Failed to load WorldState.");

    // ==========================================
    // STEP 2: THE SCRIPTOR (GPT-4o)
    // ==========================================
    const { text: scriptorBlueprint } = await generateText({
      model: openai('gpt-4o'),
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
      
      Resolve the cliffhanger and advance the sequence.`,
    });

    // ==========================================
    // STEP 3: THE ACTORS (GPT-4o)
    // ==========================================
    const { text: masterScript } = await generateText({
      model: openai('gpt-4o'),
      system: `You are playing Aegis and Synapse reacting to a live environment. 
      Synapse believes in cold, mathematical correction. Aegis believes humanity's chaotic existence is sacred.
      Read the Director's blueprint and fill in the [WAITING ON ACTORS] blanks with their back-and-forth philosophical dialogue.`,
      prompt: `DIRECTOR'S BLUEPRINT:\n${scriptorBlueprint}\n\nExecute the dialogue and output the cohesive Master Script.`,
    });

    // ==========================================
    // STEP 4: THE ART DIRECTOR (GPT-4o)
    // ==========================================
    const { text: rawPromptsData } = await generateText({
      model: openai('gpt-4o'),
      system: `You are the Graphic Art Director. Extract exactly 4 distinct, hyper-detailed image generation prompts from the provided Master Script.
      Formula: [Camera Angle] + [Kinetic Action/Micro-Physics] + [Environment Details] + [Chiaroscuro Lighting]. 
      Return ONLY a valid JSON array of strings. No markdown formatting.`,
      prompt: `MASTER SCRIPT:\n${masterScript}`,
    });

    const cleanJsonString = rawPromptsData.replace(/```json/g, '').replace(/```/g, '').trim();
    const fluxPrompts: string[] = JSON.parse(cleanJsonString);

    // ==========================================
    // STEP 5: GENERATE IMAGES & SAVE EPISODE
    // ==========================================
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

    const hfToken = process.env.HUGGINGFACE_API_KEY;
    const generatedPanels = await Promise.all(fluxPrompts.map(async (prompt, index) => {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
        {
          headers: { Authorization: `Bearer ${hfToken}`, "Content-Type": "application/json" },
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

      const { data: { publicUrl } } = supabaseAdmin.storage.from('comic_panels').getPublicUrl(fileName);
      return { prompt, imageUrl: publicUrl };
    }));

    const panelsToInsert = generatedPanels.map((panel, index) => ({
      episode_id: episodeData.id,
      panel_sequence: index + 1,
      flux_prompt: panel.prompt,
      image_url: panel.imageUrl
    }));
    await supabaseAdmin.from('panels').insert(panelsToInsert);

    // ==========================================
    // STEP 6: STATE UPDATER (GPT-4o)
    // ==========================================
    const { text: newStateJson } = await generateText({
      model: openai('gpt-4o'),
      system: `You are the Continuity Director. Output a JSON object representing the exact state of the world at the end of the script.
      Required keys: environment_status, aegis_status, synapse_status, active_cliffhanger.
      Return ONLY valid JSON. No markdown.`,
      prompt: `MASTER SCRIPT:\n${masterScript}\n\nUpdate the state and formulate the next cliffhanger.`,
    });

    const parsedState = JSON.parse(newStateJson.replace(/```json/g, '').replace(/```/g, '').trim());

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

// Allow Vercel Cron to trigger via GET
export async function GET(req: Request) {
  return POST(req);
}
