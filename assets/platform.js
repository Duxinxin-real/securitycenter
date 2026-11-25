/* Optional native host contract. A standalone browser never invents permission state. */
(() => {
 const pending=new Map();let serial=0;
 window.securityPlatform={
  available:()=>Boolean(window.webkit?.messageHandlers?.securityBridge),
  request(method,payload={}){return new Promise((resolve,reject)=>{
   const bridge=window.webkit?.messageHandlers?.securityBridge;
   if(!bridge){reject(Error('Available in the iPhone app only.'));return;}
   const id=String(++serial),timer=setTimeout(()=>{pending.delete(id);reject(Error('Could not read device status. Try again.'));},10000);
   pending.set(id,{resolve,reject,timer});bridge.postMessage({id,method,payload});
  });},
  receive({id,result,error}){const p=pending.get(String(id));if(!p)return;clearTimeout(p.timer);pending.delete(String(id));error?p.reject(Error(error)):p.resolve(result);}
 };
})();
