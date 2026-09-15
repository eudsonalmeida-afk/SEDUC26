(() => {
  "use strict";

  const CONFIG_KEY="seduc2026_cloud_config_v1";
  const LAST_SYNC_KEY="seduc2026_cloud_last_sync_v1";
  const AUTH_KEY="seduc2026_rest_auth_v2";
  const BANK_IMAGE_SYNC_META="seduc2026_bank_image_sync_v1";

  const cloudDialog=document.getElementById("cloudDialog");
  const cloudBtn=document.getElementById("cloudBtn");
  const stateBox=document.getElementById("cloudStateBox");
  const statusText=document.getElementById("cloudStatusText");
  const userText=document.getElementById("cloudUserText");

  let currentSession=null;
  let syncTimer=null;
  let reconciling=false;
  let suppressSync=false;

  function meaningful(s){
    if(!s)return false;
    return Object.keys(s.sessions||{}).length>0 ||
      (s.fragilities||[]).length>0 ||
      Object.keys(s.simulations||{}).length>0 ||
      (s.questionBank||[]).length>0 ||
      (s.bankAttempts||[]).length>0;
  }

  state.meta ||= {};
  if(!state.meta.updatedAt){
    state.meta.updatedAt=meaningful(state)?new Date().toISOString():"1970-01-01T00:00:00.000Z";
    try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch{}
  }

  const originalSave=save;
  save=function(){
    state.meta ||= {};
    state.meta.updatedAt=new Date().toISOString();
    const ok=originalSave();
    if(!suppressSync)queueSync();
    return ok;
  };

  function bundledConfig(){
    const x=window.SEDUC_CLOUD_CONFIG||{};
    return {
      url:String(x.supabaseUrl||"").trim().replace(/\/$/,""),
      key:String(x.supabaseAnonKey||"").trim()
    };
  }
  function localConfig(){
    try{return JSON.parse(localStorage.getItem(CONFIG_KEY)||"{}")}catch{return{}}
  }
  function validConfig(c){
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(c?.url||"").replace(/\/$/,"")) && !!String(c?.key||"").trim();
  }
  function getConfig(){
    // SEDUC2026 pessoal: a configuração embutida é a fonte principal.
    // Isso impede um valor antigo salvo no navegador de quebrar o login.
    const bundled=bundledConfig();
    if(validConfig(bundled))return bundled;
    const local=localConfig();
    return {url:String(local.url||"").trim().replace(/\/$/,""),key:String(local.key||"").trim()};
  }
  function clearStaleLocalConfig(){
    const bundled=bundledConfig(),local=localConfig();
    if(validConfig(bundled) && (local.url||local.key)){
      const norm=x=>String(x||"").trim().replace(/\/$/,"");
      if(norm(local.url)!==norm(bundled.url) || norm(local.key)!==norm(bundled.key)){
        localStorage.removeItem(CONFIG_KEY);
      }
    }
  }
  function configured(){return validConfig(getConfig())}

  function authLoad(){
    try{return JSON.parse(localStorage.getItem(AUTH_KEY)||"null")}catch{return null}
  }
  function authSave(session){
    currentSession=session||null;
    if(session)localStorage.setItem(AUTH_KEY,JSON.stringify(session));
    else localStorage.removeItem(AUTH_KEY);
  }
  function currentUser(){return currentSession?.user||null}
  function accessToken(){return currentSession?.access_token||""}

  function setCloudState(kind,title,subtitle){
    if(cloudBtn){cloudBtn.dataset.cloud=kind;cloudBtn.title=`${title}${subtitle?" — "+subtitle:""}`;}
    if(stateBox)stateBox.dataset.state=kind;
    if(statusText)statusText.textContent=title;
    if(userText)userText.textContent=subtitle||"";
  }
  function fillConfigFields(){
    const c=getConfig();
    const u=document.getElementById("cloudUrl"),k=document.getElementById("cloudKey");
    if(u)u.value=c.url;
    if(k)k.value=c.key;
    const details=document.getElementById("cloudConfigDetails");
    if(details && validConfig(bundledConfig()))details.open=false;
  }
  function showAuthUI(){
    const logged=!!currentUser();
    const login=document.getElementById("cloudLogin"),signup=document.getElementById("cloudSignup"),logout=document.getElementById("cloudLogout");
    const email=document.getElementById("cloudEmail"),password=document.getElementById("cloudPassword");
    if(login)login.hidden=logged;
    if(signup)signup.hidden=logged;
    if(logout)logout.hidden=!logged;
    if(email){
      email.disabled=logged;
      if(logged)email.value=currentUser().email||"";
    }
    if(password)password.disabled=logged;
  }

  function parseXHR(x){
    if(!x.responseText)return null;
    try{return JSON.parse(x.responseText)}catch{return x.responseText}
  }
  function xhr(method,url,body,{auth=true,headers={}}={}){
    return new Promise((resolve,reject)=>{
      const c=getConfig();
      const x=new XMLHttpRequest();
      x.open(method,url,true);
      x.timeout=20000;
      x.setRequestHeader("apikey",c.key);
      x.setRequestHeader("Content-Type","application/json");
      if(auth && accessToken())x.setRequestHeader("Authorization","Bearer "+accessToken());
      Object.entries(headers||{}).forEach(([k,v])=>x.setRequestHeader(k,v));
      x.onreadystatechange=()=>{
        if(x.readyState!==4)return;
        const data=parseXHR(x);
        if(x.status>=200 && x.status<300)resolve({data,status:x.status,xhr:x});
        else{
          const msg=(data&&data.message)||(data&&data.msg)||(data&&data.error_description)||(data&&data.error)||`HTTP ${x.status}`;
          const err=new Error(msg);
          err.status=x.status;
          err.payload=data;
          reject(err);
        }
      };
      x.onerror=()=>reject(Object.assign(new Error("Falha de rede ao acessar o Supabase."),{status:0}));
      x.ontimeout=()=>reject(Object.assign(new Error("Tempo esgotado ao acessar o Supabase."),{status:0}));
      x.send(body===undefined||body===null?null:JSON.stringify(body));
    });
  }

  async function refreshSession(){
    if(!currentSession?.refresh_token)return false;
    const c=getConfig();
    try{
      const {data}=await xhr("POST",`${c.url}/auth/v1/token?grant_type=refresh_token`,{
        refresh_token:currentSession.refresh_token
      },{auth:false});
      if(!data?.access_token)return false;
      data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);
      authSave(data);
      showAuthUI();
      return true;
    }catch(e){
      console.warn("Refresh falhou",e);
      return false;
    }
  }

  async function ensureFreshSession(){
    if(!currentSession)return false;
    const exp=Number(currentSession.expires_at||0)*1000;
    if(exp && Date.now()<exp-60000)return true;
    return await refreshSession();
  }

  async function request(method,url,body,opts={}){
    if(opts.auth!==false)await ensureFreshSession();
    try{
      return await xhr(method,url,body,opts);
    }catch(e){
      if(opts.auth!==false && e.status===401 && currentSession?.refresh_token){
        const ok=await refreshSession();
        if(ok)return await xhr(method,url,body,opts);
      }
      throw e;
    }
  }

  async function login(email,password){
    const c=getConfig();
    const {data}=await xhr("POST",`${c.url}/auth/v1/token?grant_type=password`,{email,password},{auth:false});
    if(!data?.access_token)throw new Error("O Supabase não retornou uma sessão válida.");
    data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);
    authSave(data);
    showAuthUI();
    return data;
  }
  async function signup(email,password){
    const c=getConfig();
    const {data}=await xhr("POST",`${c.url}/auth/v1/signup`,{email,password},{auth:false});
    if(data?.access_token){
      data.expires_at=Math.floor(Date.now()/1000)+Number(data.expires_in||3600);
      authSave(data);
      showAuthUI();
    }
    return data;
  }

  function queueSync(){
    if(!currentUser())return;
    clearTimeout(syncTimer);
    syncTimer=setTimeout(()=>pushCloud(),850);
  }

  async function pushCloud(){
    const u=currentUser();
    if(!u)return false;
    if(navigator.onLine===false){
      setCloudState("offline","Alterações salvas no aparelho","Aguardando internet.");
      return false;
    }
    setCloudState("syncing","Sincronizando…",u.email||"");
    try{
      const c=getConfig();
      const payload=JSON.parse(JSON.stringify(state));
      (payload.questionBank||[]).forEach(q=>delete q.imageData);
      payload.meta ||= {};
      payload.meta.updatedAt ||= new Date().toISOString();

      await request(
        "POST",
        `${c.url}/rest/v1/study_state?on_conflict=user_id`,
        {user_id:u.id,payload,updated_at:payload.meta.updatedAt},
        {headers:{Prefer:"resolution=merge-duplicates,return=minimal"}}
      );

      localStorage.setItem(LAST_SYNC_KEY,new Date().toISOString());
      setCloudState("synced","Sincronizado",`${u.email||"Conta"} • ${new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}`);
      try{await syncBankImages(false)}catch(e){console.warn("Imagens: sync adiado",e)}
      return true;
    }catch(e){
      console.error(e);
      setCloudState("error","Falha ao sincronizar",friendlyError(e));
      return false;
    }
  }

  async function readCloud(){
    const u=currentUser();
    if(!u)return null;
    const c=getConfig();
    const {data}=await request(
      "GET",
      `${c.url}/rest/v1/study_state?select=payload,updated_at&user_id=eq.${encodeURIComponent(u.id)}&limit=1`,
      null
    );
    return Array.isArray(data)&&data.length?data[0]:null;
  }

  async function replaceLocal(next){
    suppressSync=true;
    state=next||{};
    state.sessions ||= {};
    state.fragilities ||= [];
    state.simulations ||= {};
    state.questionBank ||= [];
    state.bankAttempts ||= [];
    state.meta ||= {};
    await ingestLegacyEmbeddedImages(state);
    (state.questionBank||[]).forEach(q=>delete q.imageData);
    try{localStorage.setItem(STATE_KEY,JSON.stringify(state))}catch(e){console.error("Falha ao substituir estado",e)}
    renderAll();
    suppressSync=false;
  }

  async function reconcile(){
    if(reconciling||!currentUser()||navigator.onLine===false)return;
    reconciling=true;
    try{
      const remote=await readCloud();
      if(!remote){
        await pushCloud();
        return;
      }
      const cloudState=remote.payload||{};
      const localHas=meaningful(state),cloudHas=meaningful(cloudState);
      const localT=Date.parse(state.meta?.updatedAt||0)||0;
      const cloudT=Date.parse(cloudState.meta?.updatedAt||remote.updated_at||0)||0;
      if(cloudHas&&(!localHas||cloudT>localT+500)){
        await replaceLocal(cloudState);
        setCloudState("synced","Dados baixados da nuvem",currentUser().email||"");
      }else if(localHas&&(!cloudHas||localT>cloudT+500)){
        await pushCloud();
      }else{
        setCloudState("synced","Sincronizado",currentUser().email||"");
      }
      try{await downloadMissingBankImages()}catch(e){console.warn("Imagens: download adiado",e)}
    }catch(e){
      console.error(e);
      setCloudState("error","Falha ao ler a nuvem",friendlyError(e));
    }finally{
      reconciling=false;
    }
  }

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
        if(f){q.imageId=await saveBankImageBlob(f,q.imageId||null);n++;}
      }catch(e){console.warn("Imagem antiga não recuperada",e)}
    }
    return n;
  }

  async function imageTableAvailable(){
    if(!currentUser())return false;
    const c=getConfig();
    try{
      await request("GET",`${c.url}/rest/v1/question_images?select=question_id&limit=1`,null);
      return true;
    }catch(e){
      if(e.status===404 || /relation|schema cache|question_images/i.test(e.message||""))return false;
      throw e;
    }
  }

  async function syncBankImages(force=false){
    const u=currentUser();
    if(!u||navigator.onLine===false)return {ok:false,message:"Sem conexão com a nuvem.",uploaded:0};
    let available=false;
    try{available=await imageTableAvailable()}catch(e){return {ok:false,message:friendlyError(e),uploaded:0}}
    if(!available)return {ok:false,message:"A tabela question_images ainda não foi criada no Supabase.",uploaded:0};

    const c=getConfig(),meta=loadImageSyncMeta();
    let uploaded=0;
    for(const q of (state.questionBank||[])){
      if(!q.imageId)continue;
      try{
        const rec=await getBankImageRecord(q.imageId);
        if(!rec?.blob)continue;
        const stamp=rec.updated||"";
        if(!force && meta[q.id]===stamp)continue;
        const imageData=await imageBlobToSyncedDataURL(rec.blob);
        await request(
          "POST",
          `${c.url}/rest/v1/question_images?on_conflict=user_id,question_id`,
          {
            user_id:u.id,
            question_id:q.id,
            file_name:rec.name||q.imageFile||"imagem",
            mime_type:rec.type||rec.blob.type||"image/png",
            image_data:imageData,
            updated_at:new Date().toISOString()
          },
          {headers:{Prefer:"resolution=merge-duplicates,return=minimal"}}
        );
        meta[q.id]=stamp;
        uploaded++;
      }catch(e){console.warn("Falha ao enviar imagem",q.id,e)}
    }
    saveImageSyncMeta(meta);
    return {ok:true,uploaded};
  }

  async function fetchCloudBankImage(q){
    const u=currentUser();
    if(!u||navigator.onLine===false||!q?.id)return null;
    let available=false;
    try{available=await imageTableAvailable()}catch{return null}
    if(!available)return null;

    const c=getConfig();
    try{
      const {data}=await request(
        "GET",
        `${c.url}/rest/v1/question_images?select=image_data,file_name,mime_type,updated_at&user_id=eq.${encodeURIComponent(u.id)}&question_id=eq.${encodeURIComponent(q.id)}&limit=1`,
        null
      );
      const row=Array.isArray(data)&&data.length?data[0]:null;
      if(!row?.image_data)return null;

      const f=dataUrlToFile(row.image_data,row.file_name||q.imageFile||"imagem",row.mime_type||"image/png");
      if(!f)return row.image_data;
      q.imageId=await saveBankImageBlob(f,q.imageId||null);
      originalSave();
      const rec=await getBankImageRecord(q.imageId);
      if(rec?.blob){
        const url=URL.createObjectURL(rec.blob);
        bankObjectUrls.set(q.imageId,url);
        return url;
      }
      return row.image_data;
    }catch(e){
      console.warn("Falha ao baixar imagem",e);
      return null;
    }
  }

  async function downloadMissingBankImages(){
    if(!currentUser()||navigator.onLine===false)return;
    for(const q of (state.questionBank||[])){
      if(!(q.imageId||q.imageFile))continue;
      let hasLocal=false;
      try{hasLocal=!!(q.imageId&&await getBankImageRecord(q.imageId))}catch{}
      if(!hasLocal)await fetchCloudBankImage(q);
    }
    try{renderBank()}catch{}
  }

  async function deleteCloudBankImage(questionId){
    const u=currentUser();
    if(!u||!questionId)return;
    const c=getConfig();
    try{
      await request(
        "DELETE",
        `${c.url}/rest/v1/question_images?user_id=eq.${encodeURIComponent(u.id)}&question_id=eq.${encodeURIComponent(questionId)}`,
        null,
        {headers:{Prefer:"return=minimal"}}
      );
    }catch{}
  }

  window.syncBankImagesNow=syncBankImages;
  window.fetchCloudBankImage=fetchCloudBankImage;
  window.deleteCloudBankImage=deleteCloudBankImage;

  function friendlyError(e){
    const m=e?.message||String(e||"Erro desconhecido");
    if(e?.status===401)return "Sessão recusada pelo Supabase. Tente entrar novamente; se persistir, pode ser instabilidade temporária de autenticação.";
    if(e?.status===403)return "Acesso recusado pelas regras do Supabase (RLS).";
    if(/study_state|relation|permission|row-level|policy|schema cache/i.test(m))
      return "Banco ainda não preparado ou RLS incorreta. Confira o SQL de configuração do Supabase.";
    if(/rede|network|fetch|tempo esgotado/i.test(m))
      return "Não foi possível alcançar o Supabase. O app continua salvando os dados neste aparelho.";
    return m;
  }

  async function forcePull(){
    if(!currentUser()){toast("Entre na nuvem primeiro.");return}
    try{
      const remote=await readCloud();
      if(!remote?.payload){toast("Ainda não há dados na nuvem.");return}
      if(meaningful(state)&&!confirm("Substituir os dados deste aparelho pela versão da nuvem?"))return;
      await replaceLocal(remote.payload);
      toast("Versão da nuvem carregada.");
      setCloudState("synced","Dados baixados da nuvem",currentUser().email||"");
    }catch(e){toast(friendlyError(e))}
  }

  clearStaleLocalConfig();
  fillConfigFields();
  currentSession=authLoad();
  showAuthUI();

  if(currentUser()){
    setCloudState(navigator.onLine?"syncing":"offline",navigator.onLine?"Conectado • verificando":"Conectado • offline",currentUser().email||"");
    if(navigator.onLine)reconcile();
  }else if(configured()){
    setCloudState("local","Nuvem pronta","Entre para sincronizar seu progresso.");
  }else{
    setCloudState("local","Modo local","Configure o Supabase.");
  }

  if(cloudBtn)cloudBtn.onclick=()=>{
    fillConfigFields();
    if(cloudDialog?.showModal)cloudDialog.showModal();else cloudDialog?.setAttribute("open","");
  };
  document.getElementById("closeCloudDialog").onclick=()=>{
    if(cloudDialog?.close)cloudDialog.close();else cloudDialog?.removeAttribute("open");
  };

  document.getElementById("cloudSaveConfig").onclick=()=>{
    const bundled=bundledConfig();
    if(validConfig(bundled)){
      localStorage.removeItem(CONFIG_KEY);
      fillConfigFields();
      toast("Configuração padrão do SEDUC2026 restaurada.");
      return;
    }
    const url=document.getElementById("cloudUrl").value.trim().replace(/\/$/,"");
    const key=document.getElementById("cloudKey").value.trim();
    localStorage.setItem(CONFIG_KEY,JSON.stringify({url,key}));
    toast("Configuração salva. Recarregando…");
    setTimeout(()=>location.reload(),500);
  };

  document.getElementById("cloudLogin").onclick=async()=>{
    const email=document.getElementById("cloudEmail").value.trim();
    const password=document.getElementById("cloudPassword").value;
    if(!configured()){toast("Configuração da nuvem inválida.");return}
    if(!email||!password){toast("Informe e-mail e senha.");return}
    setCloudState("syncing","Entrando…",email);
    try{
      await login(email,password);
      setCloudState("syncing","Conectado • sincronizando",email);
      toast("Login realizado.");
      await reconcile();
    }catch(e){
      setCloudState("error","Falha no login",friendlyError(e));
      toast(friendlyError(e));
    }
  };

  document.getElementById("cloudSignup").onclick=async()=>{
    const email=document.getElementById("cloudEmail").value.trim();
    const password=document.getElementById("cloudPassword").value;
    if(!email||password.length<6){toast("Use e-mail válido e senha com pelo menos 6 caracteres.");return}
    try{
      const data=await signup(email,password);
      if(data?.access_token){
        toast("Conta criada e conectada.");
        await reconcile();
      }else{
        toast("Conta criada. Confirme o e-mail, se solicitado.");
      }
    }catch(e){toast(friendlyError(e))}
  };

  document.getElementById("cloudLogout").onclick=()=>{
    authSave(null);
    showAuthUI();
    setCloudState("local","Nuvem pronta","Sessão encerrada.");
    toast("Você saiu da nuvem.");
  };
  document.getElementById("cloudSyncNow").onclick=async()=>{
    const ok=await pushCloud();
    if(ok)toast("Sincronizado.");
  };
  document.getElementById("cloudPull").onclick=forcePull;

  window.addEventListener("online",()=>{
    if(currentUser()){
      setCloudState("syncing","Internet voltou • sincronizando",currentUser().email||"");
      reconcile();
    }
  });
  window.addEventListener("offline",()=>{
    if(currentUser())setCloudState("offline","Offline","Alterações ficam salvas neste aparelho.");
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"&&currentUser()&&navigator.onLine)reconcile();
  });
})();
