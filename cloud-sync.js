(() => {
  const CONFIG_KEY = "seduc2026_cloud_config_v1";
  const LAST_SYNC_KEY = "seduc2026_cloud_last_sync_v1";
  const cloudDialog = document.getElementById("cloudDialog");
  const cloudBtn = document.getElementById("cloudBtn");
  const stateBox = document.getElementById("cloudStateBox");
  const statusText = document.getElementById("cloudStatusText");
  const userText = document.getElementById("cloudUserText");
  let client = null;
  let currentUser = null;
  let syncTimer = null;
  let reconciling = false;
  let suppressSync = false;

  function meaningful(s){
    if(!s) return false;
    return Object.keys(s.sessions||{}).length>0 || (s.fragilities||[]).length>0 || Object.keys(s.simulations||{}).length>0 || (s.questionBank||[]).length>0 || (s.bankAttempts||[]).length>0;
  }
  state.meta ||= {};
  if(!state.meta.updatedAt){
    state.meta.updatedAt = meaningful(state) ? new Date().toISOString() : "1970-01-01T00:00:00.000Z";
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  }

  const originalSave = save;
  save = function(){
    state.meta ||= {};
    state.meta.updatedAt = new Date().toISOString();
    const ok=originalSave();
    if(!suppressSync) queueSync();
    return ok;
  };

  function bundledConfig(){
    const x = window.SEDUC_CLOUD_CONFIG || {};
    return {url:(x.supabaseUrl||"").trim(), key:(x.supabaseAnonKey||"").trim()};
  }
  function localConfig(){
    try { return JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}"); } catch { return {}; }
  }
  function getConfig(){
    const local = localConfig(), bundled = bundledConfig();
    return {url:(local.url||bundled.url||"").trim(), key:(local.key||bundled.key||"").trim()};
  }
  function configured(){ const c=getConfig(); return /^https:\/\//.test(c.url) && !!c.key; }
  function setCloudState(kind, title, subtitle){
    cloudBtn.dataset.cloud = kind;
    stateBox.dataset.state = kind;
    statusText.textContent = title;
    userText.textContent = subtitle || "";
    cloudBtn.title = `${title}${subtitle?" — "+subtitle:""}`;
  }
  function fillConfigFields(){
    const c=getConfig();
    document.getElementById("cloudUrl").value=c.url;
    document.getElementById("cloudKey").value=c.key;
    const bundled=bundledConfig();
    if(bundled.url && bundled.key) document.getElementById("cloudConfigDetails").open=false;
  }
  function showAuthUI(session){
    const logged=!!session?.user;
    document.getElementById("cloudLogin").hidden=logged;
    document.getElementById("cloudSignup").hidden=logged;
    document.getElementById("cloudLogout").hidden=!logged;
    document.getElementById("cloudEmail").disabled=logged;
    document.getElementById("cloudPassword").disabled=logged;
    if(logged) document.getElementById("cloudEmail").value=session.user.email||"";
  }
  async function initClient(){
    fillConfigFields();
    if(!configured()){
      setCloudState("local","Modo local","Configure o Supabase para sincronizar entre aparelhos.");
      showAuthUI(null);
      return;
    }
    if(!window.supabase?.createClient){
      setCloudState(navigator.onLine?"error":"offline", navigator.onLine?"Nuvem indisponível":"Offline", "A biblioteca de sincronização não foi carregada. O app local continua funcionando.");
      return;
    }
    const c=getConfig();
    client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    const {data,error}=await client.auth.getSession();
    if(error){ setCloudState("error","Erro de sessão",error.message); return; }
    currentUser=data.session?.user||null;
    showAuthUI(data.session);
    if(currentUser){
      setCloudState(navigator.onLine?"syncing":"offline", navigator.onLine?"Conectado • verificando":"Conectado • offline", currentUser.email||"");
      if(navigator.onLine) await reconcile();
    } else {
      setCloudState("local","Nuvem pronta","Entre para sincronizar seu progresso.");
    }
    client.auth.onAuthStateChange((event,session)=>{
      setTimeout(async()=>{
        currentUser=session?.user||null; showAuthUI(session);
        if(currentUser){ setCloudState("syncing","Conectado • sincronizando",currentUser.email||""); if(navigator.onLine) await reconcile(); }
        else setCloudState("local","Nuvem pronta","Entre para sincronizar seu progresso.");
      },0);
    });
  }
  function queueSync(){
    if(!client||!currentUser) return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>pushCloud(),800);
  }
  async function pushCloud(){
    if(!client||!currentUser) return false;
    if(!navigator.onLine){ setCloudState("offline","Alterações salvas no aparelho","Aguardando internet para sincronizar."); return false; }
    setCloudState("syncing","Sincronizando…",currentUser.email||"");
    try{
      const payload=JSON.parse(JSON.stringify(state));
      (payload.questionBank||[]).forEach(q=>{delete q.imageData});
      payload.meta ||= {}; payload.meta.updatedAt ||= new Date().toISOString();
      const {error}=await client.from("study_state").upsert({user_id:currentUser.id,payload,updated_at:payload.meta.updatedAt},{onConflict:"user_id"});
      if(error) throw error;
      localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());
      setCloudState("synced","Sincronizado",`${currentUser.email||"Conta"} • ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`);
      // Imagens são sincronizadas à parte; falha nelas nunca bloqueia cronograma/blocos.
      try{await syncBankImages(false)}catch(e){console.warn("Sync de imagens adiado",e)}
      return true;
    }catch(e){
      console.error(e);
      setCloudState("error","Falha ao sincronizar",friendlyError(e));
      return false;
    }
  }
  async function readCloud(){
    if(!client||!currentUser) return null;
    const {data,error}=await client.from("study_state").select("payload,updated_at").eq("user_id",currentUser.id).maybeSingle();
    if(error) throw error;
    return data;
  }
  async function reconcile(){
    if(reconciling||!client||!currentUser||!navigator.onLine) return;
    reconciling=true;
    try{
      const remote=await readCloud();
      if(!remote){ await pushCloud(); return; }
      const cloudState=remote.payload||{};
      const localHas=meaningful(state), cloudHas=meaningful(cloudState);
      const localT=Date.parse(state.meta?.updatedAt||0)||0;
      const cloudT=Date.parse(cloudState.meta?.updatedAt||remote.updated_at||0)||0;
      if(cloudHas && (!localHas || cloudT>localT+500)){
        await replaceLocal(cloudState);
        setCloudState("synced","Dados baixados da nuvem",currentUser.email||"");
      } else if(localHas && (!cloudHas || localT>cloudT+500)){
        await pushCloud();
      } else {
        setCloudState("synced","Sincronizado",currentUser.email||"");
      }
      try{await downloadMissingBankImages()}catch(e){console.warn("Download de imagens adiado",e)}
    }catch(e){ console.error(e); setCloudState("error","Falha ao ler a nuvem",friendlyError(e)); }
    finally{ reconciling=false; }
  }
  async function replaceLocal(next){
    suppressSync=true;
    state=next||{};
    state.sessions ||= {}; state.fragilities ||= []; state.simulations ||= {}; state.questionBank ||= []; state.bankAttempts ||= []; state.meta ||= {};
    // Se a nuvem ainda contém imageData de V22/V23, recupera a imagem no IndexedDB antes de limpar.
    await ingestLegacyEmbeddedImages(state);
    (state.questionBank||[]).forEach(q=>{delete q.imageData});
    try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}
    catch(e){console.error("Falha ao substituir estado local",e)}
    renderAll();
    suppressSync=false;
  }

  const BANK_IMAGE_SYNC_META="seduc2026_bank_image_sync_v1";

  function loadImageSyncMeta(){
    try{return JSON.parse(localStorage.getItem(BANK_IMAGE_SYNC_META)||"{}")}catch{return{}}
  }
  function saveImageSyncMeta(meta){
    try{localStorage.setItem(BANK_IMAGE_SYNC_META,JSON.stringify(meta))}catch{}
  }
  function dataUrlToFile(dataUrl,name,mimeFallback="image/png"){
    const parts=String(dataUrl||"").split(",");
    if(parts.length<2)return null;
    const mime=(parts[0].match(/data:([^;]+)/)||[])[1]||mimeFallback;
    const raw=atob(parts[1]);
    const bytes=new Uint8Array(raw.length);
    for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    const blob=new Blob([bytes],{type:mime});
    return new File([blob],name||"imagem",{type:mime});
  }
  async function ingestLegacyEmbeddedImages(target){
    if(typeof saveBankImageBlob!=="function")return 0;
    let n=0;
    for(const q of (target?.questionBank||[])){
      if(!q.imageData)continue;
      try{
        const f=dataUrlToFile(q.imageData,q.imageFile||"imagem.png");
        if(f){
          q.imageId=await saveBankImageBlob(f,q.imageId||null);
          n++;
        }
      }catch(e){console.warn("Falha ao recuperar imagem incorporada",e)}
    }
    return n;
  }

  async function imageTableAvailable(){
    if(!client||!currentUser)return false;
    const {error}=await client.from("question_images").select("question_id").limit(1);
    if(error){
      if(/relation|schema cache|question_images/i.test(error.message||""))return false;
      throw error;
    }
    return true;
  }

  async function syncBankImages(force=false){
    if(!client||!currentUser||!navigator.onLine)return {ok:false,message:"Sem conexão com a nuvem.",uploaded:0};
    let available=false;
    try{available=await imageTableAvailable()}catch(e){return {ok:false,message:friendlyError(e),uploaded:0}}
    if(!available)return {ok:false,message:"A tabela question_images ainda não foi criada no Supabase.",uploaded:0};

    const meta=loadImageSyncMeta();
    let uploaded=0;
    for(const q of (state.questionBank||[])){
      if(!q.imageId)continue;
      try{
        const rec=await getBankImageRecord(q.imageId);
        if(!rec?.blob)continue;
        const stamp=rec.updated||"";
        if(!force && meta[q.id]===stamp)continue;
        const imageData=await imageBlobToSyncedDataURL(rec.blob);
        const row={
          user_id:currentUser.id,
          question_id:q.id,
          file_name:rec.name||q.imageFile||"imagem",
          mime_type:rec.type||rec.blob.type||"image/png",
          image_data:imageData,
          updated_at:new Date().toISOString()
        };
        const {error}=await client.from("question_images").upsert(row,{onConflict:"user_id,question_id"});
        if(error)throw error;
        meta[q.id]=stamp;uploaded++;
      }catch(e){console.warn("Falha ao enviar imagem",q.id,e)}
    }
    saveImageSyncMeta(meta);
    return {ok:true,uploaded};
  }

  async function fetchCloudBankImage(q){
    if(!client||!currentUser||!navigator.onLine||!q?.id)return null;
    let available=false;
    try{available=await imageTableAvailable()}catch{return null}
    if(!available)return null;
    const {data,error}=await client.from("question_images")
      .select("image_data,file_name,mime_type,updated_at")
      .eq("user_id",currentUser.id).eq("question_id",q.id).maybeSingle();
    if(error||!data?.image_data)return null;
    try{
      const f=dataUrlToFile(data.image_data,data.file_name||q.imageFile||"imagem",data.mime_type||"image/png");
      if(!f)return data.image_data;
      q.imageId=await saveBankImageBlob(f,q.imageId||null);
      // Persistir só o ID pequeno, nunca a imagem.
      originalSave();
      const rec=await getBankImageRecord(q.imageId);
      if(rec?.blob){
        const url=URL.createObjectURL(rec.blob);
        bankObjectUrls.set(q.imageId,url);
        return url;
      }
      return data.image_data;
    }catch(e){console.warn("Falha ao baixar imagem",e);return data.image_data}
  }

  async function downloadMissingBankImages(){
    if(!client||!currentUser||!navigator.onLine)return;
    for(const q of (state.questionBank||[])){
      if(!(q.imageId||q.imageFile))continue;
      let hasLocal=false;
      try{hasLocal=!!(q.imageId && await getBankImageRecord(q.imageId))}catch{}
      if(!hasLocal)await fetchCloudBankImage(q);
    }
    try{renderBank()}catch{}
  }

  async function deleteCloudBankImage(questionId){
    if(!client||!currentUser||!questionId)return;
    try{await client.from("question_images").delete().eq("user_id",currentUser.id).eq("question_id",questionId)}catch{}
  }

  window.syncBankImagesNow=syncBankImages;
  window.fetchCloudBankImage=fetchCloudBankImage;
  window.deleteCloudBankImage=deleteCloudBankImage;

  function friendlyError(e){
    const m=e?.message||String(e||"Erro desconhecido");
    if(/study_state|relation|permission|row-level|policy|schema cache/i.test(m)) return "Banco ainda não preparado ou RLS incorreta. Execute supabase-setup.sql no projeto.";
    if(/fetch|network/i.test(m)) return "Sem conexão com o Supabase. Seus dados continuam salvos neste aparelho.";
    return m;
  }
  async function forcePull(){
    if(!client||!currentUser){ toast("Entre na nuvem primeiro."); return; }
    try{
      const remote=await readCloud();
      if(!remote?.payload){toast("Ainda não há dados na nuvem.");return;}
      if(meaningful(state) && !confirm("Substituir os dados deste aparelho pela versão da nuvem?")) return;
      await replaceLocal(remote.payload); toast("Versão da nuvem carregada."); setCloudState("synced","Dados baixados da nuvem",currentUser.email||"");
    }catch(e){toast(friendlyError(e));}
  }

  cloudBtn.onclick=()=>{ fillConfigFields(); cloudDialog.showModal(); };
  document.getElementById("closeCloudDialog").onclick=()=>cloudDialog.close();
  document.getElementById("cloudSaveConfig").onclick=()=>{
    const url=document.getElementById("cloudUrl").value.trim();
    const key=document.getElementById("cloudKey").value.trim();
    localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key}));
    toast("Configuração salva. Recarregando…"); setTimeout(()=>location.reload(),500);
  };
  document.getElementById("cloudLogin").onclick=async()=>{
    if(!client){toast("Configure o Supabase primeiro.");document.getElementById("cloudConfigDetails").open=true;return;}
    const email=document.getElementById("cloudEmail").value.trim(), password=document.getElementById("cloudPassword").value;
    if(!email||!password){toast("Informe e-mail e senha.");return;}
    setCloudState("syncing","Entrando…",email);
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error){setCloudState("error","Falha no login",error.message);toast(error.message);}
    else toast("Login realizado.");
  };
  document.getElementById("cloudSignup").onclick=async()=>{
    if(!client){toast("Configure o Supabase primeiro.");document.getElementById("cloudConfigDetails").open=true;return;}
    const email=document.getElementById("cloudEmail").value.trim(), password=document.getElementById("cloudPassword").value;
    if(!email||password.length<6){toast("Use um e-mail válido e senha com pelo menos 6 caracteres.");return;}
    const {data,error}=await client.auth.signUp({email,password});
    if(error){toast(error.message);return;}
    if(data.session) toast("Conta criada e conectada.");
    else toast("Conta criada. Confirme o e-mail, se o projeto exigir confirmação.");
  };
  document.getElementById("cloudLogout").onclick=async()=>{if(client){await client.auth.signOut();currentUser=null;toast("Você saiu da nuvem.");}};
  document.getElementById("cloudSyncNow").onclick=async()=>{const ok=await pushCloud();if(ok)toast("Sincronizado.");};
  document.getElementById("cloudPull").onclick=forcePull;

  window.addEventListener("online",()=>{ if(currentUser){setCloudState("syncing","Internet voltou • sincronizando",currentUser.email||"");reconcile();} });
  window.addEventListener("offline",()=>{ if(currentUser)setCloudState("offline","Offline","Alterações ficam salvas neste aparelho e serão enviadas depois."); });
  document.addEventListener("visibilitychange",()=>{ if(document.visibilityState==="visible"&&currentUser&&navigator.onLine) reconcile(); });

  initClient();
})();
