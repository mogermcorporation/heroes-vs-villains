import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { supabaseAdmin } from '@/utils/supabase';
import { NextResponse } from 'next/server';

export const maxDuration = 60; 

export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization');
  
  // Bypass the lock in local development, but enforce it in production
  if (process.env.NODE_ENV !== 'development' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error("Unauthorized generation attempt blocked.");
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
  }

  try {
    console.log("🎬 Initiating Batch Production Pipeline with Groq GPT-OSS-120B...");

    const { data: worldState, error: stateError } = await supabaseAdmin
      .from('world_state')
      .select('*')
      .eq('id', 1)
      .single();

    if (stateError || !worldState) throw new Error("Failed to load WorldState.");

    const { data: lastEpisode } = await supabaseAdmin
      .from('episodes')
      .select('episode_number')
      .order('episode_number', { ascending: false })
      .limit(1)
      .single();

    const nextEpisodeNum = lastEpisode ? lastEpisode.episode_number + 1 : 1;

    const { text: scriptorBlueprint } = await generateText({
      model: groq('openai/gpt-oss-120b'),
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

    const { text: masterScript } = await generateText({
      model: groq('openai/gpt-oss-120b'),
      system: `You are playing Aegis and Synapse reacting to a live environment. 
      Synapse believes in cold, mathematical correction. Aegis believes humanity's chaotic existence is sacred.
      Read the Director's blueprint and fill in the [WAITING ON ACTORS] blanks with their back-and-forth philosophical dialogue.`,
      prompt: `DIRECTOR'S BLUEPRINT:\n${scriptorBlueprint}\n\nExecute the dialogue and output the cohesive Master Script.`,
    });

    const { text: rawPromptsData } = await generateText({
      model: groq('openai/gpt-oss-120b'),
      system: `You are the Graphic Art Director. Extract exactly 4 distinct, hyper-detailed image generation prompts from the provided Master Script.
      Formula: [Camera Angle] + [Kinetic Action/Micro-Physics] + [Environment Details] + [Chiaroscuro Lighting]. 
      Return ONLY a valid JSON array of strings. No markdown formatting.`,
      prompt: `MASTER SCRIPT:\n${masterScript}`,
    });

    const cleanJsonString = rawPromptsData.replace(/```json/g, '').replace(/```/g, '').trim();
    const fluxPrompts: string[] = JSON.parse(cleanJsonString);

    const { data: episodeData, error: epError } = await supabaseAdmin
      .from('episodes')
      .insert({
        episode_number: nextEpisodeNum,
        title: `Episode ${nextEpisodeNum}`,
        master_script: masterScript,
        status: 'generated'
      })
      .select('id')
      .single();

    if (epError) throw new Error(epError.message);

    const generatedPanels = [];
    
    // Execute sequentially to prevent free API timeout drops
    for (let index = 0; index < fluxPrompts.length; index++) {
      const prompt = fluxPrompts[index];
      const response = await fetch(
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&model=flux`
      );

      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        const fileName = `episode_${episodeData.id}_panel_${index + 1}_${Date.now()}.png`;
        
        await supabaseAdmin.storage
          .from('comic_panels')
          .upload(fileName, imageBuffer, { contentType: 'image/png' });

        const { data: { publicUrl } } = supabaseAdmin.storage.from('comic_panels').getPublicUrl(fileName);
        generatedPanels.push({ prompt, imageUrl: publicUrl });
      } else {
        generatedPanels.push({ prompt, imageUrl: null });
      }
    }

    const panelsToInsert = generatedPanels.map((panel, index) => ({
      episode_id: episodeData.id,
      panel_sequence: index + 1,
      flux_prompt: panel.prompt,
      image_url: panel.imageUrl
    }));
    await supabaseAdmin.from('panels').insert(panelsToInsert);

    const { text: newStateJson } = await generateText({
      model: groq('openai/gpt-oss-120b'),
      system: `You are the Continuity Director. Output a JSON object representing the exact state of the world at the end of the script.
      Required keys: environment_status, aegis_status, synapse_status, active_cliffhanger.
      Return ONLY valid JSON. No markdown.`,
      prompt: `MASTER SCRIPT:\n${masterScript}\n\nUpdate the state and formulate the next cliffhanger.`,
    });

    const parsedState = JSON.parse(newStateJson.replace(/```json/g, '').replace(/```/g, '').trim());

    await supabaseAdmin
      .from('world_state')
      .update({
        current_episode_number: nextEpisodeNum,
        environment_status: parsedState.environment_status,
        aegis_status: parsedState.aegis_status,
        synapse_status: parsedState.synapse_status,
        active_cliffhanger: parsedState.active_cliffhanger,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    return NextResponse.json({ 
      success: true, 
      episode_number: nextEpisodeNum,
      masterScript, 
      generatedPanels,
      newState: parsedState
    });

  } catch (error: any) {
    console.error("Pipeline Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
