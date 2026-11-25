(() => {
 let promise,hosts;
 function load(){return promise??=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='assets/reputation/domains.js';s.onload=()=>{const snapshot=window.reputationSnapshot;if(!snapshot?.domains)return reject(Error('Reputation data unavailable'));hosts=new Set(snapshot.domains.split('\n'));delete snapshot.domains;resolve(snapshot);};s.onerror=()=>reject(Error('Reputation data unavailable'));document.head.append(s);}).catch(e=>{promise=null;throw e;});}
 window.checkLocalReputation=async url=>{const source=await load();return {...source,listed:hosts.has(url.hostname.toLowerCase().replace(/\.$/,'')),stale:Date.now()-Date.parse(source.snapshotAt)>48*3600000};};
})();
