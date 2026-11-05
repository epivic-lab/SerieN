// No client construction and no transport in 6B.1. Share the Auth gate client
// when the later server protocol is authorized. UUID/email never authorize data.
export function createCloudAdapter(client){
  return Object.freeze({enabled:false,async verifiedUser(){
    const {data,error}=await client.auth.getUser();if(error||!data?.user)throw new Error('Authentication required');
    const access=await client.rpc('serien_access_allowed');if(access.error||access.data!==true)throw new Error('Access denied');
    return {id:data.user.id};
  },async save(){throw new Error('Cloud persistence disabled in 6B.1');},async load(){throw new Error('Cloud persistence disabled in 6B.1');}});
}
