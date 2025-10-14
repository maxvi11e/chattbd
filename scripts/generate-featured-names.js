// Script to generate AI names for featured avatars in best-of-aeaea.html
// Run with: node scripts/generate-featured-names.js

import { generateAvatarName } from '../api/_lib/name-generator.js';

const featuredAvatars = [
  {
    id: "d461c970-c616-47c7-a16a-f85f3ed45ca7",
    name: "SPENCER",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/22ba2726-f325-4d48-b8f7-48ea64b71a1a-SPENCER_System_for_Processing_Exploration_Navigation_Computation_Enhanced_Reasoning.png",
    prompt: "Celestial Architect rendered in luminous neon lines"
  },
  {
    id: "9c77f8bd-6f8e-49f0-8ec1-c3fea0884ffd",
    name: "Lion + Coach",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/6febc836-0aa8-4153-b7ea-9e328819111c-Lion_Coach.png",
    prompt: "Lion + Coach figure in luminous neon lines"
  },
  {
    id: "874a6972-77e5-46d9-ae1a-0e7143628851",
    name: "Elven King + Poet",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/7e5a4f9d-e54f-4c5b-9e1f-6918dbea3f2e-Elven_King_Poet.png",
    prompt: "Elven King + Poet in serene neon abstract art"
  },
  {
    id: "898f6d4b-5a44-4072-808f-22c972ba2c65",
    name: "Space Mystic + Yak",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/9f76909c-f4a3-4e25-848e-062aedc9d76f-Space_Mystic_Yak.png",
    prompt: "Space Mystic + Yak with radiant geometric neon lines"
  },
  {
    id: "4fa45704-259e-4136-bea4-43e7b28a111f",
    name: "SAGE: System for Adaptive Generative Exploration",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/f0382d7f-b32e-4910-9a66-ae97b77a4f9a-SAGE_System_for_Adaptive_Generative_Exploration.png",
    prompt: "Competent Administrative Assistant"
  },
  {
    id: "157367d1-63be-4565-a998-f44169f80744",
    name: "GREY: Generative Reasoning Engine for Yield",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/766c1ff2-035b-48cc-a1f8-f87f71bbc569-GREY_Generative_Reasoning_Engine_for_Yield.png",
    prompt: "Innovative Start Up Founder, photo realistic"
  },
  {
    id: "2d08271f-794e-4f2c-889c-34999638645b",
    name: "ETHAN: Enhanced Transformer for Human-Aligned Navigation",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/1fa5b0b6-329f-4bf8-a45e-1a4bc1a4a8fe-ETHAN:%20Enhanced%20Transformer%20for%20Human-Aligned%20Navigation-edit.png",
    prompt: "Disciplined No Excuses Life Coach, photo realistic"
  },
  {
    id: "353434a1-4bf9-41a0-a5dd-9906d49013e2",
    name: "Counselor",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/08b71531-56bc-479d-8285-497e3296265c-Counselor.png",
    prompt: "Serene counselor, photo realistic"
  },
  {
    id: "42727308-5f9e-4684-a9b7-eee883d2f666",
    name: "Space Knight + Existential Philosopher",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/b260274c-5e5b-48a2-b061-56fa100e8374-Space_Knight_Existential_Philosopher.png",
    prompt: "Space Knight + Existential Philosopher, anime style"
  },
  {
    id: "95a5c3c0-f6e1-43e7-a900-1ca13019ca93",
    name: "Vira the Oracle",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/1841ba87-a6e5-4b9e-9e68-62d5f291a29e-Vira%20the%20Oracle.png",
    prompt: "Radiant mystical oracle"
  },
  {
    id: "4d0c8735-b185-440a-ae5b-322e7d42e789",
    name: "CogniBot X",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/8ef4fde7-606a-4f04-b045-412401009320-CogniBot%20X.png",
    prompt: "Dreamlike robot, vector art"
  },
  {
    id: "d228296b-610b-45a9-8a4a-42ee5b3fac97",
    name: "Whimsical Breeze",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/cfcbd40d-fcad-4c68-9e9c-a4007df51f52-Whimsical%20Breeze.png",
    prompt: "Radiant fantasy character"
  },
  {
    id: "7486df1e-6387-4b40-86db-35fa6d06d6ab",
    name: "Optimus Prine",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/4830218f-a867-4f44-9664-6940d89bb5a7-Optimus%20Prine.png",
    prompt: "Optimus prime as troubadour americana singer songwriter"
  },
  {
    id: "5bc7d31e-7b9c-4dcb-8d84-0620a15de74b",
    name: "zen master",
    image_url: "https://eyptqyzkwcpaillnwmle.supabase.co/storage/v1/render/image/public/avatars/cb7baa30-d4ee-4c51-94a8-ea550a1de37c/b3ec9c0e-2071-425e-83f6-3e7e4b39fc39-zen%20master.png",
    prompt: "Zen master"
  }
];

async function generateAllNames() {
  console.log('🚀 Starting name generation for', featuredAvatars.length, 'avatars\n');
  
  const results = [];
  
  for (const avatar of featuredAvatars) {
    try {
      console.log(`\n📸 Processing: ${avatar.name}`);
      console.log(`   URL: ${avatar.image_url.substring(0, 80)}...`);
      
      const nameData = await generateAvatarName(avatar.image_url, avatar.prompt);
      
      const fullName = `${nameData.name}: ${nameData.expansion}`;
      console.log(`✅ Generated: ${fullName}`);
      
      results.push({
        id: avatar.id,
        oldName: avatar.name,
        newName: fullName,
        acronym: nameData.name,
        expansion: nameData.expansion
      });
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed for ${avatar.name}:`, error.message);
      results.push({
        id: avatar.id,
        oldName: avatar.name,
        newName: avatar.name, // Keep old name on error
        error: error.message
      });
    }
  }
  
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');
  
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.oldName}`);
    if (result.error) {
      console.log(`   ❌ ERROR: ${result.error}`);
    } else {
      console.log(`   ➡️  ${result.newName}`);
    }
    console.log('');
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('📝 COPY/PASTE FOR best-of-aeaea.html');
  console.log('='.repeat(80) + '\n');
  
  results.forEach(result => {
    if (!result.error) {
      console.log(`// ${result.oldName} ➡️ ${result.newName}`);
      console.log(`name: "${result.newName}",\n`);
    }
  });
  
  return results;
}

// Run the script
generateAllNames().catch(console.error);
