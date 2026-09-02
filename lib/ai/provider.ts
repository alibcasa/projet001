export type AiQuestion={question:string;choices:string[];correctIndex:number;explanation:string;sourcePages:number[];difficulty:'easy'|'medium'|'hard'}
export type AiDocumentMetadata={title:string;category?:string;documentType?:string;institution?:string;year?:number|null;language?:string;tags?:string[];confidence?:number}

async function ollama(prompt:string){const base=process.env.OLLAMA_BASE_URL||'http://localhost:11434';const model=process.env.OLLAMA_MODEL||'qwen3:4b';const r=await fetch(`${base}/api/generate`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,prompt,stream:false,format:'json'})});if(!r.ok)throw new Error(`Ollama ${r.status}`);const d=await r.json();return d.response as string}
async function openrouter(prompt:string){const key=process.env.OPENROUTER_API_KEY;if(!key)throw new Error('OPENROUTER_API_KEY absent');const r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENROUTER_MODEL||'qwen/qwen3-30b-a3b:free',messages:[{role:'user',content:prompt}],response_format:{type:'json_object'}})});if(!r.ok)throw new Error(`OpenRouter ${r.status}`);const d=await r.json();return d.choices?.[0]?.message?.content||'{}'}
async function openai(prompt:string){const key=process.env.OPENAI_API_KEY;if(!key)throw new Error('OPENAI_API_KEY absent');const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{authorization:`Bearer ${key}`,'content-type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',messages:[{role:'user',content:prompt}],response_format:{type:'json_object'}})});if(!r.ok)throw new Error(`OpenAI ${r.status}`);const d=await r.json();return d.choices?.[0]?.message?.content||'{}'}

export async function runJsonPrompt(prompt:string){const provider=(process.env.AI_PROVIDER||'ollama').toLowerCase();const raw=provider==='openai'?await openai(prompt):provider==='openrouter'?await openrouter(prompt):await ollama(prompt);return JSON.parse(raw)}

export async function generateQuestions(context:string,count:number,difficulty:string):Promise<AiQuestion[]>{const prompt=`Tu génères un QCM fidèle uniquement au contenu fourni. Retourne du JSON strict: {"questions":[{"question":"...","choices":["A","B","C","D"],"correctIndex":0,"explanation":"...","sourcePages":[1],"difficulty":"medium"}]}. Nombre: ${count}. Difficulté: ${difficulty}. Chaque question doit avoir exactement 4 choix et une seule bonne réponse. CONTENU:\n${context.slice(0,90000)}`;const parsed=await runJsonPrompt(prompt);return Array.isArray(parsed.questions)?parsed.questions.slice(0,count):[]}

export async function extractDocumentMetadata(filename:string,text:string):Promise<AiDocumentMetadata>{
  const prompt=`Tu es documentaliste spécialisé en documents marocains, juridiques, douaniers, administratifs, économiques et de formation. Identifie le VRAI TITRE du document à partir de son contenu, pas à partir du nom de fichier technique. Retourne uniquement du JSON strict sous cette forme: {"title":"Titre propre et fidèle","category":"Douane|Droit|Économie|Gestion|Informatique|Administration publique|Rapports|Formation|Divers","documentType":"Loi|Décret|Circulaire|Code|Note|Rapport|Cours|Guide|Décision|Article|Autre","institution":"...","year":2026,"language":"fr|ar|en|mixte","tags":["..."],"confidence":0.95}. Règles: ne jamais inventer un numéro de loi, une institution ou une année absente du texte; conserver les numéros officiels visibles; titre de 5 à 160 caractères; retirer les extensions .pdf; si le contenu est insuffisant, utiliser un titre prudent et baisser confidence. NOM ORIGINAL: ${filename}\nCONTENU EXTRAIT:\n${text.slice(0,18000)}`
  const parsed=await runJsonPrompt(prompt)
  const title=String(parsed?.title||'').replace(/\.pdf$/i,'').trim().slice(0,180)
  return {
    title,
    category: parsed?.category ? String(parsed.category).trim() : undefined,
    documentType: parsed?.documentType ? String(parsed.documentType).trim() : undefined,
    institution: parsed?.institution ? String(parsed.institution).trim() : undefined,
    year: Number.isFinite(Number(parsed?.year)) ? Number(parsed.year) : null,
    language: parsed?.language ? String(parsed.language).trim() : undefined,
    tags: Array.isArray(parsed?.tags) ? parsed.tags.map((x:any)=>String(x).trim()).filter(Boolean).slice(0,12) : [],
    confidence: Math.max(0,Math.min(1,Number(parsed?.confidence)||0)),
  }
}
