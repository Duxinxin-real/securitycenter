(() => {
 let libraryPromise;
 function script(path){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=path;el.onload=resolve;el.onerror=()=>reject(Error('Local recognition could not start.'));document.head.append(el);});}
 function library(){
  return libraryPromise??=Promise.all([script('assets/vendor/ocr/tesseract.js'),script('assets/vendor/ocr/resources.js')]).then(()=>{
   if(!window.Tesseract||!window.PrivateOCRResources)throw Error('Local recognition could not start.');
  }).catch(e=>{libraryPromise=null;throw e;});
 }
 let workerPromise,controller;
 window.privateOCR={
  async get(){
   return workerPromise??=(async()=>{
    const current={closed:false};controller=current;await library();if(current.closed)throw Error('Recognition closed.');
    const r=window.PrivateOCRResources;
    const prelude=`const language=${JSON.stringify(r.english)};const realFetch=self.fetch.bind(self);self.fetch=(input, options)=>{if(String(input)==='https://local-ocr.invalid/eng.traineddata.gz'){const b=atob(language),bytes=new Uint8Array(b.length);for(let i=0;i<b.length;i++)bytes[i]=b.charCodeAt(i);return Promise.resolve(new Response(bytes));}if(String(input).startsWith('blob:')||String(input).startsWith('data:'))return realFetch(input,options);return Promise.reject(new Error('Offline OCR'));};\n`;
    const url=URL.createObjectURL(new Blob([prelude,r.worker],{type:'application/javascript'}));
    current.url=url;
    try{
     const worker=await window.Tesseract.createWorker('eng',1,{workerPath:url,workerBlobURL:false,cacheMethod:'none',langPath:'https://local-ocr.invalid'});
     if(current.closed){await worker.terminate();throw Error('Recognition closed.');}current.worker=worker;return worker;
    }finally{URL.revokeObjectURL(url);}
   })().catch(e=>{if(controller?.closed)throw e;workerPromise=null;throw e;});
  },
  stop(){if(!controller)return;const old=controller;old.closed=true;old.worker?.terminate();controller=null;workerPromise=null;}
 };
})();
