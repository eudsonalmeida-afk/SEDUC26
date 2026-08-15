(() => {
  const installBtn=document.getElementById("installBtn");
  const dialog=document.getElementById("installDialog");
  const action=document.getElementById("installAction");
  const help=document.getElementById("installHelp");
  const title=document.getElementById("installTitle");
  const text=document.getElementById("installText");
  let deferredPrompt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=()=>window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone===true;

  if("serviceWorker" in navigator && (location.protocol==="https:" || ["localhost","127.0.0.1"].includes(location.hostname))){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./service-worker.js").catch(e=>console.warn("SW",e)));
  }

  window.addEventListener("beforeinstallprompt",e=>{
    e.preventDefault(); deferredPrompt=e; installBtn.hidden=false;
  });
  window.addEventListener("appinstalled",()=>{deferredPrompt=null; installBtn.hidden=true; toast("App instalado.");});

  function prepareDialog(){
    action.hidden=true;
    if(standalone()){
      title.textContent="Já está instalado";
      text.textContent="Você já está usando o SEDUC 2026 em modo aplicativo, sem as abas normais do navegador.";
      help.textContent="";
      return;
    }
    if(location.protocol==="file:"){
      title.textContent="Publique primeiro no GitHub Pages";
      text.textContent="Abrir o index.html como arquivo funciona para visualizar, mas instalação PWA e sincronização completa precisam de uma página servida por HTTPS.";
      help.textContent="Depois de publicar, abra o endereço do GitHub Pages e instale por lá.";
      return;
    }
    if(deferredPrompt){
      title.textContent="Instalar SEDUC 2026";
      text.textContent="O navegador já reconheceu o app. A instalação abre o plano em uma janela própria e cria um ícone na tela inicial.";
      action.hidden=false; action.textContent="Instalar agora";
      help.textContent="Seu progresso local permanece no aparelho e, com a nuvem conectada, também fica sincronizado.";
    } else if(isIOS){
      title.textContent="Adicionar à Tela de Início no iPhone/iPad";
      text.textContent="No Safari: toque em Compartilhar e escolha “Adicionar à Tela de Início”. Depois abra pelo novo ícone.";
      help.textContent="No iOS, esse é o caminho para iniciar o PWA em tela cheia, sem as abas comuns do Safari.";
    } else {
      title.textContent="Instalar como app";
      text.textContent="Abra o menu do navegador e procure “Instalar app”, “Adicionar à tela inicial” ou opção equivalente.";
      help.textContent="Se a opção ainda não aparecer, recarregue a página depois da primeira visita.";
    }
  }
  installBtn.onclick=()=>{prepareDialog();dialog.showModal();};
  document.getElementById("closeInstallDialog").onclick=()=>dialog.close();
  action.onclick=async()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const result=await deferredPrompt.userChoice;
    if(result.outcome==="accepted"){toast("Instalação iniciada.");dialog.close();}
    deferredPrompt=null;
  };
  if(standalone()) installBtn.hidden=true;
})();
