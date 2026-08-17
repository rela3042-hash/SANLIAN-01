/* SANLIAN Supabase adapter v10.1 Equipment Management
   Keeps the existing frontend action contract while replacing Google Apps Script.
*/
(function(){
  'use strict';
  const cfg=window.SIGNSHOP_CONFIG||{};
  const url=String(cfg.SUPABASE_URL||'').trim();
  const key=String(cfg.SUPABASE_PUBLISHABLE_KEY||cfg.SUPABASE_ANON_KEY||'').trim();
  const usernameDomain=String(cfg.USERNAME_EMAIL_DOMAIN||'sanlian.local').trim().replace(/^@/,'');
  if(!window.supabase?.createClient){console.error('Supabase JS library not loaded');return;}

  const client=window.supabase.createClient(url||'https://invalid.supabase.co',key||'invalid-key',{
    auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
  });
  window.SANLIAN_SUPABASE_CLIENT=client;

  function configured(){return /^https:\/\/.+\.supabase\.co$/i.test(url)&&key&&!/PASTE|YOUR_|CHANGE_ME/i.test(key);}
  function fail(error){
    if(!error)return;
    const e=new Error(error.message||String(error));
    if(error.code)e.code=error.code;
    throw e;
  }
  function userEmail(input){
    const raw=String(input||'').trim().toLowerCase();
    if(!raw)return '';
    return raw.includes('@')?raw:`${raw}@${usernameDomain}`;
  }
  function profileUser(p){
    if(!p)return null;
    return {user_id:p.id,username:p.username||'',display_name:p.display_name||p.username||'User',role:p.role||'Viewer',is_active:p.is_active!==false};
  }
  async function session(){
    const {data,error}=await client.auth.getSession(); fail(error); return data?.session||null;
  }
  async function profileFor(id){
    const {data,error}=await client.from('profiles').select('id,username,display_name,role,is_active').eq('id',id).maybeSingle();
    fail(error); if(!data)throw new Error('User profile not found'); return data;
  }
  async function currentProfile(){
    const s=await session(); if(!s)throw new Error('Not authenticated');
    const p=await profileFor(s.user.id); if(p.is_active===false){await client.auth.signOut();throw new Error('User disabled');}
    return p;
  }
  async function requireConfigured(){if(!configured())throw new Error('Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in config.js');}
  async function selectRows(table,columns='*',opts={}){
    let q=client.from(table).select(columns);
    if(opts.eq)for(const [k,v] of Object.entries(opts.eq))q=q.eq(k,v);
    if(opts.order)q=q.order(opts.order.column,{ascending:!!opts.order.ascending});
    if(opts.limit)q=q.limit(opts.limit);
    const {data,error}=await q; fail(error); return data||[];
  }
  async function rpc(name,args={}){const {data,error}=await client.rpc(name,args);fail(error);return data;}
  async function invokeAdmin(body){
    const {data,error}=await client.functions.invoke('admin-users',{body:{...body,username_domain:usernameDomain}}); fail(error);
    if(data?.error)throw new Error(data.error); return data?.data??data;
  }
  function movementCompat(r){
    const isIn=['MANUAL_IN'].includes(String(r.movement_type||''));
    return {...r,quantity:Math.abs(Number(r.quantity_delta||0)),stock_in_id:isIn?r.movement_id:undefined,stock_out_id:!isIn?r.movement_id:undefined,is_deleted:!!r.is_deleted};
  }
  function flattenCount(r){
    return {
      ...r,
      id:r.stock_count_id,
      count_id:r.stock_count_id,
      created_at:r.count_time,
      count_time:r.count_time,
      checker:r.checker||r.checker_username||'',
      checker_username:r.checker||r.checker_username||'',
      adjusted:r.count_status==='APPLIED'||r.adjusted===true,
      status:String(r.result||'').toUpperCase()==='MATCH'?'matched':String(r.result||'').toUpperCase()==='SHORT'?'shortage':String(r.result||'').toUpperCase()==='OVER'?'excess':r.status
    };
  }
  async function productById(id){
    const {data,error}=await client.from('products_with_stock').select('*').eq('product_id',id).maybeSingle();fail(error);return data;
  }
  async function audit(action,entityType,entityId,details={}){
    try{await rpc('write_audit',{p_action:action,p_entity_type:entityType,p_entity_id:String(entityId||''),p_details:details});}catch(_){/* best effort */}
  }

  async function bootstrap(){
    const d=await rpc('equipment_bootstrap',{});
    const p=d?.user||await currentProfile();
    const movements=(d?.movements||[]).map(movementCompat);
    const stockIn=Array.isArray(d?.stockIn)&&d.stockIn.length?d.stockIn:movements.filter(x=>String(x.movement_type)==='MANUAL_IN');
    const stockOut=Array.isArray(d?.stockOut)&&d.stockOut.length?d.stockOut:movements.filter(x=>String(x.movement_type)==='MANUAL_OUT');
    return {
      user:profileUser(p),
      products:d?.products||[],
      categories:d?.categories||[],
      stockIn,
      stockOut,
      movements,
      stockCounts:(d?.stockCounts||[]).map(flattenCount),
      users:(d?.users||[]).map(profileUser),
      auditLogs:d?.auditLogs||[],
      backups:d?.backups||[],
      notifications:d?.notifications||[],
      settings:d?.settings||{}
    };
  }

  async function call(action,data={}){
    await requireConfigured();
    switch(action){
      case 'backendInfo': return {service:'SANLIAN Equipment Management',version:'10.3.5-auto-sku-fix',backend:'Supabase',features:['auth','rls','products','categories','stockIn','stockOut','stockCount','notifications','audit','backupSnapshot','realtime','unifiedBootstrap','serverAutoSku']};
      case 'login': {
        const email=userEmail(data.username);
        const {data:d,error}=await client.auth.signInWithPassword({email,password:String(data.password||'')});fail(error);
        const p=await profileFor(d.user.id);
        if(p.is_active===false){await client.auth.signOut();throw new Error('User disabled');}
        await audit('LOGIN','SESSION',d.user.id,{username:p.username});
        return {token:d.session?.access_token||'',user:profileUser(p)};
      }
      case 'logout': {try{await audit('LOGOUT','SESSION','',{});}catch(_){} const {error}=await client.auth.signOut();fail(error);return true;}
      case 'me': return profileUser(await currentProfile());
      case 'bootstrap': return bootstrap();

      case 'createProduct': {
        const p=data.product||{};
        const out=await rpc('create_product',{p_product:p}); return out;
      }
      case 'updateProduct': {
        const p=data.product||{};
        return await rpc('update_product',{p_product:p});
      }
      case 'deleteProduct': return await rpc('delete_product',{p_product_id:data.product_id});
      case 'getNextProductSku': return await rpc('next_product_sku',{});

      case 'createCategory': return await rpc('create_category',{p_name:String(data.category_name||'')});
      case 'updateCategory': return await rpc('update_category',{p_category_id:data.category_id,p_name:String(data.category_name||'')});
      case 'deleteCategory': return await rpc('delete_category',{p_category_id:data.category_id});

      case 'stockIn': return await rpc('adjust_stock',{p_product_id:data.product_id,p_quantity_delta:Math.abs(Number(data.quantity||data.qty||0)),p_movement_type:'MANUAL_IN',p_note:String(data.note||'')});
      case 'stockOut': return await rpc('adjust_stock',{p_product_id:data.product_id,p_quantity_delta:-Math.abs(Number(data.quantity||data.qty||0)),p_movement_type:'MANUAL_OUT',p_note:String(data.note||'')});
      case 'deleteStockTransaction': return await rpc('reverse_manual_movement',{p_movement_id:data.id});

      case 'saveStockCount': {
        const c=data.count||data;
        const result=await rpc('create_stock_count',{p_items:[{product_id:c.product_id,actual_qty:Number(c.actual_qty),reason:c.reason||null,note:c.note||null}],p_note:c.note||null});
        return result;
      }
      case 'updateStockCount': {
        const c=data.count||data;
        return await rpc('update_single_stock_count',{p_stock_count_id:data.count_id||c.count_id,p_actual_qty:Number(c.actual_qty),p_reason:c.reason||null,p_note:c.note||null});
      }
      case 'deleteStockCount': return await rpc('delete_stock_count',{p_stock_count_id:data.count_id});
      case 'adjustStockCount': return await rpc('apply_stock_count',{p_stock_count_id:data.count_id});

      case 'createUser': return await invokeAdmin({action:'create',user:data.user||{}});
      case 'updateUser': return await invokeAdmin({action:'update_profile',user:data.user||{}});
      case 'resetUserPassword': return await invokeAdmin({action:'reset_password',user_id:data.user_id,password:data.password});
      case 'setUserActive': return await invokeAdmin({action:'set_active',user_id:data.user_id,is_active:!!data.is_active});

      case 'saveSettings': {
        await currentProfile();
        const rows=Object.entries(data.settings||{}).map(([setting_key,setting_value])=>({setting_key,setting_value,updated_at:new Date().toISOString()}));
        if(!rows.length)return true;
        const {error}=await client.from('settings').upsert(rows,{onConflict:'setting_key'});fail(error);await audit('SAVE_SETTINGS','SETTINGS','SYSTEM',{keys:rows.map(x=>x.setting_key)});return true;
      }
      case 'clearAuditLogs': return await rpc('clear_audit_logs',{p_confirm:data.confirm});
      case 'createBackup': return await rpc('create_app_backup',{});
      case 'deleteBackup': return await rpc('delete_app_backup',{p_backup_id:data.backup_id});
      case 'archiveMonthlyTransactions': return await rpc('archive_old_movements',{p_confirm:data.confirm});
      case 'markNotificationRead': return await rpc('mark_notification_read',{p_notification_id:data.notification_id});
      case 'markAllNotificationsRead': return await rpc('mark_all_notifications_read',{});
      case 'deleteNotification': return await rpc('delete_notification',{p_notification_id:data.notification_id});
      default: throw new Error('Unknown Supabase action: '+action);
    }
  }

  let liveChannel=null;
  function startRealtime(onChange){
    if(liveChannel)return liveChannel;
    let timer=null;
    const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{try{onChange?.()}catch(_){ }},450)};
    liveChannel=client.channel('sanlian-live')
      .on('postgres_changes',{event:'*',schema:'public',table:'inventory'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'categories'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'stock_movements'},changed)
      .on('postgres_changes',{event:'*',schema:'public',table:'stock_counts'},changed)
      .subscribe();
    return liveChannel;
  }
  async function stopRealtime(){
    if(!liveChannel)return;
    try{await client.removeChannel(liveChannel)}catch(_){ }
    liveChannel=null;
  }

  window.SANLIAN_SUPABASE={client,configured,call,bootstrap,startRealtime,stopRealtime};
})();
