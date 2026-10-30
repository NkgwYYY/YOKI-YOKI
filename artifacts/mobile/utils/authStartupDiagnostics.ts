/** Only enabled in the simulator QA build. Never records account data or tokens. */
const enabled=process.env.EXPO_PUBLIC_AUTH_DIAGNOSTICS==='1';
const events:string[]=[];
const record=(message:string)=>{events.push(message);if(events.length>12)events.shift();};
export const readAuthStartupDiagnostics=()=>enabled?events.join(' | '):'';
if(enabled){
  const original=globalThis.fetch;
  globalThis.fetch=async(input,init)=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    const match=/\/v1\/(environment|client)(?:\?|$)/.exec(url);
    if(!match)return original(input,init);
    const name=match[1];record(`${name}:start`);
    try{
      const response=await original(input,init);
      record(`${name}:http${response.status}`);
      record(`${name}:${response.headers.get('content-type')?.includes('json')?'json':'non-json'}`);
      // Read only machine error codes. Successful payloads contain client data.
      if(!response.ok){
        try{const data=await response.clone().json();
          const codes=(data.errors??[]).map((error:{code?:unknown})=>error.code).filter((code:unknown)=>typeof code==='string'&&/^[a-z_]{1,80}$/.test(code as string));
          if(codes.length)record(`${name}:${codes.slice(0,3).join(',')}`);
        }catch{record(`${name}:non-json-error`);}
      }
      return response;
    }catch(error){record(`${name}:transport-error`);throw error;}
  };
}
