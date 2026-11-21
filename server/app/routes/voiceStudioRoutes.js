export function registerVoiceStudioRoutes(app, { voiceStudio }) {
  const route = (method,path,run) => app[method](`/api/voice-studio${path}`,async(req,res) => {
    res.setHeader('Cache-Control','no-store');
    try { res.json(await run(req.actorContext,req.params,req.body || {},req.query)); }
    catch(error) { res.status(error.statusCode || 500).json({error:{code:error.code || 'voice_request_failed',message:error.statusCode ? error.code : 'Voice request failed.'}}); }
  });
  route('get','/catalog',a=>voiceStudio.catalog(a));
  route('get','/custom-voices',(a,p,b,q)=>voiceStudio.listCustomVoices(a,q));
  route('post','/custom-voices/description-suggestion',(a,p,b)=>voiceStudio.suggestVoiceDescription(a,b));
  route('post','/custom-voices/quotes',(a,p,b)=>voiceStudio.quoteCustomVoice(a,b));
  route('post','/custom-voices',(a,p,b)=>voiceStudio.createCustomVoice(a,b));
  route('patch','/custom-voices/:id',(a,p,b)=>voiceStudio.updateCustomVoice(a,p.id,b));
  route('post','/custom-voices/:id/save',(a,p,b)=>voiceStudio.updateCustomVoice(a,p.id,b,true));
  route('delete','/custom-voices/:id',(a,p,b)=>voiceStudio.deleteCustomVoice(a,p.id,b));
  route('get','/documents',(a,p,b,q)=>voiceStudio.list('documents',a,q));
  route('post','/documents',(a,p,b)=>voiceStudio.createDocument(a,b));
  route('get','/documents/:id',(a,p)=>voiceStudio.getDocument(a,p.id));
  route('patch','/documents/:id',(a,p,b)=>voiceStudio.updateDocument(a,p.id,b));
  route('post','/documents/:id/archive',(a,p,b)=>voiceStudio.archive('documents',a,p.id,b.archived !== false));
  route('get','/characters',(a,p,b,q)=>voiceStudio.list('characters',a,q));
  route('post','/characters',(a,p,b)=>voiceStudio.character(a,b));
  route('patch','/characters/:id',(a,p,b)=>voiceStudio.character(a,b,p.id));
  route('post','/characters/:id/archive',(a,p,b)=>voiceStudio.archive('characters',a,p.id,b.archived !== false));
  route('post','/documents/:id/rows/:rowId/quotes',(a,p,b)=>voiceStudio.quote(a,p.id,p.rowId,b));
  route('post','/documents/:id/rows/:rowId/generations',(a,p,b)=>voiceStudio.generate(a,p.id,p.rowId,b));
  route('get','/generations/:id',(a,p)=>voiceStudio.readGeneration(a,p.id));
  route('get','/documents/:id/rows/:rowId/takes',(a,p)=>voiceStudio.takes(a,p.id,p.rowId));
  route('put','/documents/:id/rows/:rowId/selected-take',(a,p,b)=>voiceStudio.select(a,p.id,p.rowId,b));
  route('post','/takes/:id/save',(a,p,b)=>voiceStudio.updateTake(a,p.id,b,true));
  route('patch','/takes/:id',(a,p,b)=>voiceStudio.updateTake(a,p.id,b));
  route('delete','/takes/:id',(a,p)=>voiceStudio.deleteTake(a,p.id));
  route('get','/audio-library',(a,p,b,q)=>voiceStudio.list('takes',a,q));
}
