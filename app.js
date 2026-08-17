
async function checkBackendVersion(){
  try{
    const info=await window.SANLIAN_SUPABASE?.call("backendInfo",{});
    const version=info?.version||"unknown";
    const el=document.querySelector("#backendVersion");
    if(el)el.textContent=tl("Backend: "+version,"后端: "+version);
    return version;
  }catch(err){
    const el=document.querySelector("#backendVersion");
    if(el)el.textContent=tl("Backend: Supabase config required","后端：需要 Supabase 配置");
    return "error";
  }
}

async function checkBackendCompatibility(){
  if(!sessionToken)return null;
  try{
    const info=await api("backendInfo");
    const version=String(info?.version||"");
    const el=document.querySelector("#backendVersion");
    if(el)el.textContent=tl("Backend: "+(version||"unknown"),"后端: "+(version||"unknown"));
    return info;
  }catch(err){
    const msg=String(err?.message||err||"");
    const el=document.querySelector("#backendVersion");
    if(/Unknown action/i.test(msg)){
      if(el)el.textContent=tl("Backend: OLD VERSION","后端：旧版本");
      toast(tl("ກະລຸນາກວດ SUPABASE_URL ແລະ SUPABASE_PUBLISHABLE_KEY ໃນ config.js.","请检查 config.js 中的 SUPABASE_URL 和 SUPABASE_PUBLISHABLE_KEY。"));
    }else{
      if(el)el.textContent=tl("Backend: check failed","后端：检查失败");
      console.warn("Backend compatibility check failed:",err);
    }
    return null;
  }
}

window.SANLIAN_BUILD="10.3.5-SUPABASE-AUTO-SKU-FIX";console.log("SANLIAN BUILD 10.3.5 SUPABASE AUTO SKU FIX loaded");

async function removeOldServiceWorkersAndCaches(){
  try{
    if("serviceWorker" in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r=>r.unregister()));
    }
    if("caches" in window){
      const names=await caches.keys();
      await Promise.all(names.map(n=>caches.delete(n)));
    }
  }catch(err){
    console.warn("Cache cleanup skipped:",err);
  }
}


/* ==================== v7.3.0 Lao / Chinese i18n ==================== */
const LANG_KEY="sanlian_language";
let currentLanguage="lo";
let languageBindingsCaptured=false;
const staticTextBindings=[];
const staticAttrBindings=[];

const UI_TRANSLATIONS={
  "7 ວັນ":{lo:"7 ວັນ",zh:"7 天"},
  "30 ວັນ天":{lo:"30 ວັນ",zh:"30 天"},
  "90 ວັນ天":{lo:"90 ວັນ",zh:"90 天"},
  "1 ປີ年":{lo:"1 ປີ",zh:"1 年"},
  "A4 ແນວຕັ້ງ":{lo:"A4 ແນວຕັ້ງ",zh:"A4 纵向"},
  "A4 ແນວນອນ":{lo:"A4 ແນວນອນ",zh:"A4 横向"},
  "ຮ້ານພິມປ້າຍຊານລຽນ":{lo:"ຮ້ານພິມປ້າຍຊານລຽນ",zh:"三联广告装饰公司"},
  "ລະບົບຈັດການອຸປະກອນ":{lo:"ລະບົບຈັດການອຸປະກອນ",zh:"设备管理系统"},
  "ໜ້າຫຼັກ":{lo:"ໜ້າຫຼັກ",zh:"首页"},
  "ສິນຄ້າ":{lo:"ສິນຄ້າ",zh:"商品"},
  "ນຳເຂົ້າ":{lo:"ນຳເຂົ້າ",zh:"入库"},
  "ເບີກອອກ":{lo:"ເບີກອອກ",zh:"出库"},
  "ໝວດໝູ່":{lo:"ໝວດໝູ່",zh:"类别"},
  "ລາຍງານ":{lo:"ລາຍງານ",zh:"报告"},
  "ຜູ້ໃຊ້ລະບົບ":{lo:"ຜູ້ໃຊ້ລະບົບ",zh:"系统用户"},
  "ເຂົ້າລະບົບ":{lo:"ເຂົ້າລະບົບ",zh:"登录"},
  "ຍົກເລີກ":{lo:"ຍົກເລີກ",zh:"取消"},
  "ຍົກເລີກແກ້ໄຂ":{lo:"ຍົກເລີກແກ້ໄຂ",zh:"取消编辑"},
  "ບັນທຶກການແກ້ໄຂ":{lo:"ບັນທຶກການແກ້ໄຂ",zh:"保存修改"},
  "ປິດ":{lo:"ປິດ",zh:"关闭"},
  "ບັນທຶກ":{lo:"ບັນທຶກ",zh:"保存"},
  "ລ້າງຟອມ":{lo:"ລ້າງຟອມ",zh:"重置表单"},
  "ແບບຟອມ":{lo:"ແບບຟອມ",zh:"表单"},
  "ເພີ່ມອຸປະກອນ":{lo:"ເພີ່ມອຸປະກອນ",zh:"添加设备"},
  "ນຳເຂົ້າອຸປະກອນ":{lo:"ນຳເຂົ້າອຸປະກອນ",zh:"设备入库"},
  "ເບີກອຸປະກອນ":{lo:"ເບີກອຸປະກອນ",zh:"设备出库"},
  "ເພີ່ມໝວດໝູ່":{lo:"ເພີ່ມໝວດໝູ່",zh:"添加类别"},
  "ເພີ່ມ User":{lo:"ເພີ່ມຜູ້ໃຊ້",zh:"添加用户"},
  "ຟອມຢູ່ຊ້າຍ ແລະປະຫວັດຢູ່ຂວາ":{lo:"ຟອມຢູ່ຊ້າຍ ແລະປະຫວັດຢູ່ຂວາ",zh:"左侧填写表单，右侧查看历史记录"},
  "ຍິງ Barcode":{lo:"ຍິງ Barcode",zh:"扫描 Barcode"},
  "ປ້ອນລະຫັດດ້ວຍຕົນເອງ":{lo:"ປ້ອນລະຫັດດ້ວຍຕົນເອງ",zh:"手动输入代码"},
  "ປ້ອນເອງ":{lo:"ປ້ອນເອງ",zh:"手动输入"},
  "ໃຊ້ລະຫັດນີ້":{lo:"ໃຊ້ລະຫັດນີ້",zh:"使用此代码"},
  "ສະຫຼັບກ້ອງ":{lo:"ສະຫຼັບກ້ອງ",zh:"切换摄像头"},
  "ຈັດວາງ Barcode ຫຼື QR Code ໃຫ້ຢູ່ກາງກ້ອງ":{lo:"ຈັດວາງ Barcode ຫຼື QR Code ໃຫ້ຢູ່ກາງກ້ອງ",zh:"请将 Barcode 或 QR Code 对准摄像头中央"},
  "QR Code ອຸປະກອນ":{lo:"QR Code ອຸປະກອນ",zh:"设备 QR Code"},
  "ສະຖານະ":{lo:"ສະຖານະ",zh:"状态"},
  "ເວລາ":{lo:"ເວລາ",zh:"时间"},
  "ຜູ້ສ້າງ":{lo:"ຜູ້ສ້າງ",zh:"创建人"},
  "ຊື່ໄຟລ໌":{lo:"ຊື່ໄຟລ໌",zh:"文件名"},
  "ນະໂຍບາຍ Backup":{lo:"ນະໂຍບາຍ Backup",zh:"备份策略"},
  "ສຳຮອງ Google Sheets ແລະດາວໂຫຼດ Snapshot":{lo:"ສ້າງ Supabase App Snapshot ແລະດາວໂຫຼດ JSON",zh:"创建 Supabase 应用快照并下载 JSON"},
  "Backup ຈະສ້າງສຳເນົາ Spreadsheet ໄປທີ່ Google Drive ແລະບັນທຶກປະຫວັດໄວ້.":{lo:"Snapshot ຈະເກັບສຳເນົາຂໍ້ມູນຫຼັກໄວ້ໃນ Supabase ສຳລັບການກວດ/Export.",zh:"快照会在 Supabase 中保存主要应用数据，用于检查和导出。"},
  "ລະບົບຈະ Backup ອັດຕະໂນມັດອາທິດລະ 1 ຄັ້ງ (ວັນອາທິດ ປະມານ 02:00), ແລະ Admin ສາມາດສ້າງ ຫຼື ລຶບ Backup ໄດ້ດ້ວຍຕົນເອງ.":{lo:"ລະບົບຈະ Backup ອັດຕະໂນມັດອາທິດລະ 1 ຄັ້ງ (ວັນອາທິດ ປະມານ 02:00), ແລະ Admin ສາມາດສ້າງ ຫຼື ລຶບ Backup ໄດ້ດ້ວຍຕົນເອງ.",zh:"系统每周自动备份一次（星期日约 02:00），管理员也可以随时手动创建或删除备份。"},
  "ລາຍອາທິດ":{lo:"ລາຍອາທິດ",zh:"每周"},
  "ຈັດການ":{lo:"ຈັດການ",zh:"操作"},
  "ລຶບ Backup":{lo:"ລຶບ Backup",zh:"删除备份"},
  "ກຳລັງລຶບ Backup...":{lo:"ກຳລັງລຶບ Backup...",zh:"正在删除备份..."},
  "ລຶບ Backup ສຳເລັດ":{lo:"ລຶບ Backup ສຳເລັດ",zh:"备份已删除"},
  "ລາຍວັນ":{lo:"ລາຍວັນ",zh:"按日"},
  "ລາຍເດືອນ":{lo:"ລາຍເດືອນ",zh:"按月"},
  "ລາຍປີ":{lo:"ລາຍປີ",zh:"按年"},
  "ທັງໝົດ":{lo:"ທັງໝົດ",zh:"全部"},
  "ທຸກ ການດຳເນີນງານ":{lo:"ທຸກ ການດຳເນີນງານ",zh:"全部操作"},
  "ທຸກ ຜູ້ໃຊ້":{lo:"ທຸກ ຜູ້ໃຊ້",zh:"全部用户"},
  "ລາຍລະອຽດ Audit":{lo:"ລາຍລະອຽດ Audit",zh:"审计详情"},
  "🗑️ ລ້າງ Audit":{lo:"🗑️ ລ້າງ Audit",zh:"🗑️ 清空审计日志"},
  "ໂໝດ Auto: ລະບົບສ້າງ Barcode 13 ຫຼັກ":{lo:"ໂໝດ Auto: ລະບົບສ້າງ Barcode 13 ຫຼັກ",zh:"自动模式：系统生成 13 位 Barcode"},
  "ໂໝດ Auto: ລະບົບສ້າງ SKU ອັດຕະໂນມັດ":{lo:"ໂໝດ Auto: ລະບົບສ້າງ SKU ອັດຕະໂນມັດ",zh:"自动模式：系统自动生成 SKU"},
  "ແຖວ/ໜ້າ":{lo:"ແຖວ/ໜ້າ",zh:"每页行数"},
  "ລາຄາ (ບໍ່ບັງຄັບ)":{lo:"ລາຄາ (ບໍ່ບັງຄັບ)",zh:"价格（选填）"},
  "ລາຄາ":{lo:"ລາຄາ",zh:"价格"},
  "ປ້ອນກໍໄດ້ ຫຼື ປ່ອຍວ່າງກໍໄດ້":{lo:"ປ້ອນກໍໄດ້ ຫຼື ປ່ອຍວ່າງກໍໄດ້",zh:"可填写，也可以留空"},

  "Overview":{lo:"ພາບລວມ",zh:"概览"},
  "Inventory":{lo:"ຄັງສິນຄ້າ",zh:"库存"},
  "System":{lo:"ລະບົບ",zh:"系统"},
  "Audit Log":{lo:"ບັນທຶກ Audit",zh:"审计日志"},
  "Audit & Activity Log":{lo:"Audit ແລະ ບັນທຶກກິດຈະກຳ",zh:"审计与活动日志"},
  "Backup":{lo:"ສຳຮອງຂໍ້ມູນ",zh:"备份"},
  "Backup & Restore":{lo:"ສຳຮອງ ແລະ ກູ້ຄືນ",zh:"备份与恢复"},
  "Username":{lo:"ຊື່ຜູ້ໃຊ້",zh:"用户名"},
  "Password":{lo:"ລະຫັດຜ່ານ",zh:"密码"},
  "Logout":{lo:"ອອກຈາກລະບົບ",zh:"退出登录"},
  "Add User":{lo:"ເພີ່ມຜູ້ໃຊ້",zh:"添加用户"},
  "Display Name":{lo:"ຊື່ສະແດງ",zh:"显示名称"},
  "Role":{lo:"ບົດບາດ",zh:"角色"},
  "Refresh":{lo:"ໂຫຼດໃໝ່",zh:"刷新"},
  "First":{lo:"ໜ້າທຳອິດ",zh:"首页"},
  "Previous":{lo:"ກ່ອນໜ້າ",zh:"上一页"},
  "Next":{lo:"ຕໍ່ໄປ",zh:"下一页"},
  "Last":{lo:"ໜ້າສຸດທ້າຍ",zh:"末页"},
  "Print":{lo:"ພິມ",zh:"打印"},
  "Camera":{lo:"ກ້ອງ",zh:"摄像头"},
  "Flash":{lo:"ແຟລດ",zh:"闪光灯"},
  "Label":{lo:"ປ້າຍ",zh:"标签"},
  "Edit":{lo:"ແກ້ໄຂ",zh:"编辑"},
  "Delete":{lo:"ລຶບ",zh:"删除"},
  "Active":{lo:"ເປີດໃຊ້ງານ",zh:"启用"},
  "Disabled":{lo:"ປິດໃຊ້ງານ",zh:"已停用"},
  "Disable":{lo:"ປິດໃຊ້",zh:"停用"},
  "Enable":{lo:"ເປີດໃຊ້",zh:"启用"},
  "Admin only":{lo:"ສະເພາະ Admin",zh:"仅限管理员"},
  "Create Backup":{lo:"ສ້າງ Backup",zh:"创建备份"},
  "Download JSON":{lo:"ດາວໂຫຼດ JSON",zh:"下载 JSON"},
  "Export CSV":{lo:"ສົ່ງອອກ CSV",zh:"导出 CSV"},
  "Export Excel":{lo:"ສົ່ງອອກ Excel",zh:"导出 Excel"},
  "Export Summary":{lo:"ສົ່ງອອກສະຫຼຸບ",zh:"导出汇总"},
  "Backup ID":{lo:"Backup ID",zh:"备份 ID"},
  "Drive File ID":{lo:"Drive File ID",zh:"Drive 文件 ID"},
  "Admin":{lo:"ຜູ້ຄຸ້ມຄອງ",zh:"管理员"},
  "Manager":{lo:"ຜູ້ຈັດການ",zh:"经理"},
  "Warehouse":{lo:"ພະນັກງານຄັງ",zh:"仓库"},
  "Viewer":{lo:"ຜູ້ເບິ່ງ",zh:"查看者"},
  "Creating backup...":{lo:"ກຳລັງສ້າງ Backup...",zh:"正在创建备份..."},
  "Backup completed":{lo:"Backup ສຳເລັດ",zh:"备份完成"},
  "Create Supabase snapshot now?":{lo:"ສ້າງ Supabase App Snapshot ຕອນນີ້ບໍ?",zh:"现在创建 Supabase 应用快照吗？"},

  "ທຸກໝວດໝູ່":{lo:"ທຸກໝວດໝູ່",zh:"所有类别"},
  "ບໍ່ພົບຂໍ້ມູນ":{lo:"ບໍ່ພົບຂໍ້ມູນ",zh:"未找到数据"},
  "ບໍ່ພົບລາຍການ":{lo:"ບໍ່ພົບລາຍການ",zh:"未找到记录"},
  "ອຸປະກອນ":{lo:"ອຸປະກອນ",zh:"设备"},
  "Stock ລວມ":{lo:"Stock ລວມ",zh:"总库存"},
  "ໃກ້ໝົດ":{lo:"ໃກ້ໝົດ",zh:"库存紧张"},
  "ໝົດ":{lo:"ໝົດ",zh:"缺货"},
  "ປົກກະຕິ":{lo:"ປົກກະຕິ",zh:"正常"},
  "Stock In":{lo:"ນຳເຂົ້າ",zh:"入库"},
  "Stock Out":{lo:"ເບີກອອກ",zh:"出库"},
  "ລາຍການ":{lo:"ລາຍການ",zh:"项目"},
  "Login":{lo:"ເຂົ້າລະບົບ",zh:"登录"},
  "ການແກ້ໄຂ":{lo:"ການແກ້ໄຂ",zh:"修改"},
  "ການລຶບ":{lo:"ການລຶບ",zh:"删除"},
  "Log ທັງໝົດ":{lo:"Log ທັງໝົດ",zh:"日志总数"},
  "Backup ທັງໝົດ":{lo:"Backup ທັງໝົດ",zh:"备份总数"},
  "ສຳເລັດ":{lo:"ສຳເລັດ",zh:"成功"},
  "ລົ້ມເຫຼວ":{lo:"ລົ້ມເຫຼວ",zh:"失败"},
  "ລ່າສຸດ":{lo:"ລ່າສຸດ",zh:"最新"},

  "ຄົ້ນຫາ Barcode, SKU, ອຸປະກອນ...":{lo:"ຄົ້ນຫາ Barcode, SKU, ອຸປະກອນ...",zh:"搜索 Barcode、SKU、设备..."},
  "ຄົ້ນຫາ Barcode, SKU, ຊື່":{lo:"ຄົ້ນຫາ Barcode, SKU, ຊື່",zh:"搜索 Barcode、SKU、名称"},
  "ຄົ້ນຫາ User, Action, Entity...":{lo:"ຄົ້ນຫາ User, Action, Entity...",zh:"搜索用户、操作、实体..."},
  "ປ້ອນຈຳນວນ":{lo:"ປ້ອນຈຳນວນ",zh:"输入数量"},
  "ປີ":{lo:"ປີ",zh:"年份"},
  "ຢ່າງໜ້ອຍ 6 ຕົວ":{lo:"ຢ່າງໜ້ອຍ 6 ຕົວ",zh:"至少 6 个字符"},
  "ສະແກນ ຫຼືພິມ Barcode ແລ້ວ Enter":{lo:"ສະແກນ ຫຼືພິມ Barcode ແລ້ວ Enter",zh:"扫描或输入 Barcode 后按 Enter"},
  "ໃສ່ໝາຍເຫດກ່ຽວກັບອຸປະກອນ":{lo:"ໃສ່ໝາຍເຫດກ່ຽວກັບອຸປະກອນ",zh:"输入设备备注"},
  "Sync":{lo:"Sync",zh:"同步"},
  "Theme":{lo:"Theme",zh:"主题"},
  "ກ່ອນໜ້າ":{lo:"ກ່ອນໜ້າ",zh:"上一页"},
  "ຕໍ່ໄປ":{lo:"ຕໍ່ໄປ",zh:"下一页"},
  "ໜ້າທຳອິດ":{lo:"ໜ້າທຳອິດ",zh:"首页"},
  "ໜ້າສຸດທ້າຍ":{lo:"ໜ້າສຸດທ້າຍ",zh:"末页"},

  "ກຳລັງບັນທຶກ...":{lo:"ກຳລັງບັນທຶກ...",zh:"正在保存..."},
  "ກະລຸນາເລືອກໝວດໝູ່":{lo:"ກະລຸນາເລືອກໝວດໝູ່",zh:"请选择类别"},
  "ກະລຸນາໃສ່ຊື່ອຸປະກອນ":{lo:"ກະລຸນາໃສ່ຊື່ອຸປະກອນ",zh:"请输入设备名称"},
  "ກະລຸນາເລືອກອຸປະກອນ":{lo:"ກະລຸນາເລືອກອຸປະກອນ",zh:"请选择设备"},
  "ກະລຸນາປ້ອນຈຳນວນທີ່ຫຼາຍກວ່າ 0":{lo:"ກະລຸນາປ້ອນຈຳນວນທີ່ຫຼາຍກວ່າ 0",zh:"请输入大于 0 的数量"},
  "ບັນທຶກອຸປະກອນສຳເລັດ":{lo:"ບັນທຶກອຸປະກອນສຳເລັດ",zh:"设备保存成功"},
  "ບັນທຶກແລ້ວ — ກະລຸນາກົດ Refresh ຂໍ້ມູນ":{lo:"ບັນທຶກແລ້ວ — ກະລຸນາກົດ Refresh ຂໍ້ມູນ",zh:"已保存，请点击刷新数据"},
  "Stock In ສຳເລັດ":{lo:"Stock In ສຳເລັດ",zh:"入库成功"},
  "Stock Out ສຳເລັດ":{lo:"Stock Out ສຳເລັດ",zh:"出库成功"},
  "ບໍ່ພົບ Barcode":{lo:"ບໍ່ພົບ Barcode",zh:"未找到 Barcode"},
  "ບໍ່ພົບ Barcode / QR Code ນີ້":{lo:"ບໍ່ພົບ Barcode / QR Code ນີ້",zh:"未找到此 Barcode / QR Code"},
  "ກຳລັງເປີດກ້ອງ...":{lo:"ກຳລັງເປີດກ້ອງ...",zh:"正在打开摄像头..."},
  "ກ້ອງນີ້ບໍ່ຮອງຮັບ Flash":{lo:"ກ້ອງນີ້ບໍ່ຮອງຮັບ Flash",zh:"此摄像头不支持闪光灯"},
  "ສະເພາະ Admin ເທົ່ານັ້ນ":{lo:"ສະເພາະ Admin ເທົ່ານັ້ນ",zh:"仅限管理员"},
  "ລຶບອຸປະກອນ?":{lo:"ລຶບອຸປະກອນ?",zh:"删除设备？"},
  "ຊື່ໃໝ່":{lo:"ຊື່ໃໝ່",zh:"新名称"},
  "ລຶບໝວດໝູ່?":{lo:"ລຶບໝວດໝູ່?",zh:"删除类别？"},
  "ຢືນຢັນອອກຈາກລະບົບ?":{lo:"ຢືນຢັນອອກຈາກລະບົບ?",zh:"确认退出登录？"},
  "ສ້າງ Barcode ໃໝ່ແລ້ວ":{lo:"ສ້າງ Barcode ໃໝ່ແລ້ວ",zh:"已生成新的 Barcode"},
  "ສ້າງ SKU ໃໝ່ແລ້ວ":{lo:"ສ້າງ SKU ໃໝ່ແລ້ວ",zh:"已生成新的 SKU"},
  "ແກ້ໄຂ User":{lo:"ແກ້ໄຂຜູ້ໃຊ້",zh:"编辑用户"},
  "ບັນທຶກ User ສຳເລັດ":{lo:"ບັນທຶກ User ສຳເລັດ",zh:"用户保存成功"},
  "ປ່ຽນ Password ສຳເລັດ":{lo:"ປ່ຽນ Password ສຳເລັດ",zh:"密码修改成功"},
  "ອັບເດດ User ສຳເລັດ":{lo:"ອັບເດດ User ສຳເລັດ",zh:"用户更新成功"},
  "三联广告装饰公司":{lo:"ຮ້ານພິມປ້າຍຊານລຽນ",zh:"三联广告装饰公司"},
  "Backend: checking...":{lo:"Backend: ກຳລັງກວດສອບ...",zh:"后端：正在检查..."},
  "Auto":{lo:"ອັດຕະໂນມັດ",zh:"自动"},
  "📦 Archive Monthly Transactions":{lo:"📦 Archive ລາຍການລາຍເດືອນ",zh:"📦 归档每月交易"},
  "📷 Barcode / QR Scanner":{lo:"📷 ສະແກນ Barcode / QR",zh:"📷 Barcode / QR 扫描器"},
  "User":{lo:"ຜູ້ໃຊ້",zh:"用户"},
  "Action":{lo:"ການດຳເນີນງານ",zh:"操作"},
  "Entity":{lo:"ໜ່ວຍງານ",zh:"实体"},
  "Record ID":{lo:"ລະຫັດບັນທຶກ",zh:"记录 ID"},
  "Next ›":{lo:"ຕໍ່ໄປ ›",zh:"下一页 ›"},
  "● Online":{lo:"● Online",zh:"● 在线"},
  "Version 7.2.1":{lo:"Version 7.2.1",zh:"版本 7.2.1"},
  "ກວດສະຕ໋ອກ":{lo:"ກວດສະຕ໋ອກ",zh:"库存盘点"},
  "ກວດຈຳນວນຈິງ ແລະ ປຽບທຽບກັບລະບົບ":{lo:"ກວດຈຳນວນຈິງ ແລະ ປຽບທຽບກັບລະບົບ",zh:"实盘数量并与系统库存比较"},
  "ຈຳນວນໃນລະບົບ":{lo:"ຈຳນວນໃນລະບົບ",zh:"系统库存"},
  "ຈຳນວນນັບຈິງ":{lo:"ຈຳນວນນັບຈິງ",zh:"实盘数量"},
  "ສ່ວນຕ່າງ":{lo:"ສ່ວນຕ່າງ",zh:"差异"},
  "ເຫດຜົນ":{lo:"ເຫດຜົນ",zh:"原因"},
  "ຜູ້ກວດ":{lo:"ຜູ້ກວດ",zh:"盘点人"},
  "ວັນທີ/ເວລາ":{lo:"ວັນທີ/ເວລາ",zh:"日期/时间"},
  "ໝາຍເຫດ":{lo:"ໝາຍເຫດ",zh:"备注"},
  "ການດຳເນີນການ":{lo:"ການດຳເນີນການ",zh:"操作"},
  "ປະຫວັດການກວດສະຕ໋ອກ":{lo:"ປະຫວັດການກວດສະຕ໋ອກ",zh:"盘点记录"},
  "ກົງກັນ":{lo:"ກົງກັນ",zh:"相符"},
  "ຂາດ":{lo:"ຂາດ",zh:"盘亏"},
  "ເກີນ":{lo:"ເກີນ",zh:"盘盈"},
  "ຍັງບໍ່ໄດ້ກວດ":{lo:"ຍັງບໍ່ໄດ້ກວດ",zh:"未盘点"},
  "ປັບສະຕ໋ອກ":{lo:"ປັບສະຕ໋ອກ",zh:"调整库存"},
  "ປັບແລ້ວ":{lo:"ປັບແລ້ວ",zh:"已调整"},
  "ສິນຄ້າເສຍຫາຍ":{lo:"ສິນຄ້າເສຍຫາຍ",zh:"商品损坏"},
  "ສູນເສຍ/ຫາຍ":{lo:"ສູນເສຍ/ຫາຍ",zh:"丢失"},
  "ນຳເຂົ້າບໍ່ໄດ້ບັນທຶກ":{lo:"ນຳເຂົ້າບໍ່ໄດ້ບັນທຶກ",zh:"未登记入库"},
  "ເບີກອອກບໍ່ໄດ້ບັນທຶກ":{lo:"ເບີກອອກບໍ່ໄດ້ບັນທຶກ",zh:"未登记出库"},
  "ນັບຜິດ":{lo:"ນັບຜິດ",zh:"计数错误"},
  "ອື່ນໆ":{lo:"ອື່ນໆ",zh:"其他"},
  "ເລືອກເຫດຜົນ":{lo:"ເລືອກເຫດຜົນ",zh:"选择原因"},
  "ຄົ້ນຫາປະຫວັດກວດສະຕ໋ອກ...":{lo:"ຄົ້ນຫາປະຫວັດກວດສະຕ໋ອກ...",zh:"搜索盘点记录..."},
  "ບັນທຶກຜົນກວດ":{lo:"ບັນທຶກຜົນກວດ",zh:"保存盘点结果"},
  "ລາຍການກວດ":{lo:"ລາຍການກວດ",zh:"盘点记录"},
  "ກົງ":{lo:"ກົງ",zh:"相符"},
  "ຈຳນວນຂາດ":{lo:"ຈຳນວນຂາດ",zh:"盘亏记录"},
  "ຈຳນວນເກີນ":{lo:"ຈຳນວນເກີນ",zh:"盘盈记录"}
};

function normalizeUiText(value){return String(value??"").trim().replace(/\s+/g," ")}
function splitMixedTranslation(text){
  const clean=normalizeUiText(text);
  const hasLao=/[\u0E80-\u0EFF]/.test(clean),hasHan=/[\u3400-\u9FFF]/.test(clean);
  if(!hasLao||!hasHan)return null;
  const idx=clean.search(/[\u3400-\u9FFF]/);
  if(idx<0)return null;
  let lo=clean.slice(0,idx).replace(/[\s/|·-]+$/g,"").trim();
  let zh=clean.slice(idx).trim();
  const num=lo.match(/^(\d+)\s/);
  if(num && !/^\d/.test(zh) && !/\d/.test(zh))zh=`${num[1]} ${zh}`;
  return {lo,zh};
}
function translationPair(source){
  const key=normalizeUiText(source);
  return UI_TRANSLATIONS[key]||splitMixedTranslation(key);
}
function translateString(text){
  if(text==null)return text;
  const raw=String(text),trimmed=raw.trim();
  if(!trimmed)return raw;
  const pair=translationPair(trimmed);
  if(!pair)return raw;
  const translated=pair[currentLanguage]??pair.lo??trimmed;
  const lead=raw.match(/^\s*/)?.[0]||"",trail=raw.match(/\s*$/)?.[0]||"";
  return lead+translated+trail;
}
function t(text){return translateString(text)}
function tl(lo,zh){return currentLanguage==="zh"?zh:lo}
function tFormat(lo,zh,vars={}){
  let out=currentLanguage==="zh"?zh:lo;
  Object.entries(vars).forEach(([k,v])=>{out=out.replaceAll(`{${k}}`,String(v))});
  return out;
}
function captureStaticLanguageBindings(){
  if(languageBindingsCaptured||!document.body)return;
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let node;
  while((node=walker.nextNode())){
    const parent=node.parentElement;
    if(!parent||["SCRIPT","STYLE","NOSCRIPT"].includes(parent.tagName))continue;
    // Keep explicitly bilingual print/company text unchanged in both language modes.
    if(parent.closest("[data-no-translate]"))continue;
    if(translationPair(node.nodeValue))staticTextBindings.push({node,source:node.nodeValue});
  }
  document.querySelectorAll("[placeholder],[title],[aria-label]").forEach(el=>{
    ["placeholder","title","aria-label"].forEach(attr=>{
      const source=el.getAttribute(attr);
      if(source&&translationPair(source))staticAttrBindings.push({el,attr,source});
    });
  });
  languageBindingsCaptured=true;
}
function renderStaticTranslations(){
  staticTextBindings.forEach(({node,source})=>{if(node?.isConnected)node.nodeValue=translateString(source)});
  staticAttrBindings.forEach(({el,attr,source})=>{if(el?.isConnected)el.setAttribute(attr,translateString(source))});
  document.querySelectorAll("[data-language]").forEach(btn=>{
    const active=btn.dataset.language===currentLanguage;
    btn.classList.toggle("active",active);btn.setAttribute("aria-pressed",String(active));
  });
  document.title=currentLanguage==="zh"?"三联库存管理系统":"SANLIAN ລະບົບຈັດການສະຕ໋ອກ";
}
function applyLanguage(language="lo"){
  const next=language==="zh"?"zh":"lo";
  currentLanguage=next;
  localStorage.setItem(LANG_KEY,currentLanguage);
  document.documentElement.lang=currentLanguage==="zh"?"zh-CN":"lo";
  captureStaticLanguageBindings();
  renderStaticTranslations();
  if(typeof renderAll==="function" && (state?.products?.length||state?.categories?.length||state?.users?.length)){
    renderAll();
  }
  updateNetworkStatus?.();
}
function setupLanguageSwitcher(){
  document.addEventListener("click",e=>{
    const btn=e.target.closest("[data-language]");
    if(!btn)return;
    applyLanguage(btn.dataset.language);
  });
  renderStaticTranslations();
}
function initLanguage(){
  currentLanguage=localStorage.getItem(LANG_KEY)==="zh"?"zh":"lo";
  captureStaticLanguageBindings();
  applyLanguage(currentLanguage);
  setupLanguageSwitcher();
}
/* ========================================================================== */


// v4.2.2 migration: remove all custom-logo data left by v4.3.
(function removeLegacyCustomLogo(){
  const legacyKeys=[
    "sanlian_custom_logo",
    "signshop_custom_logo",
    "custom_logo",
    "system_logo"
  ];
  legacyKeys.forEach(key=>localStorage.removeItem(key));
})();


let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;

function isStandaloneMode(){
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}
function updateNetworkStatus(){
  const online=navigator.onLine,banner=$("#networkBanner");
  document.body.classList.toggle("is-offline",!online);
  if(!banner)return;
  banner.classList.remove("hidden","online");
  banner.textContent=online?tl("✅ Online — ເຊື່ອມຕໍ່ Internet ແລ້ວ","✅ 在线 — 已连接互联网"):tl("⚠️ Offline — ຍັງບໍ່ສາມາດ Sync ກັບ Supabase","⚠️ 离线 — 暂时无法同步 Supabase");
  if(online){
    banner.classList.add("online");
    setTimeout(()=>banner.classList.add("hidden"),2500);
  }
  const status=$("#pwaStatus");
  if(status)status.textContent=currentLanguage==="zh"?`模式: ${isStandaloneMode()?"已安装应用":"浏览器"} | 网络: ${online?"在线":"离线"} | Service Worker: ${"serviceWorker" in navigator?"支持":"不支持"}`:`Mode: ${isStandaloneMode()?"Installed App":"Browser"} | Network: ${online?"Online":"Offline"} | Service Worker: ${"serviceWorker" in navigator?"Supported":"Not supported"}`;
}
async function promptInstall(){
  if(isStandaloneMode()){toast(tl("Application ຖືກຕິດຕັ້ງແລ້ວ","应用已安装"));return}
  if(!deferredInstallPrompt){
    toast(tl("ໃຊ້ Browser menu → Add to Home screen / Install app","请使用浏览器菜单 → 添加到主屏幕 / 安装应用"));
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt=null;
  $("#installAppBtn")?.classList.add("hidden");
}
async function registerPwa(){
  await removeOldServiceWorkersAndCaches();
  serviceWorkerRegistration=null;
}
async function clearOfflineCache(){
  if(!("caches" in window)){toast(tl("Cache API ບໍ່ຮອງຮັບ","不支持 Cache API"));return}
  const keys=await caches.keys();
  await Promise.all(keys.map(k=>caches.delete(k)));
  toast(tl("ລ້າງ Offline cache ແລ້ວ","离线缓存已清除"));
}

const API_URL=(window.SIGNSHOP_CONFIG?.SUPABASE_URL||"").trim();
let sessionToken=localStorage.getItem("signshop_session")||"";
const USER_CACHE_KEY="signshop_current_user";
let currentUser=(()=>{try{return JSON.parse(localStorage.getItem(USER_CACHE_KEY)||"null")}catch(_){return null}})();
let dashboardCharts={};
let html5QrScanner=null;
let activeScanTarget=null;
let availableCameras=[];
let activeCameraIndex=0;
let torchEnabled=false;
let usbScanBuffer='';
let usbScanTimer=null;
let state={products:[],categories:[],stockIn:[],stockOut:[],movements:[],stockCounts:[],users:[],auditLogs:[],backups:[]};
let realtimeSyncStarted=false;
const STOCK_COUNT_STORAGE_KEY="sanlian_stock_count_records_v1";
let stockCountRecords=[];
let editingStockCountId="";
function loadLegacyStockCountRecords(){
  try{
    const rows=JSON.parse(localStorage.getItem(STOCK_COUNT_STORAGE_KEY)||"[]");
    return Array.isArray(rows)?rows:[];
  }catch(_){return []}
}
function clearLegacyStockCountRecords(){try{localStorage.removeItem(STOCK_COUNT_STORAGE_KEY)}catch(_){}}
let auditPage=1;
let auditPageSize=10;
let categoryPage=1;
let categoryPageSize=10;
let movementPage=1;
let stockInPage=1;
let stockOutPage=1;
let stockInPageSize=10,stockOutPageSize=10;
// Pagination defaults. Product and Report rows can be changed by the user.
const PAGE_SIZE=10;
let productPage=1;
let productPageSize=10;
let reportPage=1;
let reportPageSize=10;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];


function normalizePrice(value){
  if(typeof value==="number")return Number.isFinite(value)&&value>=0?value:0;
  let raw=String(value??"").trim().replace(/\s+/g,"");
  if(!raw)return 0;
  const hasComma=raw.includes(","),hasDot=raw.includes(".");
  if(hasComma&&hasDot){
    if(raw.lastIndexOf(",")>raw.lastIndexOf("."))raw=raw.replace(/\./g,"").replace(",",".");
    else raw=raw.replace(/,/g,"");
  }else if(hasDot&&/^\d{1,3}(\.\d{3})+$/.test(raw)){
    raw=raw.replace(/\./g,"");
  }else if(hasComma){
    if(/^\d{1,3}(,\d{3})+$/.test(raw))raw=raw.replace(/,/g,"");
    else raw=raw.replace(",",".");
  }
  const n=Number(raw);
  return Number.isFinite(n)&&n>=0?n:0;
}
function formatPrice(value){
  return normalizePrice(value).toLocaleString(undefined,{maximumFractionDigits:2});
}

// v8.9: Google Sheets stores dates internally as serial numbers. Older Price
// migrations could expose those serials (for example 46223.74) as a price.
// Compare the price against the product timestamps and suppress only values that
// clearly match a timestamp serial; legitimate prices are otherwise preserved.
function localDateTextToSheetSerialV89(value){
  const m=String(value??"").trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if(!m)return NaN;
  return Date.UTC(Number(m[1]),Number(m[2])-1,Number(m[3]),Number(m[4]),Number(m[5]),Number(m[6]))/86400000+25569;
}
function normalizedProductPriceV89(product){
  const raw=firstValue(product||{},["price"],0);
  if(/^\d{4}-\d{2}-\d{2}[ T]/.test(String(raw??"").trim()))return 0;
  const n=normalizePrice(raw);
  if(n>=20000&&n<=80000){
    const tolerance=10/86400;
    for(const key of ["created_at","updated_at"]){
      const serial=localDateTextToSheetSerialV89(product?.[key]);
      if(Number.isFinite(serial)&&Math.abs(n-serial)<=tolerance)return 0;
    }
  }
  return n;
}


function upsertLocalProduct(product){
  if(!product)return;
  const list=state.products||[];
  const i=list.findIndex(x=>String(x.product_id)===String(product.product_id));
  if(i>=0)list[i]={...list[i],...product};
  else list.unshift(product);
  state.products=list;
}
function renderProductRelated(){
  renderProducts();
  metrics();
  renderReport();
  if(typeof renderCharts==="function")renderCharts();
  else if(typeof renderDashboardCharts==="function")renderDashboardCharts();
}
function setFormSaving(form,isSaving){
  if(!form)return;
  const btn=form.querySelector('button[type="submit"]');
  if(btn){
    btn.disabled=!!isSaving;
    if(isSaving){
      btn.dataset.oldText=btn.textContent;
      btn.textContent=t("ກຳລັງບັນທຶກ...");
    }else if(btn.dataset.oldText){
      btn.textContent=btn.dataset.oldText;
      delete btn.dataset.oldText;
    }
  }
}

function safeValue(value,fallback="-"){
  return value===undefined||value===null||String(value).trim()===""?fallback:value;
}
function firstValue(obj,keys,fallback=""){
  for(const key of keys){
    const value=obj?.[key];
    if(value!==undefined&&value!==null&&String(value).trim()!=="")return value;
  }
  return fallback;
}
function normalizeDateTime(value){
  const raw=safeValue(value,"");
  if(!raw)return "-";
  const d=new Date(raw);
  if(Number.isNaN(d.getTime()))return String(raw);
  return d.toLocaleString();
}
function parseFlexibleQuantity(value,fallback=0){
  if(typeof value==="number")return Number.isFinite(value)?value:fallback;
  let raw=String(value??"").trim().replace(/\s+/g,"").replace(/[−–—]/g,"-");
  if(!raw)return fallback;
  const hasComma=raw.includes(","),hasDot=raw.includes(".");
  if(hasComma&&hasDot){
    if(raw.lastIndexOf(",")>raw.lastIndexOf("."))raw=raw.replace(/\./g,"").replace(",",".");
    else raw=raw.replace(/,/g,"");
  }else if(hasComma){
    if(/^-?\d{1,3}(,\d{3})+$/.test(raw))raw=raw.replace(/,/g,"");
    else raw=raw.replace(",",".");
  }
  const n=Number(raw);
  return Number.isFinite(n)?n:fallback;
}

function normalizeBootstrap(raw){
  const next=raw||{};
  const products=(next.products||[]).map(p=>({
    ...p,
    product_id:firstValue(p,["product_id","id"]),
    barcode:String(firstValue(p,["barcode","bar_code"],"")),
    sku:String(firstValue(p,["sku","product_code"],"")),
    product_name:firstValue(p,["product_name","name","item_name"],"Unnamed"),
    category_id:firstValue(p,["category_id","category"],""),
    unit:firstValue(p,["unit"],""),
    note:firstValue(p,["note","remark","description"],""),
    price:normalizedProductPriceV89(p),
    stock_qty:parseFlexibleQuantity(firstValue(p,["stock_qty","stock","quantity"],0),0),
    minimum_stock:parseFlexibleQuantity(firstValue(p,["minimum_stock","min_stock"],0),0)
  }));
  const byId=new Map(products.map(p=>[String(p.product_id),p]));
  const byCode=new Map();
  products.forEach(p=>{
    if(p.barcode)byCode.set(String(p.barcode),p);
    if(p.sku)byCode.set(String(p.sku),p);
  });
  const normalizeTxn=(r,type="")=>{
    const productId=String(firstValue(r,["product_id","item_id"],""));
    const product=byId.get(productId)||byCode.get(String(firstValue(r,["barcode","sku"],"")));
    return {
      ...r,
      product_id:productId||product?.product_id||"",
      barcode:firstValue(r,["barcode"],product?.barcode||""),
      sku:firstValue(r,["sku"],product?.sku||""),
      category_id:firstValue(r,["category_id"],product?.category_id||""),
      transaction_time:firstValue(r,["transaction_time","created_at","date","timestamp"],""),
      movement_type:firstValue(r,["movement_type","type"],type),
      quantity:Number(firstValue(r,["quantity","qty"],0)||0),
      note:firstValue(r,["note","remark","description"],"")
    };
  };
  return {
    ...next,
    products,
    categories:(next.categories||[]).map(c=>({
      ...c,
      category_id:firstValue(c,["category_id","id"]),
      category_name:firstValue(c,["category_name","name"],"Unnamed")
    })),
    stockIn:(next.stockIn||[]).map(r=>normalizeTxn(r,"IN")),
    stockOut:(next.stockOut||[]).map(r=>normalizeTxn(r,"OUT")),
    movements:(next.movements||[]).map(r=>normalizeTxn(r,firstValue(r,["movement_type","type"],""))),
    stockCounts:(next.stockCounts||[]).filter(r=>String(firstValue(r,["is_deleted"],false)).toLowerCase()!=="true").map(r=>{
      const product=byId.get(String(firstValue(r,["product_id"],"")))||byCode.get(String(firstValue(r,["barcode","sku"],"")));
      const systemQty=Number(firstValue(r,["system_qty"],0)||0),actualQty=Number(firstValue(r,["actual_qty"],0)||0);
      const adjustedRaw=firstValue(r,["adjusted"],false);
      return {...r,id:firstValue(r,["count_id","id"],""),count_id:firstValue(r,["count_id","id"],""),created_at:firstValue(r,["count_time","created_at"],""),product_id:firstValue(r,["product_id"],product?.product_id||""),barcode:firstValue(r,["barcode"],product?.barcode||""),sku:firstValue(r,["sku"],product?.sku||""),category_id:firstValue(r,["category_id"],product?.category_id||""),product_name:product?.product_name||firstValue(r,["product_name"],""),system_qty:systemQty,actual_qty:actualQty,difference:Number(firstValue(r,["difference"],actualQty-systemQty)||0),status:String(firstValue(r,["status"],"")).toLowerCase()||stockCountStatus(systemQty,actualQty),checker:firstValue(r,["checker_username","checker"],""),adjusted:adjustedRaw===true||String(adjustedRaw).toLowerCase()==="true"};
    }),
    users:next.users||[],
    auditLogs:next.auditLogs||[],
    backups:next.backups||[]
  };
}

function setText(selector,value){
  const el=typeof selector==="string"?$(selector):selector;
  if(el) el.textContent=value==null?"":String(value);
  return el;
}

function toast(m){const t=$("#toast");if(!t){console.warn("Toast element missing:",m);return}setText(t,m);t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
function statusOf(p){if(Number(p.stock_qty)<=0)return"out";if(Number(p.stock_qty)<=Number(p.minimum_stock))return"low";return"normal"}
async function api(action,data={}){
  if(!window.SANLIAN_SUPABASE?.call)throw new Error(tl("Supabase adapter ບໍ່ໄດ້ໂຫຼດ","Supabase 适配器未加载"));
  try{return await window.SANLIAN_SUPABASE.call(action,data)}
  catch(err){throw new Error(err?.message||String(err))}
}

function hideBoot(){
 const boot=$("#bootView");
 if(boot)boot.classList.add("hidden");
}
function setAuthView(mode){
  hideBoot();
  const login=$("#loginView");
  const appView=$("#appView");
  const showAppView=mode==="app";

  document.body.classList.remove("auth-pending","auth-login","auth-app");
  document.body.classList.add(showAppView?"auth-app":"auth-login");

  if(login){
    login.hidden=showAppView;
    login.setAttribute("aria-hidden",showAppView?"true":"false");
    login.classList.toggle("hidden",showAppView);
    login.style.setProperty("display",showAppView?"none":"grid","important");
  }

  if(appView){
    appView.hidden=!showAppView;
    appView.setAttribute("aria-hidden",showAppView?"false":"true");
    appView.classList.toggle("hidden",!showAppView);
    appView.style.setProperty("display",showAppView?"grid":"none","important");
  }

  // Final defensive check after layout/style recalculation.
  requestAnimationFrame(()=>{
    if(login)login.style.setProperty("display",showAppView?"none":"grid","important");
    if(appView)appView.style.setProperty("display",showAppView?"grid":"none","important");
  });
}

function showLogin(){
  setAuthView("login");
}

function showApp(){
  setAuthView("app");
}
function applyRole(){
 const role=currentUser?.role||"Viewer";
 $$("[data-roles]").forEach(el=>{const allowed=el.dataset.roles.split(",");el.classList.toggle("hidden",!allowed.includes(role))});
 setText("#currentUserName",currentUser?.display_name||currentUser?.username||"User");
 setText("#currentUserRole",t(role));setText("#avatar",(currentUser?.display_name||"U").slice(0,2).toUpperCase());
}
async function login(username,password){
 const data=await api("login",{username,password});
 sessionToken=data.token;
 currentUser=data.user;
 localStorage.setItem("signshop_session",sessionToken);
 localStorage.setItem(USER_CACHE_KEY,JSON.stringify(currentUser));
 applyRole();
 showApp();
 try{
   await refreshAll();
   startRealtimeSync();
   checkBackendCompatibility().catch(()=>{});
 }catch(err){
   console.error("Initial refresh after login failed:",err);
   setText("#syncStatus",tl("● Offline","● 离线"));
   toast(tl("Login ສຳເລັດ ແຕ່ການ Sync ຂໍ້ມູນມີບັນຫາ","登录成功，但数据同步出现问题"));
 }
}
function isAuthenticationError(error){
 const message=String(error?.message||error||'').toLowerCase();
 return message.includes('not authenticated')||message.includes('session expired')||message.includes('user not found');
}
async function restoreSession(){
 // Supabase persists/refreshes its own session. The legacy token is only a UI hint.
 if(currentUser){
   applyRole();
   showApp();
 }
 try{
   const verifiedUser=await api("me");
   if(verifiedUser){
     currentUser=verifiedUser;
     sessionToken="supabase-session";
     localStorage.setItem("signshop_session",sessionToken);
     localStorage.setItem(USER_CACHE_KEY,JSON.stringify(currentUser));
   }
   applyRole();
   showApp();
   await refreshAll();
   startRealtimeSync();
   checkBackendCompatibility().catch(()=>{});
 }catch(e){
   console.warn("Session restore failed:",e);
   if(isAuthenticationError(e)){
     localStorage.removeItem("signshop_session");
     localStorage.removeItem(USER_CACHE_KEY);
     sessionToken="";
     currentUser=null;
     showLogin();
   }else if(currentUser && sessionToken){
     // Do not force logout for temporary API/network errors or unsupported `me`.
     applyRole();
     showApp();
     setText("#syncStatus",tl("● Offline","● 离线"));
     toast(tl("ຍັງຮັກສາການ Login ໄວ້ — ກະລຸນາກົດ Refresh ຂໍ້ມູນອີກຄັ້ງ","登录状态已保留，请再次刷新数据"));
   }else{
     showLogin();
     setText("#loginError",tl("Server connection error. Please login again.","服务器连接错误，请重新登录。"));
   }
 }
}

function startRealtimeSync(){
  if(realtimeSyncStarted||!window.SANLIAN_SUPABASE?.startRealtime)return;
  realtimeSyncStarted=true;
  window.SANLIAN_SUPABASE.startRealtime(()=>{
    if(!currentUser)return;
    refreshAll().catch(err=>console.warn("Realtime refresh failed:",err));
  });
}

async function refreshAll(){
 setText("#syncStatus",tl("● Syncing","● 同步中"));
 const d=await api("bootstrap");
 state=normalizeBootstrap(d);stockCountRecords=state.stockCounts||[];renderAll();setText("#syncStatus",tl("● Online","● 在线"))
}
function openPage(id){$$(".page").forEach(p=>p.classList.toggle("active",p.id===id));$$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"})}
function categoryName(id){return state.categories.find(c=>c.category_id===id)?.category_name||id}
function fillSelects(){
 const cats=state.categories.filter(c=>String(c.is_active)!=="false");
 ["productCategoryFilter","reportCategory"].forEach(id=>{const e=$("#"+id),v=e?.value||"";if(e){e.innerHTML=`<option value="">${t("ທຸກໝວດໝູ່")}</option>`+cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");e.value=v}});
 {
   const productCategory=$("#productForm [name=category_id]");
   if(productCategory){
     if(!productCategory.dataset.categoryBound){productCategory.addEventListener("change",()=>productCategory.dataset.selectedCategory=productCategory.value);productCategory.dataset.categoryBound="1"}
     const selectedCategory=productCategory.value||productCategory.dataset.selectedCategory||"";
     productCategory.innerHTML=cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");
     if(selectedCategory && cats.some(c=>String(c.category_id)===String(selectedCategory))){
       productCategory.value=selectedCategory;
       productCategory.dataset.selectedCategory=selectedCategory;
     }
   }
 }
 ["stockInForm","stockOutForm"].forEach(fid=>{
   const f=$("#"+fid);
   if(!f)return;

   const remembered=String(
     f.elements.category.value||
     f.elements.category.dataset.selectedCategory||
     ""
   );

   f.elements.category.innerHTML=
     `<option value="">${t("ກະລຸນາເລືອກໝວດໝູ່")}</option>`+
     cats.map(c=>`<option value="${c.category_id}">${c.category_name}</option>`).join("");

   if(remembered&&cats.some(c=>String(c.category_id)===remembered)){
     f.elements.category.value=remembered;
     f.elements.category.dataset.selectedCategory=remembered;
   }else{
     f.elements.category.value="";
     f.elements.category.dataset.selectedCategory="";
   }

   fillProducts(fid,true);
 })
  fillStockCountSelects(true);
}
function fillProducts(fid,preserveProduct=false){
 const f=$("#"+fid);
 if(!f)return;

 const cat=String(f.elements.category.value||"");
 const rememberedProduct=preserveProduct
   ? String(f.elements.productId.value||f.elements.productId.dataset.selectedProduct||"")
   : "";

 const list=cat
   ? state.products.filter(
       p=>String(p.category_id)===cat&&String(p.is_active)!=="false"
     )
   : [];

 f.elements.productId.innerHTML=
   `<option value="">${t("ກະລຸນາເລືອກອຸປະກອນ")}</option>`+
   list.map(p=>`<option value="${p.product_id}">${p.product_name}</option>`).join("");

 if(rememberedProduct&&list.some(p=>String(p.product_id)===rememberedProduct)){
   f.elements.productId.value=rememberedProduct;
   f.elements.productId.dataset.selectedProduct=rememberedProduct;
 }else{
   f.elements.productId.value="";
   f.elements.productId.dataset.selectedProduct="";
 }

 syncForm(fid);
}

function ean13CheckDigit(base12){const d=String(base12).replace(/\D/g,"").padStart(12,"0").slice(-12).split("").map(Number);const sum=d.reduce((t,n,i)=>t+n*(i%2===0?1:3),0);return(10-sum%10)%10}
function generateLocalBarcode(){
  const used=new Set((state.products||[]).map(p=>String(p.barcode||"").trim()));
  for(let attempt=0;attempt<100;attempt++){
    const timePart=String(Date.now()).slice(-7);
    const randomPart=String(Math.floor(Math.random()*100)).padStart(2,"0");
    const counterPart=String(attempt%10);
    const base=("200"+timePart+randomPart+counterPart).slice(0,12);
    const barcode=base+ean13CheckDigit(base);
    if(!used.has(barcode))return barcode;
  }
  // Extremely unlikely fallback.
  const base=("299"+String(Date.now())+String(Math.floor(Math.random()*1000000))).slice(-12);
  return base+ean13CheckDigit(base);
}

function generateLocalSku(){
  const used=new Set(state.products.map(p=>String(p.sku||"").toUpperCase()));
  let max=0;
  state.products.forEach(p=>{
    const m=String(p.sku||"").toUpperCase().match(/^SAN-(\d{6})$/);
    if(m)max=Math.max(max,Number(m[1]));
  });
  let sku;
  do{
    max++;
    sku=`SAN-${String(max).padStart(6,"0")}`;
  }while(used.has(sku));
  return sku;
}

function skuFromRpcResult(value){
  if(typeof value==="string")return value.trim();
  if(value&&typeof value==="object")return String(value.sku||value.next_sku||value.value||"").trim();
  return "";
}

async function refreshAutoSku(){
  const form=$("#productForm");
  const input=form?.elements?.sku;
  if(!input)return "";
  // Show an immediate local value, then replace it with the authoritative
  // database value. The RPC scans active + inactive products, so deleted
  // records cannot make the automatic SKU repeat.
  if(PRODUCT_ENTRY_MODES.sku!=="auto")return String(input.value||"");
  const local=generateLocalSku();
  input.value=local;
  try{
    const remote=skuFromRpcResult(await api("getNextProductSku"));
    if(remote&&PRODUCT_ENTRY_MODES.sku==="auto"&&String(form.dataset.mode||"")!=="edit")input.value=remote;
  }catch(err){
    console.warn("Next SKU RPC unavailable; using local preview. Server will still allocate a unique auto SKU on save.",err);
  }
  return String(input.value||local);
}


function syncForm(fid){
 const f=$("#"+fid);
 const p=state.products.find(x=>String(x.product_id)===String(f.elements.productId.value));
 f.elements.sku.value=p?.sku||"";
 const b=$("#"+(fid==="stockInForm"?"inBarcode":"outBarcode"));
 if(b)b.value=p?.barcode||"";
}
function metrics(){
 const total=state.products.reduce((s,p)=>s+Number(p.stock_qty||0),0),low=state.products.filter(p=>statusOf(p)==="low").length,out=state.products.filter(p=>statusOf(p)==="out").length,today=new Date().toISOString().slice(0,10);
 const ti=state.stockIn.filter(r=>String(r.transaction_time).slice(0,10)===today).reduce((s,r)=>s+Number(r.quantity||0),0),to=state.stockOut.filter(r=>String(r.transaction_time).slice(0,10)===today).reduce((s,r)=>s+Number(r.quantity||0),0);
 const items=[[t("ອຸປະກອນ"),state.products.length],[t("Stock ລວມ"),total],[t("ໃກ້ໝົດ"),low],[t("ໝົດ"),out],[tl("Stock In/Out ມື້ນີ້","今日入库/出库"),`${ti} / ${to}`]];
 $("#dashboardMetrics").innerHTML=items.map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 $("#productMetrics").innerHTML=items.slice(0,4).map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("")
}
function filteredProducts(report=false){const q=report?"":$("#productSearch").value.toLowerCase(),cat=$(report?"#reportCategory":"#productCategoryFilter").value,status=$(report?"#reportStatus":"#productStatusFilter").value;return state.products.filter(p=>(!q||`${p.barcode} ${p.sku} ${p.product_name}`.toLowerCase().includes(q))&&(!cat||p.category_id===cat)&&(!status||statusOf(p)===status))}
function formatProductPrice(value){
 const n=Number(value);
 if(!Number.isFinite(n))return "0";
 const fixed=Math.round(n*100)/100;
 const parts=String(fixed).split(".");
 const integer=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,".");
 return parts.length>1?`${integer},${parts[1]}`:integer;
}

function renderProducts(){
 const list=filteredProducts();
 const totalPages=Math.max(1,Math.ceil(list.length/productPageSize));
 productPage=Math.min(Math.max(1,productPage),totalPages);
 const startIndex=(productPage-1)*productPageSize;
 const pageRows=list.slice(startIndex,startIndex+productPageSize);

 $("#productBody").innerHTML=pageRows.length?pageRows.map((p,i)=>`<tr>
 <td>${startIndex+i+1}</td><td>${safeValue(p.barcode)}</td><td>${safeValue(categoryName(p.category_id))}</td>
 <td>${safeValue(p.product_name)}</td><td>${safeValue(p.sku)}</td>
 <td>${safeValue(p.note)}</td><td><strong>${formatProductPrice(p.price)}</strong></td>
 <td><strong>${Number(p.stock_qty||0)}</strong></td>
 <td><span class="badge ${statusOf(p)}">${t(statusOf(p)==="out"?"ໝົດ":statusOf(p)==="low"?"ໃກ້ໝົດ":"ປົກກະຕິ")}</span></td>
 <td><button class="mini qr-button" data-show-qr="${p.product_id}">QR</button></td>
 <td>${currentUser?.role==="Admin"||currentUser?.role==="Manager"?`<div class="action-row"><button class="mini" data-edit-product="${p.product_id}">${t("Edit")}</button><button class="mini" data-delete-product="${p.product_id}">${t("Delete")}</button></div>`:"-"}</td></tr>`).join(""):`<tr><td colspan="11" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;

 paintPagination("product",productPage,list.length,productPageSize);
}




function stockHistoryFiltered(type){
 const list=type==="IN"?(state.stockIn||[]):(state.stockOut||[]);
 const prefix=type==="IN"?"stockIn":"stockOut";
 const q=String($("#"+prefix+"Search")?.value||"").trim().toLowerCase();
 if(!q)return list;
 return list.filter(r=>{
   const p=state.products.find(x=>String(x.product_id)===String(r.product_id));
   return [r.barcode,p?.barcode,r.sku,p?.sku,r.product_name,p?.product_name,r.note,r.transaction_time].some(v=>String(v||"").toLowerCase().includes(q));
 });
}
function renderStock(){
 const row=(r,type)=>{
   const p=state.products.find(x=>String(x.product_id)===String(r.product_id));
   const id=safeValue(r[type==="IN"?"stock_in_id":"stock_out_id"]);
   return`<tr><td>${id}</td><td>${normalizeDateTime(r.transaction_time)}</td><td>${safeValue(r.barcode||p?.barcode)}</td><td>${safeValue(p?.product_name||r.product_name||r.product_id)}</td><td>${safeValue(r.sku||p?.sku)}</td><td>${Number(r.quantity||0)}</td><td>${safeValue(r.note)}</td><td>${["Admin","Manager"].includes(currentUser?.role)?`<button class="mini" data-delete-stock="${type}:${id}">${t("Delete")}</button>`:"-"}</td></tr>`;
 };
 const inList=stockHistoryFiltered("IN"),outList=stockHistoryFiltered("OUT");
 const inPages=Math.max(1,Math.ceil(inList.length/stockInPageSize)),outPages=Math.max(1,Math.ceil(outList.length/stockOutPageSize));
 stockInPage=Math.min(Math.max(1,stockInPage),inPages);stockOutPage=Math.min(Math.max(1,stockOutPage),outPages);
 const inRows=inList.slice((stockInPage-1)*stockInPageSize,stockInPage*stockInPageSize);
 const outRows=outList.slice((stockOutPage-1)*stockOutPageSize,stockOutPage*stockOutPageSize);
 $("#stockInBody").innerHTML=inRows.length?inRows.map(r=>row(r,"IN")).join(""):`<tr><td colspan="8" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 $("#stockOutBody").innerHTML=outRows.length?outRows.map(r=>row(r,"OUT")).join(""):`<tr><td colspan="8" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 paintPagination("stockIn",stockInPage,inList.length,stockInPageSize);paintPagination("stockOut",stockOutPage,outList.length,stockOutPageSize);
}
function renderCategories(){
 const list=state.categories||[];
 const totalPages=Math.max(1,Math.ceil(list.length/categoryPageSize));
 categoryPage=Math.min(Math.max(1,categoryPage),totalPages);
 const startIndex=(categoryPage-1)*categoryPageSize;
 const pageRows=list.slice(startIndex,startIndex+categoryPageSize);
 $("#categoryBody").innerHTML=pageRows.length?pageRows.map((c,i)=>`<tr><td>${startIndex+i+1}</td><td>${c.category_id}</td><td>${c.category_name}</td><td>${state.products.filter(p=>p.category_id===c.category_id).length}</td><td><div class="action-row"><button class="mini" data-edit-category="${c.category_id}">${t("Edit")}</button><button class="mini" data-delete-category="${c.category_id}">${t("Delete")}</button></div></td></tr>`).join(""):`<tr><td colspan="5" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 paintPagination("category",categoryPage,list.length,categoryPageSize);
}
function buildPaginationNumbers(current,totalPages){
 const pages=[];
 if(totalPages<=7){for(let i=1;i<=totalPages;i++)pages.push(i)}
 else{
   pages.push(1);
   if(current>4)pages.push("...");
   const from=Math.max(2,current-1),to=Math.min(totalPages-1,current+1);
   for(let i=from;i<=to;i++)pages.push(i);
   if(current<totalPages-3)pages.push("...");
   pages.push(totalPages);
 }
 return pages;
}
function paintPagination(prefix,current,totalItems,pageSize=PAGE_SIZE){
 const size=Math.max(1,Number(pageSize)||PAGE_SIZE);
 const totalPages=Math.max(1,Math.ceil(totalItems/size));
 const start=totalItems?(current-1)*size+1:0;
 const end=Math.min(current*size,totalItems);
 const summary=$("#"+prefix+"PageSummary"),numbers=$("#"+prefix+"PageNumbers");
 if(summary)summary.textContent=totalItems?tFormat("ສະແດງ {start}-{end} ຈາກ {total} ລາຍການ","显示第 {start}-{end} 条，共 {total} 条",{start,end,total:totalItems}):t("ບໍ່ພົບລາຍການ");
 if(numbers){
   numbers.innerHTML=buildPaginationNumbers(current,totalPages).map(x=>x==='...'?'<span class="pagination-dots">…</span>':`<button class="pagination-number ${x===current?'active':''}" data-page="${x}">${x}</button>`).join('');
 }
 const first=$("#"+prefix+"FirstBtn"),prev=$("#"+prefix+"PrevBtn"),next=$("#"+prefix+"NextBtn"),last=$("#"+prefix+"LastBtn");
 if(first)first.disabled=current<=1;if(prev)prev.disabled=current<=1;if(next)next.disabled=current>=totalPages;if(last)last.disabled=current>=totalPages;
 return totalPages;
}
function renderReport(){
 const list=filteredProducts(true),ins=state.stockIn.filter(r=>reportPeriodMatch(r.transaction_time)),outs=state.stockOut.filter(r=>reportPeriodMatch(r.transaction_time)),sum=(rows,id)=>rows.filter(r=>String(r.product_id)===String(id)).reduce((s,r)=>s+Number(r.quantity||0),0);
 const totalPages=Math.max(1,Math.ceil(list.length/reportPageSize));reportPage=Math.min(Math.max(1,reportPage),totalPages);
 const pageRows=list.slice((reportPage-1)*reportPageSize,reportPage*reportPageSize);
 $("#reportBody").innerHTML=pageRows.length?pageRows.map(p=>`<tr><td>${safeValue(p.barcode)}</td><td>${safeValue(categoryName(p.category_id))}</td><td>${safeValue(p.product_name)}</td><td>${safeValue(p.sku)}</td><td>${safeValue(p.note)}</td><td><strong>${formatProductPrice(p.price)}</strong></td><td>${safeValue(p.unit)}</td><td>${Number(p.stock_qty||0)}</td><td>${Number(p.minimum_stock||0)}</td><td>${sum(ins,p.product_id)}</td><td>${sum(outs,p.product_id)}</td><td><span class="badge ${statusOf(p)}">${t(statusOf(p)==="out"?"ໝົດ":statusOf(p)==="low"?"ໃກ້ໝົດ":"ປົກກະຕິ")}</span></td></tr>`).join(""):`<tr><td colspan="12" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 paintPagination('report',reportPage,list.length,reportPageSize);
 const stock=list.reduce((s,p)=>s+Number(p.stock_qty||0),0);
 const tin=ins.reduce((s,r)=>s+Number(r.quantity||0),0);
 const tout=outs.reduce((s,r)=>s+Number(r.quantity||0),0);
 $("#reportCards").innerHTML=[[t("ລາຍການ"),list.length],[t("Stock ລວມ"),stock],[t("Stock In"),tin],[t("Stock Out"),tout]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 setText("#reportSummary",tFormat("ລວມ {count} ລາຍການ | Stock {stock} | ນຳເຂົ້າ {tin} | ເບີກອອກ {tout}","共 {count} 项 | 库存 {stock} | 入库 {tin} | 出库 {tout}",{count:list.length,stock,tin,tout}))
}
function renderUsers(){
 const body=$("#userBody"); if(!body)return;
 body.innerHTML=(state.users||[]).map(u=>{
   const active=String(u.is_active).toLowerCase()!=="false";
   return `<tr><td>${u.user_id||""}</td><td>${u.username||""}</td><td>${u.display_name||""}</td><td>${t(u.role||"")}</td><td>${t(active?"Active":"Disabled")}</td><td class="row-actions"><button class="secondary" data-edit-user="${u.user_id}" >${t("Edit")}</button><button class="secondary" data-reset-user="${u.user_id}">${t("Password")}</button><button class="${active?"danger":"primary"}" data-toggle-user="${u.user_id}" data-active="${active?"false":"true"}">${t(active?"Disable":"Enable")}</button></td></tr>`;
 }).join("");
}

function escapeStockCountHtml(value){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function stockCountStatus(systemQty,actualQty){
 if(actualQty===""||actualQty===null||actualQty===undefined)return"uncounted";
 const diff=Number(actualQty)-Number(systemQty||0);
 return diff===0?"matched":diff<0?"shortage":"excess";
}
function stockCountStatusLabel(status){return status==="matched"?t("ກົງກັນ"):status==="shortage"?t("ຂາດ"):status==="excess"?t("ເກີນ"):t("ຍັງບໍ່ໄດ້ກວດ")}
function stockCountReasonLabel(code){
 const labels={damaged:tl("ສິນຄ້າເສຍຫາຍ","商品损坏"),lost:tl("ສູນເສຍ/ຫາຍ","丢失"),unrecorded_in:tl("ນຳເຂົ້າບໍ່ໄດ້ບັນທຶກ","未登记入库"),unrecorded_out:tl("ເບີກອອກບໍ່ໄດ້ບັນທຶກ","未登记出库"),count_error:tl("ນັບຜິດ","计数错误"),other:tl("ອື່ນໆ","其他")};
 return labels[code]||"-";
}
function fillStockCountSelects(preserveProduct=true){
 const f=$("#stockCountForm");if(!f)return;
 const cats=(state.categories||[]).filter(c=>String(c.is_active)!=="false");
 const rememberedCategory=String(f.elements.category.value||f.elements.category.dataset.selectedCategory||"");
 const rememberedProduct=preserveProduct?String(f.elements.productId.value||f.elements.productId.dataset.selectedProduct||""):"";
 f.elements.category.innerHTML=`<option value="">${t("ກະລຸນາເລືອກໝວດໝູ່")}</option>`+cats.map(c=>`<option value="${escapeStockCountHtml(c.category_id)}">${escapeStockCountHtml(c.category_name)}</option>`).join("");
 if(rememberedCategory&&cats.some(c=>String(c.category_id)===rememberedCategory)){f.elements.category.value=rememberedCategory;f.elements.category.dataset.selectedCategory=rememberedCategory}
 const cat=String(f.elements.category.value||"");
 const products=cat?(state.products||[]).filter(p=>String(p.category_id)===cat&&String(p.is_active)!=="false"):[];
 f.elements.productId.innerHTML=`<option value="">${t("ກະລຸນາເລືອກອຸປະກອນ")}</option>`+products.map(p=>`<option value="${escapeStockCountHtml(p.product_id)}">${escapeStockCountHtml(p.product_name)}</option>`).join("");
 if(rememberedProduct&&products.some(p=>String(p.product_id)===rememberedProduct)){f.elements.productId.value=rememberedProduct;f.elements.productId.dataset.selectedProduct=rememberedProduct}
 syncStockCountForm();
}
function selectStockCountProduct(p){
 const f=$("#stockCountForm");if(!f||!p)return;
 f.elements.category.value=String(p.category_id||"");f.elements.category.dataset.selectedCategory=String(p.category_id||"");
 fillStockCountSelects(false);f.elements.productId.value=String(p.product_id||"");f.elements.productId.dataset.selectedProduct=String(p.product_id||"");syncStockCountForm();$("#countActualQty")?.focus();
}
function syncStockCountForm(){
 const f=$("#stockCountForm");if(!f)return;
 const p=(state.products||[]).find(x=>String(x.product_id)===String(f.elements.productId.value));
 f.elements.sku.value=p?.sku||"";f.elements.systemQty.value=p?Number(p.stock_qty||0):"";
 const barcode=$("#countBarcode");if(barcode&&p)barcode.value=p.barcode||"";
 f.elements.checker.value=currentUser?.display_name||currentUser?.username||"";
 if(f.elements.countTime)f.elements.countTime.value=new Date().toLocaleString(currentLanguage==="zh"?"zh-CN":"lo-LA");
 updateStockCountPreview();
}
function updateStockCountPreview(){
 const f=$("#stockCountForm");if(!f)return;
 const systemRaw=f.elements.systemQty.value,actualRaw=f.elements.actualQty.value,diffEl=f.elements.difference,badge=$("#stockCountStatusBadge");
 if(systemRaw===""||actualRaw===""){if(diffEl)diffEl.value="";if(badge){badge.className="count-status-pill uncounted";badge.textContent=stockCountStatusLabel("uncounted")}f.elements.reason.required=false;return}
 const diff=Number(actualRaw)-Number(systemRaw);if(diffEl)diffEl.value=diff>0?`+${diff}`:String(diff);
 const status=stockCountStatus(systemRaw,actualRaw);if(badge){badge.className=`count-status-pill ${status}`;badge.textContent=stockCountStatusLabel(status)}f.elements.reason.required=diff!==0;
}
function setStockCountEditUi(editing){
 const f=$("#stockCountForm");if(!f)return;
 const cancelBtn=$("#stockCountCancelEditBtn"),submitText=$("#stockCountSubmitText"),scan=$("#countBarcode");
 if(cancelBtn)cancelBtn.hidden=!editing;
 if(submitText)submitText.textContent=editing?t("ບັນທຶກການແກ້ໄຂ"):t("ບັນທຶກຜົນກວດ");
 if(f.elements.category)f.elements.category.disabled=editing;
 if(f.elements.productId)f.elements.productId.disabled=editing;
 if(scan)scan.disabled=editing;
 document.querySelectorAll('[data-scan-target="countBarcode"]').forEach(btn=>btn.disabled=editing);
}
function resetStockCountForm(){
 const f=$("#stockCountForm");if(!f)return;
 editingStockCountId="";
 setStockCountEditUi(false);
 f.reset();f.elements.category.dataset.selectedCategory="";f.elements.productId.dataset.selectedProduct="";$("#countBarcode").value="";fillStockCountSelects(false);f.elements.checker.value=currentUser?.display_name||currentUser?.username||"";f.elements.countTime.value=new Date().toLocaleString(currentLanguage==="zh"?"zh-CN":"lo-LA");updateStockCountPreview();setTimeout(()=>$("#countBarcode")?.focus(),50);
}
function stockCountSearchRows(){const q=String($("#stockCountSearch")?.value||"").trim().toLowerCase();return stockCountRecords.filter(r=>!q||`${r.barcode} ${r.sku} ${r.product_name} ${r.checker} ${stockCountReasonLabel(r.reason)} ${r.note}`.toLowerCase().includes(q))}
function renderStockCount(){
 const body=$("#stockCountBody");if(!body)return;const rows=stockCountSearchRows();
 body.innerHTML=rows.length?rows.slice(0,250).map(r=>{
   const id=String(r.count_id||r.id||""),diff=Number(r.difference||0),status=r.status||stockCountStatus(r.system_qty,r.actual_qty),diffText=diff>0?`+${diff}`:String(diff);
   const isAdmin=currentUser?.role==="Admin",canManage=isAdmin&&!r.adjusted&&Boolean(id),canAdjust=canManage&&diff!==0;
   let action='<span class="muted-dash">—</span>';
   if(r.adjusted){action=`<span class="count-adjusted">${t("ປັບແລ້ວ")}</span>`}
   else if(canManage){action=`<div class="count-action-group">${canAdjust?`<button type="button" class="mini count-adjust-btn" data-adjust-count="${escapeStockCountHtml(id)}">${t("ປັບສະຕ໋ອກ")}</button>`:""}<button type="button" class="mini secondary count-edit-btn" data-edit-count="${escapeStockCountHtml(id)}">${t("Edit")}</button><button type="button" class="mini danger count-delete-btn" data-delete-count="${escapeStockCountHtml(id)}">${t("Delete")}</button></div>`}
   return `<tr class="count-row ${status}"><td>${escapeStockCountHtml(normalizeDateTime(r.created_at))}</td><td>${escapeStockCountHtml(r.barcode||"-")}</td><td>${escapeStockCountHtml(r.product_name||"-")}</td><td>${escapeStockCountHtml(r.sku||"-")}</td><td>${Number(r.system_qty||0)}</td><td>${Number(r.actual_qty||0)}</td><td class="count-diff ${status}">${escapeStockCountHtml(diffText)}</td><td><span class="count-status-pill ${status}">${escapeStockCountHtml(stockCountStatusLabel(status))}</span></td><td>${escapeStockCountHtml(diff===0?"-":stockCountReasonLabel(r.reason))}</td><td>${escapeStockCountHtml(r.checker||"-")}</td><td>${action}</td></tr>`
 }).join(""):`<tr><td colspan="11" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 const total=stockCountRecords.length,matched=stockCountRecords.filter(r=>r.status==="matched").length,shortage=stockCountRecords.filter(r=>r.status==="shortage").length,excess=stockCountRecords.filter(r=>r.status==="excess").length,metrics=$("#stockCountMetrics");
 if(metrics)metrics.innerHTML=[[t("ລາຍການກວດ"),total],[t("ກົງ"),matched],[t("ຈຳນວນຂາດ"),shortage],[t("ຈຳນວນເກີນ"),excess]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
 const f=$("#stockCountForm");if(f&&!editingStockCountId&&document.activeElement!==f.elements.actualQty)syncStockCountForm();
 if(editingStockCountId)setStockCountEditUi(true);
}
function editStockCountRecord(id){
 if(currentUser?.role!=="Admin"){toast(t("ສະເພາະ Admin ເທົ່ານັ້ນ"));return}
 const r=stockCountRecords.find(x=>String(x.count_id||x.id)===String(id));if(!r)return;
 if(r.adjusted){toast(tl("ລາຍການນີ້ປັບ Stock ແລ້ວ ບໍ່ສາມາດແກ້ໄຂ","该盘点已调整库存，不能编辑"));return}
 const product=(state.products||[]).find(p=>String(p.product_id)===String(r.product_id));if(!product){toast(tl("ບໍ່ພົບອຸປະກອນ","未找到设备"));return}
 editingStockCountId=String(r.count_id||r.id);
 const f=$("#stockCountForm");
 setStockCountEditUi(false);
 f.elements.category.value=String(product.category_id||r.category_id||"");f.elements.category.dataset.selectedCategory=f.elements.category.value;
 fillStockCountSelects(false);
 f.elements.productId.value=String(product.product_id||"");f.elements.productId.dataset.selectedProduct=f.elements.productId.value;
 f.elements.sku.value=r.sku||product.sku||"";f.elements.systemQty.value=Number(r.system_qty||0);f.elements.actualQty.value=Number(r.actual_qty||0);
 f.elements.reason.value=String(r.reason||"");f.elements.note.value=String(r.note||"");f.elements.checker.value=r.checker||r.checker_username||"";f.elements.countTime.value=normalizeDateTime(r.created_at||r.count_time||"");
 $("#countBarcode").value=r.barcode||product.barcode||"";
 setStockCountEditUi(true);updateStockCountPreview();
 $("#stockCountForm")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>f.elements.actualQty?.focus(),250);
}
async function deleteStockCountRecord(id){
 if(currentUser?.role!=="Admin"){toast(t("ສະເພາະ Admin ເທົ່ານັ້ນ"));return}
 const r=stockCountRecords.find(x=>String(x.count_id||x.id)===String(id));if(!r)return;
 if(r.adjusted){toast(tl("ລາຍການນີ້ປັບ Stock ແລ້ວ ບໍ່ສາມາດລຶບ","该盘点已调整库存，不能删除"));return}
 const msg=tFormat("ຢືນຢັນລຶບຜົນກວດ {name}?","确认删除 {name} 的盘点记录？",{name:r.product_name||r.sku||r.barcode||""});if(!confirm(msg))return;
 try{
  toast(tl("ກຳລັງລຶບລາຍການກວດ...","正在删除盘点记录..."));
  await api("deleteStockCount",{count_id:id});
  // Remove the deleted row immediately from local state so the UI never leaves a stale record visible.
  stockCountRecords=(stockCountRecords||[]).filter(x=>String(x.count_id||x.id)!==String(id));
  state.stockCounts=(state.stockCounts||[]).filter(x=>String(x.count_id||x.id)!==String(id));
  if(editingStockCountId===String(id))resetStockCountForm();
  renderStockCount();
  // Sync from server, but keep the successful local deletion even if refresh temporarily fails.
  try{await refreshAll()}catch(syncErr){console.warn("Refresh after stock-count delete failed:",syncErr)}
  renderStockCount();
  toast(tl("ລຶບລາຍການກວດສຳເລັດ","盘点记录已删除"));
 }catch(err){toast(tl("ລຶບລາຍການກວດບໍ່ສຳເລັດ: ","删除盘点记录失败：")+err.message)}
}
async function adjustStockCountRecord(id){
 if(currentUser?.role!=="Admin"){toast(t("ສະເພາະ Admin ເທົ່ານັ້ນ"));return}
 const record=stockCountRecords.find(r=>String(r.count_id||r.id)===String(id));if(!record||record.adjusted)return;
 const product=(state.products||[]).find(p=>String(p.product_id)===String(record.product_id));if(!product){toast(tl("ບໍ່ພົບອຸປະກອນ","未找到设备"));return}
 const currentQty=Number(product.stock_qty||0);if(currentQty!==Number(record.system_qty||0)){toast(tl("Stock ປ່ຽນໄປແລ້ວ ກະລຸນາກວດສະຕ໋ອກໃໝ່ກ່ອນປັບ","库存已发生变化，请重新盘点后再调整"));return}
 const diff=Number(record.difference||0);if(!diff)return;
 const msg=tFormat("ຢືນຢັນປັບ Stock {name} ຈາກ {old} ເປັນ {next}?","确认将 {name} 的库存从 {old} 调整为 {next}？",{name:record.product_name,old:record.system_qty,next:record.actual_qty});if(!confirm(msg))return;
 try{toast(tl("ກຳລັງປັບສະຕ໋ອກ...","正在调整库存..."));await api("adjustStockCount",{count_id:record.count_id||record.id});if(editingStockCountId===String(id))resetStockCountForm();await refreshAll();renderStockCount();toast(tl("ປັບສະຕ໋ອກສຳເລັດ","库存调整成功"))}catch(err){toast(tl("ປັບສະຕ໋ອກບໍ່ສຳເລັດ: ","库存调整失败：")+err.message)}
}

function renderAll(){
 const jobs=[
  ["fillSelects",fillSelects],["metrics",metrics],["renderProducts",renderProducts],
  ["renderStock",renderStock],["renderStockCount",renderStockCount],
  ["renderCategories",renderCategories],["renderReport",renderReport],
  ["renderUsers",renderUsers],
  ["renderDashboardCharts",renderDashboardCharts],
  ["renderAudit",renderAudit],
  ["renderBackups",renderBackups],["applyRole",applyRole]
 ];
 jobs.forEach(([name,fn])=>{try{fn()}catch(err){console.error("Render error:",name,err)}});
 setTimeout(renderStaticTranslations,0);
}


function findProductByCode(value){
 const code=String(value||"").trim();
 return state.products.find(p=>String(p.barcode)===code||String(p.sku)===code||String(p.product_id)===code);
}

let scanAudioContext=null;

function playScanSound(success=true){
  try{
    const AudioCtx=window.AudioContext||window.webkitAudioContext;
    if(!AudioCtx)return;

    if(!scanAudioContext)scanAudioContext=new AudioCtx();
    if(scanAudioContext.state==="suspended")scanAudioContext.resume();

    const now=scanAudioContext.currentTime;
    const gain=scanAudioContext.createGain();
    gain.connect(scanAudioContext.destination);

    gain.gain.setValueAtTime(0.0001,now);
    gain.gain.exponentialRampToValueAtTime(0.22,now+0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001,now+(success?0.16:0.28));

    const osc=scanAudioContext.createOscillator();
    osc.type=success?"sine":"square";
    osc.frequency.setValueAtTime(success?1150:300,now);

    if(success){
      osc.frequency.exponentialRampToValueAtTime(1650,now+0.12);
    }else{
      osc.frequency.setValueAtTime(300,now);
      osc.frequency.setValueAtTime(220,now+0.14);
    }

    osc.connect(gain);
    osc.start(now);
    osc.stop(now+(success?0.17:0.29));

    if(navigator.vibrate){
      navigator.vibrate(success?45:[70,45,70]);
    }
  }catch(err){
    console.warn("Scanner sound unavailable:",err);
  }
}

// Unlock mobile audio after the first user interaction.
["pointerdown","touchstart","keydown"].forEach(eventName=>{
  document.addEventListener(eventName,()=>{
    try{
      const AudioCtx=window.AudioContext||window.webkitAudioContext;
      if(!AudioCtx)return;
      if(!scanAudioContext)scanAudioContext=new AudioCtx();
      if(scanAudioContext.state==="suspended")scanAudioContext.resume();
    }catch(_){}
  },{once:true,passive:true});
});

function applyScannedCode(value,targetId){
 const input=$("#"+targetId);
 if(!input)return;
 input.value=String(value||"").trim();
 const p=findProductByCode(input.value);
 if(!p){playScanSound(false);toast(t("ບໍ່ພົບ Barcode / QR Code ນີ້"));return}
 playScanSound(true);
 if(targetId==="countBarcode"){
   selectStockCountProduct(p);
   toast(tFormat("ພົບ: {name}","已找到：{name}",{name:p.product_name}));
   return;
 }
 const formId=targetId==="inBarcode"?"stockInForm":"stockOutForm";
 const f=$("#"+formId);
 f.elements.category.value=p.category_id;
 fillProducts(formId);
 f.elements.productId.value=p.product_id;
 syncForm(formId);
 toast(tFormat("ພົບ: {name}","已找到：{name}",{name:p.product_name}));
}
async function openScanner(targetId){
 activeScanTarget=targetId;
 $("#scannerModal").classList.add("open");
 setText("#scannerHint",t("ກຳລັງເປີດກ້ອງ..."));
 try{
   availableCameras=await Html5Qrcode.getCameras();
   if(!availableCameras.length)throw new Error(tl("ບໍ່ພົບກ້ອງ","未找到摄像头"));
   const select=$("#cameraSelect");
   select.innerHTML=availableCameras.map((c,i)=>`<option value="${i}">${c.label||`Camera ${i+1}`}</option>`).join("");
   activeCameraIndex=Math.min(activeCameraIndex,availableCameras.length-1);
   select.value=String(activeCameraIndex);
   await startScannerCamera();
 }catch(err){
   setText("#scannerHint",tl("ບໍ່ສາມາດເປີດກ້ອງ: ","无法打开摄像头：")+err.message);
 }
}
async function startScannerCamera(){
 if(html5QrScanner){
   try{await html5QrScanner.stop()}catch(e){}
   try{await html5QrScanner.clear()}catch(e){}
 }
 html5QrScanner=new Html5Qrcode("qrReader");
 const camera=availableCameras[activeCameraIndex]?.id;
 if(!camera)return;
 setText("#scannerHint",t("ຈັດວາງ Barcode ຫຼື QR Code ໃຫ້ຢູ່ກາງກ້ອງ"));
 await html5QrScanner.start(
   camera,
   {fps:10,qrbox:{width:280,height:180},aspectRatio:1.777778},
   async decodedText=>{
     applyScannedCode(decodedText,activeScanTarget);
     await closeScanner();
   },
   ()=>{}
 );
}
async function closeScanner(){
 if(html5QrScanner){
   try{await html5QrScanner.stop()}catch(e){}
   try{await html5QrScanner.clear()}catch(e){}
   html5QrScanner=null;
 }
 $("#scannerModal").classList.remove("open");
 activeScanTarget=null;
}
async function toggleTorch(){
 if(!html5QrScanner)return;
 torchEnabled=!torchEnabled;
 try{
   await html5QrScanner.applyVideoConstraints({advanced:[{torch:torchEnabled}]});
   setText("#torchBtn",torchEnabled?tl("🔦 Flash ON","🔦 闪光灯开启"):tl("🔦 Flash","🔦 闪光灯"));
  }catch(e){toast(t("ກ້ອງນີ້ບໍ່ຮອງຮັບ Flash"))}
}
function setupUsbScanner(){
 document.addEventListener("keydown",e=>{
   const tag=document.activeElement?.tagName;
   const editable=["INPUT","TEXTAREA","SELECT"].includes(tag);
   if(editable)return;
   if(e.key==="Enter"){
     if(usbScanBuffer.length>=4){
       const page=$(".page.active")?.id;
       const target=page==="stock-out"?"outBarcode":page==="stock-count"?"countBarcode":"inBarcode";
       applyScannedCode(usbScanBuffer,target);
       openPage(page==="stock-out"?"stock-out":page==="stock-count"?"stock-count":"stock-in");
     }
     usbScanBuffer="";
     return;
   }
   if(typeof e.key==="string" && e.key.length===1){
     usbScanBuffer+=e.key;
     clearTimeout(usbScanTimer);
     usbScanTimer=setTimeout(()=>usbScanBuffer="",120);
   }
 });
}
function showProductQr(productId){
 const p=state.products.find(x=>x.product_id===productId);if(!p)return;
 const payload=p.barcode||p.sku||p.product_id;
 $("#qrPreview").innerHTML="";
 const img=document.createElement("img");
 img.alt="QR Code";
 img.src=`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(payload)}`;
 $("#qrPreview").appendChild(img);
 $("#qrProductInfo").innerHTML=`<strong>${p.product_name}</strong><br>Barcode: ${p.barcode}<br>SKU: ${p.sku}<br>${tl("ໝວດໝູ່","类别")}: ${categoryName(p.category_id)}`;
 $("#qrModal").dataset.productId=p.product_id;
 $("#qrModal").classList.add("open");
}

function parseDateKey(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString().slice(0,10)}
function countInactiveProducts(days){const limit=Date.now()-days*86400000,ids=new Set(state.movements.filter(m=>new Date(m.transaction_time).getTime()>=limit).map(m=>m.product_id));return state.products.filter(p=>!ids.has(p.product_id)).length}
function destroyChart(n){if(dashboardCharts[n]){dashboardCharts[n].destroy();delete dashboardCharts[n]}}
function makeChart(n,id,c){destroyChart(n);const el=$("#"+id);if(el&&window.Chart)dashboardCharts[n]=new Chart(el,c)}
function renderDashboardCharts(){
 if(!window.Chart)return;const days=Number($("#dashboardPeriod")?.value||30),end=new Date();end.setHours(0,0,0,0);const start=new Date(end);start.setDate(start.getDate()-days+1);
 const labels=[],ins={},outs={};for(let i=0;i<days;i++){const d=new Date(start);d.setDate(start.getDate()+i);const k=d.toISOString().slice(0,10);labels.push(k);ins[k]=0;outs[k]=0}
 state.stockIn.forEach(r=>{const k=parseDateKey(r.transaction_time);if(k in ins)ins[k]+=Number(r.quantity||0)});state.stockOut.forEach(r=>{const k=parseDateKey(r.transaction_time);if(k in outs)outs[k]+=Number(r.quantity||0)});
 makeChart("trend","movementTrendChart",{type:"line",data:{labels,datasets:[{label:t("Stock In"),data:labels.map(k=>ins[k]),tension:.25},{label:t("Stock Out"),data:labels.map(k=>outs[k]),tension:.25}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}});
 const cl=state.categories.map(c=>c.category_name),cv=state.categories.map(c=>state.products.filter(p=>p.category_id===c.category_id).reduce((s,p)=>s+Number(p.stock_qty||0),0));
 const categoryTotalStock=cv.reduce((s,n)=>s+Number(n||0),0);
 const categoryInfo=$("#categoryStockInfo");
 const paintCategoryInfo=(index)=>{
   if(!categoryInfo)return;
   if(index===null||index===undefined||index<0||index>=state.categories.length){
     categoryInfo.innerHTML=`<div class="category-chart-hint">${tl("ກົດສີ","点击色块")}</div><strong>${tl("ເບິ່ງລາຍລະອຽດ","查看分类详情")}</strong><span>${tl("ເລືອກສີໃນວົງກາຟ","选择图表中的色块")}</span>`;
     return;
   }
   const cat=state.categories[index];
   const qty=Number(cv[index]||0);
   const productCount=state.products.filter(p=>String(p.category_id)===String(cat.category_id)&&String(p.is_active)!=="false").length;
   const pct=categoryTotalStock>0?(qty/categoryTotalStock*100):0;
   categoryInfo.innerHTML=`<div class="category-chart-hint">${tl("ໝວດໝູ່","类别")}</div><strong title="${escapeStockCountHtml(cat.category_name||"")}">${escapeStockCountHtml(cat.category_name||"-")}</strong><div class="category-chart-value">${qty.toLocaleString()}</div><div class="category-chart-meta">${tl("ສະຕ໋ອກ","库存")}: ${qty.toLocaleString()} · ${tl("ສິນຄ້າ","商品")}: ${productCount}</div><div class="category-chart-meta">${pct.toFixed(1)}%</div>`;
 };
 paintCategoryInfo(null);
 makeChart("category","categoryStockChart",{type:"doughnut",data:{labels:cl,datasets:[{data:cv}]},options:{responsive:true,maintainAspectRatio:false,cutout:"58%",plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>{const value=Number(ctx.raw||0),pct=categoryTotalStock>0?(value/categoryTotalStock*100):0;return ` ${ctx.label}: ${value.toLocaleString()} (${pct.toFixed(1)}%)`;}}}},onClick:(event,elements)=>{if(elements&&elements.length)paintCategoryInfo(elements[0].index);}}});
 const agg=rows=>{const m={};rows.forEach(r=>m[r.product_id]=(m[r.product_id]||0)+Number(r.quantity||0));return Object.entries(m).map(([id,qty])=>({name:state.products.find(p=>p.product_id===id)?.product_name||id,qty})).sort((a,b)=>b.qty-a.qty).slice(0,10)};
 const a=agg(state.stockOut),b=agg(state.stockIn);
 makeChart("topout","topOutChart",{type:"bar",data:{labels:a.map(x=>x.name),datasets:[{data:a.map(x=>x.qty)}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
 makeChart("topin","topInChart",{type:"bar",data:{labels:b.map(x=>x.name),datasets:[{data:b.map(x=>x.qty)}]},options:{indexAxis:"y",responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}}}});
}
function reportPeriodMatch(t){
 const type=$("#reportRangeType")?.value||"all";if(type==="all")return true;const d=new Date(t);if(Number.isNaN(d.getTime()))return false;
 if(type==="day"){const v=$("#reportDate").value;return !v||d.toISOString().slice(0,10)===v}
 if(type==="month"){const v=$("#reportMonth").value;return !v||d.toISOString().slice(0,7)===v}
 if(type==="year"){const v=$("#reportYear").value;return !v||String(d.getFullYear())===String(v)}
 return true
}

function auditFiltered(){
 const q=($("#auditSearch")?.value||"").toLowerCase(),act=$("#auditActionFilter")?.value||"",usr=$("#auditUserFilter")?.value||"",from=$("#auditDateFrom")?.value||"",to=$("#auditDateTo")?.value||"";
 return (state.auditLogs||[]).filter(x=>{
   const text=`${x.username} ${x.action} ${x.entity_type} ${x.entity_id} ${x.details}`.toLowerCase();
   const date=String(x.created_at||"").slice(0,10);
   return (!q||text.includes(q))&&(!act||x.action===act)&&(!usr||x.username===usr)&&(!from||date>=from)&&(!to||date<=to);
 });
}
function scrollPageTop(pageId){
 const panel=$("#"+pageId)?.querySelector(".panel");
 if(panel)panel.scrollIntoView({behavior:"smooth",block:"start"});
}
function parseAuditDetails(raw){
 if(raw==null||raw==="")return {};
 if(typeof raw==="object")return raw;
 try{return JSON.parse(raw)}catch(e){return {message:String(raw)}}
}
function auditDetailsText(x){
 const d=parseAuditDetails(x.details),parts=[];
 const labels={quantity:tl("ຈຳນວນ","数量"),balance:tl("ຍອດຄົງເຫຼືອ","剩余数量"),barcode:"Barcode",sku:"SKU",product_name:t("ອຸປະກອນ"),note:tl("ໝາຍເຫດ","备注"),message:tl("ຂໍ້ຄວາມ","消息"),old_value:tl("ຄ່າເກົ່າ","旧值"),new_value:tl("ຄ່າໃໝ່","新值")};
 Object.entries(d).forEach(([k,v])=>{if(v!==""&&v!=null)parts.push(`${labels[k]||k}: ${typeof v==="object"?JSON.stringify(v):v}`)});
 if(parts.length)return parts.join(" • ");
 const action=String(x.action||"").toUpperCase();
 if(action==="LOGIN")return tl("ເຂົ້າລະບົບສຳເລັດ","登录成功");
 if(action==="LOGOUT")return tl("ອອກຈາກລະບົບ","退出登录");
 if(action.includes("CREATE"))return tl("ສ້າງລາຍການໃໝ່","创建新记录");
 if(action.includes("UPDATE"))return tl("ແກ້ໄຂຂໍ້ມູນ","修改数据");
 if(action.includes("DELETE"))return tl("ລຶບລາຍການ","删除记录");
 return "-";
}
function auditBadgeClass(action){const a=String(action||"").toUpperCase();if(a.includes("STOCK_IN")||a.includes("CREATE"))return"success";if(a.includes("STOCK_OUT")||a.includes("DELETE"))return"danger";if(a.includes("LOGIN"))return"info";if(a.includes("UPDATE"))return"warning";return""}
function openAuditDetail(index){
 const x=(window.__auditPageRows||[])[Number(index)];if(!x)return;
 const d=parseAuditDetails(x.details);
 const product=(state.products||[]).find(p=>
   String(p.product_id||"")===String(x.entity_id||d.product_id||"") ||
   (d.barcode&&String(p.barcode||"")===String(d.barcode)) ||
   (d.sku&&String(p.sku||"")===String(d.sku))
 );
 const category=(state.categories||[]).find(c=>String(c.category_id||"")===String(d.category_id||product?.category_id||""));
 const labels={
   category_id:tl("ໝວດໝູ່","类别"),product_id:tl("ລະຫັດອຸປະກອນ","设备编号"),product_name:t("ອຸປະກອນ"),
   barcode:"Barcode",sku:"SKU",quantity:tl("ຈຳນວນ","数量"),balance:tl("ຍອດຄົງເຫຼືອ","剩余数量"),
   old_value:tl("ຄ່າເກົ່າ","旧值"),new_value:tl("ຄ່າໃໝ່","新值"),note:tl("ໝາຍເຫດ","备注"),message:tl("ຂໍ້ຄວາມ","消息")
 };
 const detailRows=[
   [t("ເວລາ"),x.created_at],[tl("User","用户"),x.username],[t("Role"),t(x.role)],[tl("Action","操作"),x.action],
   [tl("Entity","实体"),x.entity_type],[tl("Record ID","记录 ID"),x.entity_id],
   [tl("ໝວດໝູ່","类别"),d.category_name||category?.category_name||"-"],
   [t("ອຸປະກອນ"),d.product_name||product?.product_name||d.name||"-"],
   ["Barcode",d.barcode||product?.barcode||"-"],["SKU",d.sku||product?.sku||"-"]
 ];
 const skip=new Set(["category_name","product_name","name","barcode","sku"]);
 Object.entries(d).forEach(([k,v])=>{if(!skip.has(k))detailRows.push([labels[k]||k,typeof v==="object"?JSON.stringify(v,null,2):v])});
 $("#auditDetailContent").innerHTML=detailRows.map(([k,v])=>`<div class="audit-detail-row"><span>${safeValue(k)}</span><strong>${safeValue(v??"-")}</strong></div>`).join("");
 const modal=$("#auditDetailModal");modal.classList.add("open");modal.setAttribute("aria-hidden","false");document.body.classList.add("modal-open");
}
function renderAudit(){
 if(String(currentUser?.role||"")!=="Admin"){
   if($("#auditBody")) $("#auditBody").innerHTML=`<tr><td colspan="7" class="empty-cell">${t("Admin only")}</td></tr>`;
   return;
 }
 const rows=state.auditLogs||[],actions=[...new Set(rows.map(x=>x.action).filter(Boolean))],users=[...new Set(rows.map(x=>x.username).filter(Boolean))];
 if($("#auditActionFilter")){const v=$("#auditActionFilter").value;$("#auditActionFilter").innerHTML=`<option value="">${tl("ທຸກ Action","全部操作")}</option>`+actions.map(x=>`<option>${x}</option>`).join("");$("#auditActionFilter").value=v}
 if($("#auditUserFilter")){const v=$("#auditUserFilter").value;$("#auditUserFilter").innerHTML=`<option value="">${tl("ທຸກ User","全部用户")}</option>`+users.map(x=>`<option>${x}</option>`).join("");$("#auditUserFilter").value=v}
 const list=auditFiltered(),totalPages=Math.max(1,Math.ceil(list.length/auditPageSize));
 if(auditPage>totalPages)auditPage=totalPages;if(auditPage<1)auditPage=1;
 const pageRows=list.slice((auditPage-1)*auditPageSize,auditPage*auditPageSize);
 window.__auditPageRows=pageRows;
 if($("#auditBody"))$("#auditBody").innerHTML=pageRows.length?pageRows.map((x,i)=>`<tr class="audit-clickable" data-audit-index="${i}"><td>${safeValue(x.created_at)}</td><td>${safeValue(x.username)}</td><td>${t(safeValue(x.role))}</td><td><span class="badge ${auditBadgeClass(x.action)}">${safeValue(x.action)}</span></td><td>${safeValue(x.entity_type)}</td><td>${safeValue(x.entity_id||"-")}</td><td class="audit-detail-summary">${safeValue(auditDetailsText(x))}</td></tr>`).join(""):`<tr><td colspan="7" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 paintPagination('audit',auditPage,list.length,auditPageSize);
 if($("#auditMetrics"))$("#auditMetrics").innerHTML=[[t("Log ທັງໝົດ"),rows.length],[t("Login"),rows.filter(x=>x.action==="LOGIN").length],[t("ການແກ້ໄຂ"),rows.filter(x=>String(x.action).includes("UPDATE")).length],[t("ການລຶບ"),rows.filter(x=>String(x.action).includes("DELETE")).length]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}
function renderBackups(){
 const rows=state.backups||[];
 if($("#backupBody"))$("#backupBody").innerHTML=rows.length?rows.map(b=>`<tr><td>${safeValue(b.backup_id)}</td><td>${safeValue(b.created_at)}</td><td>${safeValue(b.file_name)}</td><td><span class="badge">${safeValue(b.status)}</span></td><td>${safeValue(b.created_by)}</td><td>${safeValue(b.drive_file_id||"-")}</td><td>${String(currentUser?.role||"")==="Admin"?`<button class="mini" data-delete-backup="${safeValue(b.backup_id)}">${t("Delete")}</button>`:"-"}</td></tr>`).join(""):`<tr><td colspan="7" class="empty-cell">${t("ບໍ່ພົບຂໍ້ມູນ")}</td></tr>`;
 if($("#backupMetrics"))$("#backupMetrics").innerHTML=[[t("Backup ທັງໝົດ"),rows.length],[t("ສຳເລັດ"),rows.filter(x=>x.status==="SUCCESS").length],[t("ລົ້ມເຫຼວ"),rows.filter(x=>x.status==="FAILED").length],[t("ລ່າສຸດ"),rows[0]?.created_at||"-"]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");
}

async function deleteBackupAsAdmin(backupId){
  if(String(currentUser?.role||"")!=="Admin"){toast(t("Admin only"));return}
  const record=(state.backups||[]).find(x=>String(x.backup_id)===String(backupId));
  const name=record?.file_name||backupId;
  if(!confirm(tl(`ລຶບ Backup “${name}” ບໍ? Snapshot ໃນ Supabase ຈະຖືກລຶບ.`,`删除备份“${name}”吗？Supabase 中的快照将被删除。`)))return;
  try{
    toast(t("ກຳລັງລຶບ Backup..."));
    const result=await api("deleteBackup",{backup_id:backupId});
    await refreshAll();
    if(result?.warning){
      toast(tl("ລຶບລາຍການ Backup ສຳເລັດ ແຕ່ Supabase ມີຄຳເຕືອນ: ","备份记录已删除，但 Supabase 有警告：")+result.warning);
    }else{
      toast(t("ລຶບ Backup ສຳເລັດ"));
    }
  }catch(err){toast(err.message)}
}

async function clearAuditLogsAsAdmin(){
  const role=String(currentUser?.role||currentUser?.user?.role||"").toLowerCase();
  if(role!=="admin"){
    toast(t("ສະເພາະ Admin ເທົ່ານັ້ນ"));
    return;
  }

  const first=confirm(tl("⚠️ ຈະລ້າງ Audit Log ທັງໝົດບໍ? ຂໍ້ມູນຈະບໍ່ສາມາດກູ້ຄືນໄດ້.","⚠️ 要清空全部审计日志吗？此操作无法恢复。"));
  if(!first)return;

  const text=prompt(tl('ພິມຄຳວ່າ DELETE ເພື່ອຢືນຢັນ','输入 DELETE 以确认'));
  if(text!=="DELETE"){
    toast(tl("ຍົກເລີກ: ຄຳຢືນຢັນບໍ່ຖືກຕ້ອງ","已取消：确认文字不正确"));
    return;
  }

  const button=$("#clearAuditBtn");
  if(button)button.disabled=true;
  try{
    await api("clearAuditLogs",{confirm:"DELETE"});
    state.auditLogs=[];
    auditPage=1;
    renderAudit();
    toast(tl("ລ້າງ Audit Log ສຳເລັດ","审计日志已清空"));
    await refreshAll().catch(()=>{});
  }catch(err){
    toast(err.message||tl("ລ້າງ Audit Log ບໍ່ສຳເລັດ","清空审计日志失败"));
  }finally{
    if(button)button.disabled=false;
  }
}

function exportAuditCsv(){
 const list=auditFiltered(),rows=[["created_at","username","role","action","entity_type","entity_id","details"],...list.map(x=>[x.created_at,x.username,x.role,x.action,x.entity_type,x.entity_id,x.details])];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="audit-log.csv";a.click()
}
async function archiveMonthlyTransactions(){
  const role=String(currentUser?.role||currentUser?.user?.role||"").toLowerCase();
  if(role!=="admin"){
    toast(t("ສະເພາະ Admin ເທົ່ານັ້ນ"));
    return;
  }
  const ok=confirm(tl(
    "📦 Archive ຂໍ້ມູນ Stock In / Stock Out / Movements ຂອງເດືອນທີ່ຜ່ານມາ?\n\n• ລະບົບຈະສ້າງ App Snapshot ກ່ອນ\n• ຂໍ້ມູນເດືອນປັດຈຸບັນຈະບໍ່ຖືກລຶບ\n• ຍອດ Products.stock_qty ຈະບໍ່ປ່ຽນ",
    "📦 归档上个月的入库 / 出库 / Movements 数据？\n\n• 系统会先创建应用快照\n• 本月数据不会被删除\n• Products.stock_qty 库存余额不会改变"
  ));
  if(!ok)return;
  const button=$("#archiveMonthlyBtn");
  if(button)button.disabled=true;
  try{
    toast(tl("ກຳລັງ Backup ແລະ Archive...","正在备份并归档..."));
    const result=await api("archiveMonthlyTransactions",{confirm:"ARCHIVE"});
    await refreshAll();
    const total=Number(result?.total_archived||0);
    toast(tFormat("Archive ສຳເລັດ {total} ລາຍການ","归档成功，共 {total} 条",{total}));
  }catch(err){
    toast(err?.message||tl("Archive ບໍ່ສຳເລັດ","归档失败"));
  }finally{
    if(button)button.disabled=false;
  }
}

function downloadSnapshot(){
 const data={exported_at:new Date().toISOString(),products:state.products,categories:state.categories,stockIn:state.stockIn,stockOut:state.stockOut,movements:state.movements};
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));a.download=`signshop-snapshot-${new Date().toISOString().slice(0,10)}.json`;a.click()
}

function exportDashboardSummary(){
 const rows=[["Metric","Value"],["Total Products",state.products.length],["Total Stock",state.products.reduce((s,p)=>s+Number(p.stock_qty||0),0)],["Low Stock",state.products.filter(p=>statusOf(p)==="low").length],["Out of Stock",state.products.filter(p=>statusOf(p)==="out").length],["Inactive >30 days",countInactiveProducts(30)]];
 const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download="dashboard-summary.csv";a.click()
}

function exportCsv(list,name){const rows=[["Barcode","Category","Equipment","SKU","Price","Stock","Status"],...list.map(p=>[p.barcode,categoryName(p.category_id),p.product_name,p.sku,formatProductPrice(p.price),p.stock_qty,statusOf(p)])];const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=name;a.click()}
$("#loginForm").onsubmit=async e=>{e.preventDefault();setText("#loginError","");try{const d=Object.fromEntries(new FormData(e.target));await login(d.username,d.password)}catch(err){console.error(err);setText("#loginError",err?.message||tl("Login error","登录错误"))}}
$("#logoutBtn").onclick=async()=>{
 if(!confirm(t("ຢືນຢັນອອກຈາກລະບົບ?")))return;
 try{await api("logout")}catch(e){}
 try{await window.SANLIAN_SUPABASE?.stopRealtime?.()}catch(e){}
 realtimeSyncStarted=false;
 localStorage.removeItem("signshop_session");localStorage.removeItem(USER_CACHE_KEY);sessionStorage.clear();sessionToken="";currentUser=null;
 const f=$("#loginForm");if(f){f.reset();f.querySelectorAll("input").forEach(i=>{i.value="";i.setAttribute("value","")})}
 setText("#loginError","");showLogin();setTimeout(()=>{const u=f?.elements?.username;if(u){u.value="";u.focus()}const p=f?.elements?.password;if(p)p.value=""},80);
}
document.addEventListener("click",async e=>{const n=e.target.closest("[data-page]");if(n)openPage(n.dataset.page);const l=e.target.closest("[data-page-link]");if(l)openPage(l.dataset.pageLink);
 const closeModalBtn=e.target.closest("[data-close-modal]");
 if(closeModalBtn){
   const modal=$("#productModal");
   const f=$("#productForm");
   if(f){
     f.dataset.saving="0";
     const saveBtn=f.querySelector('button[type="submit"],button.primary:not([type])');
     if(saveBtn){
       saveBtn.disabled=false;
       saveBtn.textContent=t(saveBtn.dataset.defaultText||"ບັນທຶກ");
     }
   }
   modal?.classList.remove("open");
 }
 const addProductButton=e.target.closest("#addProductBtn");
 if(addProductButton){
   e.preventDefault();
   const f=$("#productForm");
   if(!f){toast(tl("ບໍ່ພົບຟອມເພີ່ມອຸປະກອນ","未找到添加设备表单"));return}
   f.reset();
   f.dataset.mode="create";
   f.dataset.editingProductId="";
   f.dataset.saving="0";
   const saveBtn=f.querySelector('button[type="submit"],button.primary:not([type])');
   if(saveBtn){
     saveBtn.disabled=false;
     saveBtn.dataset.defaultText=saveBtn.dataset.defaultText||saveBtn.textContent||"ບັນທຶກ";
     saveBtn.textContent=t(saveBtn.dataset.defaultText);
   }
   resetProductEntryModes();
   if(f.elements.product_id)f.elements.product_id.value="";
   if(f.elements.barcode)f.elements.barcode.value=generateLocalBarcode();
   if(f.elements.sku)f.elements.sku.value=generateLocalSku();
   const productModal=$("#productModal");
   productModal?.classList.add("open");
   productModal?.setAttribute("aria-hidden","false");
   setTimeout(renderStaticTranslations,0);
   // Ask Supabase for the real next SKU, including inactive/deleted records.
   await refreshAutoSku();
 }
 const ep=e.target.closest("[data-edit-product]");
 if(ep){
   const productId=String(ep.dataset.editProduct||"");
   const p=(state.products||[]).find(x=>String(x.product_id)===productId);
   if(!p){toast(tl("ບໍ່ພົບລາຍການອຸປະກອນ","未找到设备记录"));return}
   const f=$("#productForm");
   f.reset();
   f.dataset.mode="edit";
   f.dataset.editingProductId=productId;
   Object.entries(p).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v??""});
   f.elements.product_id.value=productId;
   $("#productModal").classList.add("open");
 }
 const dp=e.target.closest("[data-delete-product]");if(dp&&confirm(t("ລຶບອຸປະກອນ?"))){
   try{
     const productId=String(dp.dataset.deleteProduct||"");
     await api("deleteProduct",{product_id:productId});
     state.products=(state.products||[]).filter(p=>String(p.product_id)!==productId);
     renderAll();
     toast(tl("ລຶບອຸປະກອນສຳເລັດ","设备删除成功"));
     refreshAll().catch(()=>{});
   }catch(err){
     const msg=String(err?.message||err||"");
     const m=msg.match(/current stock\s*=\s*([^.;]+)/i);
     if(m)toast(tl(`ລຶບບໍ່ໄດ້: Stock ປັດຈຸບັນ = ${m[1]}`,`无法删除：当前库存 = ${m[1]}`));
     else toast(msg);
   }
 }
 const ec=e.target.closest("[data-edit-category]");if(ec){const c=state.categories.find(x=>x.category_id===ec.dataset.editCategory),name=prompt(t("ຊື່ໃໝ່"),c.category_name);if(name)try{await api("updateCategory",{category_id:c.category_id,category_name:name});await refreshAll()}catch(err){toast(err.message)}}
 const dc=e.target.closest("[data-delete-category]");if(dc&&confirm(t("ລຶບໝວດໝູ່?")))try{await api("deleteCategory",{category_id:dc.dataset.deleteCategory});await refreshAll()}catch(err){toast(err.message)}
 const qr=e.target.closest("[data-show-qr]");if(qr)showProductQr(qr.dataset.showQr);
 const scanBtn=e.target.closest("[data-scan-target]");if(scanBtn)openScanner(scanBtn.dataset.scanTarget);
 const ds=e.target.closest("[data-delete-stock]");if(ds&&confirm(tl("ລຶບ Transaction ແລະປັບ Stock ຄືນ?","删除交易并恢复库存？"))){const [type,id]=ds.dataset.deleteStock.split(":");try{await api("deleteStockTransaction",{type,id});await refreshAll()}catch(err){toast(err.message)}}})
$("#generateBarcodeBtn").onclick=()=>{$("#productForm [name=barcode]").value=generateLocalBarcode();toast(t("ສ້າງ Barcode ໃໝ່ແລ້ວ"))};
$("#generateSkuBtn").onclick=async()=>{await refreshAutoSku();toast(t("ສ້າງ SKU ໃໝ່ແລ້ວ"))};
$("#productForm").onsubmit=async e=>{
  e.preventDefault();

  const form=e.currentTarget;
  if(form.dataset.saving==="1")return;

  const submitButton=form.querySelector('button[type="submit"],button.primary:not([type])');
  const originalButtonText=submitButton?.textContent||"ບັນທຶກ";

  const d=Object.fromEntries(new FormData(form));
  const editingId=String(form.dataset.editingProductId||"").trim();

  if(form.dataset.mode==="edit"&&editingId)d.product_id=editingId;
  else d.product_id="";

  if(!String(d.category_id||"").trim()){
    toast(t("ກະລຸນາເລືອກໝວດໝູ່"));
    form.elements.category_id?.focus();
    return;
  }
  if(!String(d.product_name||"").trim()){
    toast(t("ກະລຸນາໃສ່ຊື່ອຸປະກອນ"));
    form.elements.product_name?.focus();
    return;
  }

  if(!d.barcode)d.barcode=generateLocalBarcode();
  if(!d.sku)d.sku=generateLocalSku();
  // Tell the database whether SKU is automatic or intentionally manual.
  // In auto mode the database is authoritative and allocates the next unique SKU.
  d.sku_mode=PRODUCT_ENTRY_MODES.sku;
  d.price=normalizePrice(d.price);

  const action=editingId?"updateProduct":"createProduct";
  const submittedData={...d};
  let previous=null;

  if(d.product_id){
    const i=(state.products||[]).findIndex(
      x=>String(x.product_id)===String(d.product_id)
    );
    if(i>=0)previous={...state.products[i]};
  }

  form.dataset.saving="1";
  if(submitButton){
    submitButton.disabled=true;
    submitButton.textContent=t("ກຳລັງບັນທຶກ...");
  }

  try{
    const saved=await api(action,{
      product:d,
      request_id:"REQ-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)
    });

    if(saved&&typeof saved==="object"){
      const expectedPrice=normalizePrice(submittedData.price);
      const serverPrice=normalizePrice(saved.price);
      if(Math.abs(expectedPrice-serverPrice)>0.000001){
        throw new Error(tl(`Backend ບັນທຶກລາຄາບໍ່ກົງ: ${expectedPrice} → ${serverPrice}`,`后端价格保存不一致：${expectedPrice} → ${serverPrice}`));
      }
      upsertLocalProduct(saved);
    }else if(previous){
      upsertLocalProduct({...previous,...submittedData});
    }else{
      upsertLocalProduct({...submittedData});
    }

    // Backend save succeeded: close and clear the form immediately.
    closeProductModalAfterSave();

    // Force the browser to paint the closed modal before refresh/render work.
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));

    toast(t("ບັນທຶກອຸປະກອນສຳເລັດ"));

    try{
      renderProductRelated();
    }catch(renderErr){
      console.warn("Product saved, local render failed:",renderErr);
    }

    try{
      await refreshAll();
    }catch(refreshErr){
      console.warn("Product saved, refresh failed:",refreshErr);
      toast(t("ບັນທຶກແລ້ວ — ກະລຸນາກົດ Refresh ຂໍ້ມູນ"));
    }
  }catch(err){
    console.error("Product save failed:",err);
    toast(tl("ບັນທຶກບໍ່ສຳເລັດ: ","保存失败：")+(err?.message||err));
  }finally{
    form.dataset.saving="0";
    if(submitButton){
      submitButton.disabled=false;
      submitButton.textContent=t(submitButton.dataset.defaultText||originalButtonText);
    }
  }
}


const PRODUCT_ENTRY_MODES={barcode:"auto",sku:"auto"};

function applyProductEntryMode(target,mode,{generate=true}={}){
  const form=$("#productForm");
  if(!form)return;
  const input=form.elements[target];
  const autoButton=target==="barcode"?$("#generateBarcodeBtn"):$("#generateSkuBtn");
  const hint=target==="barcode"?$("#barcodeModeHint"):$("#skuModeHint");
  const row=input?.closest(".barcode-auto-row");
  const normalized=mode==="manual"?"manual":"auto";
  PRODUCT_ENTRY_MODES[target]=normalized;

  form.querySelectorAll(`[data-entry-target="${target}"]`).forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.entryMode===normalized);
  });

  const manual=normalized==="manual";
  input.readOnly=!manual;
  input.classList.toggle("manual-entry",manual);
  row?.classList.toggle("mode-manual",manual);
  if(autoButton){autoButton.hidden=manual;autoButton.disabled=manual;}

  if(manual){
    input.value="";
    input.placeholder=target==="barcode"?tl("ປ້ອນ Barcode ດ້ວຍຕົນເອງ","手动输入 Barcode"):tl("ປ້ອນ SKU ດ້ວຍຕົນເອງ","手动输入 SKU");
    if(hint)hint.textContent=target==="barcode"?tl("ໂໝດປ້ອນເອງ: ສູງສຸດ 13 ຫຼັກ","手动模式：最多 13 位"):tl("ໂໝດປ້ອນເອງ: ກຳນົດ SKU ໄດ້ເອງ","手动模式：可自定义 SKU");
    setTimeout(()=>input.focus(),0);
  }else{
    input.placeholder="";
    if(hint)hint.textContent=target==="barcode"?t("ໂໝດ Auto: ລະບົບສ້າງ Barcode 13 ຫຼັກ"):t("ໂໝດ Auto: ລະບົບສ້າງ SKU ອັດຕະໂນມັດ");
    if(generate){
      if(target==="barcode")input.value=generateLocalBarcode();
      else void refreshAutoSku();
    }
  }
}

function resetProductEntryModes(){
  applyProductEntryMode("barcode","auto",{generate:false});
  applyProductEntryMode("sku","auto",{generate:false});
}

document.addEventListener("click",e=>{
  const btn=e.target.closest("[data-entry-mode][data-entry-target]");
  if(btn)applyProductEntryMode(btn.dataset.entryTarget,btn.dataset.entryMode);
});

function closeProductModalAfterSave(){
  const modal=$("#productModal");
  const form=$("#productForm");

  if(form){
    form.reset();
    resetProductEntryModes();
    form.dataset.mode="";
    form.dataset.editingProductId="";
    form.dataset.saving="0";

    const saveButton=form.querySelector('button[type="submit"],button.primary:not([type])');
    if(saveButton){
      saveButton.disabled=false;
      saveButton.textContent=t(saveButton.dataset.defaultText||"ບັນທຶກ");
    }
  }

  if(modal){
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden","true");
    modal.style.removeProperty("display");
  }

  document.body.classList.remove("modal-open");
}

function resetStockForm(fid){
 const f=$("#"+fid);
 if(!f)return;
 f.reset();
 f.elements.category.value="";
 f.elements.category.dataset.selectedCategory="";
 f.elements.productId.innerHTML=`<option value="">${t("ກະລຸນາເລືອກອຸປະກອນ")}</option>`;
 f.elements.productId.value="";
 f.elements.productId.dataset.selectedProduct="";
 f.elements.sku.value="";
 f.elements.qty.value="";
 f.elements.note.value="";
 const barcode=$("#"+(fid==="stockInForm"?"inBarcode":"outBarcode"));
 if(barcode)barcode.value="";
}

function validateStockForm(fid){
 const f=$("#"+fid);
 const category=String(f.elements.category.value||"").trim();
 const productId=String(f.elements.productId.value||"").trim();
 const qty=Number(f.elements.qty.value);

 if(!category){
   toast(t("ກະລຸນາເລືອກໝວດໝູ່"));
   f.elements.category.focus();
   return null;
 }
 if(!productId){
   toast(t("ກະລຸນາເລືອກອຸປະກອນ"));
   f.elements.productId.focus();
   return null;
 }
 if(!Number.isFinite(qty)||qty<=0){
   toast(t("ກະລຸນາປ້ອນຈຳນວນທີ່ຫຼາຍກວ່າ 0"));
   f.elements.qty.focus();
   return null;
 }

 return{
   product_id:productId,
   quantity:qty,
   note:String(f.elements.note.value||"").trim()
 };
}

$("#stockInForm").onsubmit=async e=>{
 e.preventDefault();
 const payload=validateStockForm("stockInForm");
 if(!payload)return;

 const snapshot={
   category:e.target.elements.category.value,
   productId:e.target.elements.productId.value,
   sku:e.target.elements.sku.value,
   qty:e.target.elements.qty.value,
   note:e.target.elements.note.value,
   barcode:$("#inBarcode")?.value||""
 };

 resetStockForm("stockInForm");
 toast(tl("ກຳລັງບັນທຶກ Stock In...","正在保存入库..."));

 try{
   await api("stockIn",payload);
   toast(t("Stock In ສຳເລັດ"));
   refreshAll().catch(err=>console.warn("Stock In refresh failed:",err));
   setTimeout(()=>$("#inBarcode")?.focus(),100);
 }catch(err){
   toast(tl("Stock In ບໍ່ສຳເລັດ: ","入库失败：")+err.message);
   const f=e.target;
   f.elements.category.value=snapshot.category;
   fillProducts("stockInForm");
   f.elements.productId.value=snapshot.productId;
   syncForm("stockInForm");
   f.elements.qty.value=snapshot.qty;
   f.elements.note.value=snapshot.note;
   if($("#inBarcode"))$("#inBarcode").value=snapshot.barcode;
 }
}
$("#stockOutForm").onsubmit=async e=>{
 e.preventDefault();
 const payload=validateStockForm("stockOutForm");
 if(!payload)return;

 const snapshot={
   category:e.target.elements.category.value,
   productId:e.target.elements.productId.value,
   sku:e.target.elements.sku.value,
   qty:e.target.elements.qty.value,
   note:e.target.elements.note.value,
   barcode:$("#outBarcode")?.value||""
 };

 resetStockForm("stockOutForm");
 toast(tl("ກຳລັງບັນທຶກ Stock Out...","正在保存出库..."));

 try{
   await api("stockOut",payload);
   toast(t("Stock Out ສຳເລັດ"));
   refreshAll().catch(err=>console.warn("Stock Out refresh failed:",err));
   setTimeout(()=>$("#outBarcode")?.focus(),100);
 }catch(err){
   toast(tl("Stock Out ບໍ່ສຳເລັດ: ","出库失败：")+err.message);
   const f=e.target;
   f.elements.category.value=snapshot.category;
   fillProducts("stockOutForm");
   f.elements.productId.value=snapshot.productId;
   syncForm("stockOutForm");
   f.elements.qty.value=snapshot.qty;
   f.elements.note.value=snapshot.note;
   if($("#outBarcode"))$("#outBarcode").value=snapshot.barcode;
 }
}
["stockInForm","stockOutForm"].forEach(fid=>{
 const f=$("#"+fid);
 if(!f)return;

 f.elements.category.onchange=()=>{
   const selected=String(f.elements.category.value||"");
   f.elements.category.dataset.selectedCategory=selected;
   f.elements.productId.dataset.selectedProduct="";
   fillProducts(fid,false);
 };

 f.elements.productId.onchange=()=>{
   f.elements.productId.dataset.selectedProduct=
     String(f.elements.productId.value||"");
   syncForm(fid);
 };

 const resetButton=f.querySelector('button[type="reset"]');
 if(resetButton){
   resetButton.onclick=e=>{
     e.preventDefault();
     resetStockForm(fid);
   };
 }
})
$("#inBarcode").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const code=String(e.target.value||"").trim();const p=state.products.find(x=>String(x.barcode)===code||String(x.sku)===code);if(p){playScanSound(true);const f=$("#stockInForm");f.elements.category.value=p.category_id;f.elements.category.dataset.selectedCategory=String(p.category_id);fillProducts("stockInForm");f.elements.productId.value=p.product_id;f.elements.productId.dataset.selectedProduct=String(p.product_id);syncForm("stockInForm")}else{playScanSound(false);toast(t("ບໍ່ພົບ Barcode"))}}}
$("#outBarcode").onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();const code=String(e.target.value||"").trim();const p=state.products.find(x=>String(x.barcode)===code||String(x.sku)===code);if(p){playScanSound(true);const f=$("#stockOutForm");f.elements.category.value=p.category_id;f.elements.category.dataset.selectedCategory=String(p.category_id);fillProducts("stockOutForm");f.elements.productId.value=p.product_id;f.elements.productId.dataset.selectedProduct=String(p.product_id);syncForm("stockOutForm")}else{playScanSound(false);toast(t("ບໍ່ພົບ Barcode"))}}}

function makeStockCountRequestId(){
 try{return "SC-"+crypto.randomUUID()}catch(e){return "SC-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)}
}
function isRetryableStockCountError(err){
 const m=String(err?.message||err||"").toLowerCase();
 return m.includes("server")||m.includes("服务器")||m.includes("network")||m.includes("failed to fetch")||m.includes("ເຊື່ອມຕໍ່")||m.includes("超时");
}

const stockCountForm=$("#stockCountForm");
if(stockCountForm){
 stockCountForm.elements.category.onchange=()=>{stockCountForm.elements.category.dataset.selectedCategory=String(stockCountForm.elements.category.value||"");stockCountForm.elements.productId.dataset.selectedProduct="";fillStockCountSelects(false)};
 stockCountForm.elements.productId.onchange=()=>{stockCountForm.elements.productId.dataset.selectedProduct=String(stockCountForm.elements.productId.value||"");syncStockCountForm()};
 stockCountForm.elements.actualQty.oninput=updateStockCountPreview;
 stockCountForm.querySelector('button[type="reset"]')?.addEventListener("click",e=>{e.preventDefault();resetStockCountForm()});
 $("#stockCountCancelEditBtn")?.addEventListener("click",()=>resetStockCountForm());
 stockCountForm.addEventListener("submit",async e=>{
  e.preventDefault();
  const product=(state.products||[]).find(p=>String(p.product_id)===String(stockCountForm.elements.productId.value));
  if(!product){toast(t("ກະລຸນາເລືອກອຸປະກອນ"));return}
  const actualRaw=stockCountForm.elements.actualQty.value;
  if(actualRaw===""||Number(actualRaw)<0||!Number.isFinite(Number(actualRaw))){toast(tl("ກະລຸນາປ້ອນຈຳນວນນັບຈິງທີ່ຖືກຕ້ອງ","请输入正确的实盘数量"));return}
  const systemQty=editingStockCountId?Number(stockCountForm.elements.systemQty.value||0):Number(product.stock_qty||0),actualQty=Number(actualRaw),difference=actualQty-systemQty;
  if(difference!==0&&!stockCountForm.elements.reason.value){toast(tl("ກະລຸນາເລືອກເຫດຜົນເມື່ອສະຕ໋ອກບໍ່ກົງ","库存不一致时请选择原因"));return}
  const payload={product_id:product.product_id,system_qty:systemQty,actual_qty:actualQty,reason:difference===0?"":stockCountForm.elements.reason.value,note:String(stockCountForm.elements.note.value||"").trim()};
  setFormSaving(stockCountForm,true);
  try{
    if(editingStockCountId){
      await api("updateStockCount",{count_id:editingStockCountId,count:{...payload,count_id:editingStockCountId}});
      toast(tl("ແກ້ໄຂຜົນກວດສະຕ໋ອກສຳເລັດ","盘点记录修改成功"));
    }else{
      payload.client_request_id=makeStockCountRequestId();
      try{await api("saveStockCount",{...payload,count:payload})}catch(firstErr){if(!isRetryableStockCountError(firstErr))throw firstErr;await new Promise(r=>setTimeout(r,1200));await api("saveStockCount",{...payload,count:payload})}
      toast(tl("ບັນທຶກຜົນກວດສະຕ໋ອກລົງ Supabase ສຳເລັດ","盘点结果已保存到 Supabase"));
    }
    await refreshAll();renderStockCount();resetStockCountForm();
  }catch(err){toast((editingStockCountId?tl("ແກ້ໄຂຜົນກວດບໍ່ສຳເລັດ: ","修改盘点记录失败："):tl("ບັນທຶກຜົນກວດບໍ່ສຳເລັດ: ","盘点保存失败："))+err.message)}finally{setFormSaving(stockCountForm,false)}
 });
}
$("#countBarcode")?.addEventListener("keydown",e=>{if(e.key!=="Enter")return;e.preventDefault();const p=findProductByCode(e.target.value);if(p){playScanSound(true);selectStockCountProduct(p);toast(tFormat("ພົບ: {name}","已找到：{name}",{name:p.product_name}))}else{playScanSound(false);toast(t("ບໍ່ພົບ Barcode"))}});
$("#stockCountSearch")?.addEventListener("input",renderStockCount);
$("#stockCountRefreshBtn")?.addEventListener("click",()=>refreshAll().then(renderStockCount).catch(e=>toast(e.message)));
$("#stockCountBody")?.addEventListener("click",e=>{
 const adjust=e.target.closest("[data-adjust-count]");if(adjust){adjustStockCountRecord(adjust.dataset.adjustCount);return}
 const edit=e.target.closest("[data-edit-count]");if(edit){editStockCountRecord(edit.dataset.editCount);return}
 const del=e.target.closest("[data-delete-count]");if(del){deleteStockCountRecord(del.dataset.deleteCount)}
});

const userModal=$("#userModal"), userForm=$("#userForm"), addUserBtn=$("#addUserBtn");
function closeUserModal(){
  if(!userModal)return;
  userModal.classList.remove("open");
  document.body.classList.remove("modal-open");
}
function openUserModal(user){
  if(!userModal||!userForm)return;
  if(!user && currentUser?.role!=="Admin"){toast(tl("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້","仅管理员可以添加用户"));return;}
  userForm.reset();
  const editing=Boolean(user);
  userForm.elements.user_id.value=editing?user.user_id:"";
  userForm.elements.username.disabled=editing;
  userForm.elements.username.value=editing?(user.username||""):"";
  userForm.elements.display_name.value=editing?(user.display_name||""):"";
  const roleSelect=userForm.elements.role;
  [...roleSelect.options].forEach(option=>{option.disabled=currentUser?.role==="Manager"&&option.value==="Admin"});
  roleSelect.value=editing?(user.role||"Viewer"):"Viewer";
  userForm.elements.password.value="";
  userForm.elements.password.required=!editing;
  setText("#userModalTitle",editing?t("ແກ້ໄຂ User"):t("ເພີ່ມ User"));
  userModal.classList.add("open");
  document.body.classList.add("modal-open");
  setTimeout(()=>editing?userForm.elements.display_name.focus():userForm.elements.username.focus(),0);
}
if(addUserBtn)addUserBtn.addEventListener("click",()=>{
  if(currentUser?.role!=="Admin"){toast(tl("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້","仅管理员可以添加用户"));return;}
  openUserModal(null);
});
if(userModal){
  userModal.addEventListener("click",e=>{
    if(e.target===userModal||e.target.closest("[data-close-user-modal]"))closeUserModal();
  });
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&userModal?.classList.contains("open"))closeUserModal()});
document.addEventListener("click",async e=>{
 const edit=e.target.closest("[data-edit-user]");
 if(edit){
   e.preventDefault();
   const u=state.users.find(x=>String(x.user_id)===String(edit.dataset.editUser));
   if(!u){toast(tl("ບໍ່ພົບ User","未找到用户"));return;}
   openUserModal(u);
   return;
 }
 const reset=e.target.closest("[data-reset-user]");
 if(reset){
   e.preventDefault();
   const pw=prompt(tl("Password ໃໝ່ (ຢ່າງໜ້ອຍ 8 ຕົວ)","新密码（至少 8 个字符）"));
   if(!pw)return;
   try{await api("resetUserPassword",{user_id:reset.dataset.resetUser,password:pw});toast(t("ປ່ຽນ Password ສຳເລັດ"))}catch(err){toast(err.message)}
   return;
 }
 const toggle=e.target.closest("[data-toggle-user]");
 if(toggle){
   e.preventDefault();
   if(!confirm(tl("ຢືນຢັນການປ່ຽນສະຖານະ User?","确认更改用户状态？")))return;
   try{await api("setUserActive",{user_id:toggle.dataset.toggleUser,is_active:toggle.dataset.active==="true"});await refreshAll();toast(t("ອັບເດດ User ສຳເລັດ"))}catch(err){toast(err.message)}
 }
});
if(userForm)userForm.addEventListener("submit",async e=>{
 e.preventDefault();
 const submitButton=userForm.querySelector('button[type="submit"],button.primary:not([type])');
 if(userForm.dataset.saving==="1")return;
 userForm.dataset.saving="1";
 if(submitButton){submitButton.disabled=true;submitButton.dataset.originalText=submitButton.textContent;submitButton.textContent=t("ກຳລັງບັນທຶກ...");}
 const d=Object.fromEntries(new FormData(userForm));
 if(userForm.elements.username.disabled)d.username=userForm.elements.username.value;
 // Creating another account must never replace the logged-in Manager/Admin session.
 const activeToken=sessionToken;
 const activeUser=currentUser?{...currentUser}:null;
 try{
   if(d.user_id){
     await api("updateUser",{user:{user_id:d.user_id,display_name:d.display_name,role:d.role}});
     if(d.password)await api("resetUserPassword",{user_id:d.user_id,password:d.password});
   }else{
     if(currentUser?.role!=="Admin")throw new Error(tl("ສະເພາະ Admin ເທົ່ານັ້ນທີ່ສາມາດເພີ່ມຜູ້ໃຊ້ໄດ້","只有管理员可以添加用户"));
     await api("createUser",{user:d});
   }
   if(sessionToken!==activeToken){
     sessionToken=activeToken;
     localStorage.setItem("signshop_session",activeToken);
   }
   currentUser=activeUser;
   applyRole();
   closeUserModal();
   await refreshAll();
   openPage("users");
   toast(t("ບັນທຶກ User ສຳເລັດ"));
 }catch(err){
   sessionToken=activeToken;
   if(activeToken)localStorage.setItem("signshop_session",activeToken);
   currentUser=activeUser;
   applyRole();
   toast(err.message);
 }finally{
   userForm.dataset.saving="0";
   if(submitButton){submitButton.disabled=false;submitButton.textContent=t(submitButton.dataset.originalText||"ບັນທຶກ");}
 }
});
$("#addCategoryBtn").onclick=async()=>{const name=prompt(tl("ຊື່ໝວດໝູ່","类别名称"));if(name)try{await api("createCategory",{category_name:name});await refreshAll()}catch(err){toast(err.message)}}
$("#productSearch").oninput=()=>{productPage=1;renderProducts()};$("#productCategoryFilter").onchange=()=>{productPage=1;renderProducts()};$("#productStatusFilter").onchange=()=>{productPage=1;renderProducts()};$("#reportCategory").onchange=()=>{reportPage=1;renderReport()};$("#reportStatus").onchange=()=>{reportPage=1;renderReport()}
$("#exportProducts").onclick=()=>exportCsv(filteredProducts(),"products.csv");$("#exportReport").onclick=()=>exportCsv(filteredProducts(true),"stock-report.csv");
function setPrintOrientation(orientation){
  let style=document.getElementById("printPageOrientation");
  if(!style){
    style=document.createElement("style");
    style.id="printPageOrientation";
    document.head.appendChild(style);
  }
  const value=orientation==="landscape"?"landscape":"portrait";
  style.textContent=`@media print{@page{size:A4 ${value};margin:10mm}}`;
  localStorage.setItem("sanlian_print_orientation",value);
  return value;
}

function printSection(mode,orientation="portrait"){
  const selected=setPrintOrientation(orientation);
  const now=new Date();
  const userName=currentUser?.display_name||currentUser?.username||"-";
  document.querySelectorAll(".print-user").forEach(el=>el.textContent=tFormat("ພະນັກງານ: {name}","员工: {name}",{name:userName}));
  document.querySelectorAll(".print-datetime").forEach(el=>{const locale=currentLanguage==="zh"?"zh-CN":"lo-LA";el.textContent=tFormat("ວັນທີ: {dt}","日期: {dt}",{dt:`${now.toLocaleDateString(locale)}  ${now.toLocaleTimeString(locale)}`})});
  document.body.classList.remove("print-products","print-report","print-qr","print-portrait","print-landscape");
  document.body.classList.add(mode,selected==="landscape"?"print-landscape":"print-portrait");

  const cleanup=()=>{
    document.body.classList.remove("print-products","print-report","print-qr","print-portrait","print-landscape");
    const f=$("#productForm");
    if(f){
      f.dataset.saving="0";
      const b=f.querySelector('button[type="submit"]');
      if(b){b.disabled=false;b.textContent=t(b.dataset.defaultText||"ບັນທຶກ");}
    }
  };

  window.addEventListener("afterprint",cleanup,{once:true});
  setTimeout(()=>window.print(),80);
}
$("#printProductsPortrait")?.addEventListener("click",()=>printSection("print-products","portrait"));
$("#printProductsLandscape")?.addEventListener("click",()=>printSection("print-products","landscape"));
$("#printReportPortrait")?.addEventListener("click",()=>printSection("print-report","portrait"));
$("#printReportLandscape")?.addEventListener("click",()=>printSection("print-report","landscape"))
$("#syncBtn").onclick=()=>refreshAll().catch(e=>toast(e.message));$("#themeBtn").onclick=()=>document.body.classList.toggle("dark");$("#globalSearch").oninput=e=>{openPage("products");$("#productSearch").value=e.target.value;renderProducts()}
setInterval(()=>{if(sessionToken)refreshAll().catch(()=>{})},(window.SIGNSHOP_CONFIG?.POLL_SECONDS||15)*1000);



$("#dashboardPeriod").onchange=renderDashboardCharts;
$("#refreshDashboard").onclick=()=>refreshAll().catch(e=>toast(e.message));
$("#exportDashboard").onclick=exportDashboardSummary;
$("#reportRangeType").onchange=e=>{const t=e.target.value;$("#reportDate").classList.toggle("hidden",t!=="day");$("#reportMonth").classList.toggle("hidden",t!=="month");$("#reportYear").classList.toggle("hidden",t!=="year");reportPage=1;renderReport()};
["reportDate","reportMonth","reportYear"].forEach(id=>$("#"+id).onchange=()=>{reportPage=1;renderReport()});
$("#exportReportPdf").onclick=()=>printSection("print-report",localStorage.getItem("sanlian_print_orientation")||"portrait");

$("#closeScannerBtn").onclick=closeScanner;
$("#cameraSelect").onchange=async e=>{activeCameraIndex=Number(e.target.value);await startScannerCamera()};
$("#switchCameraBtn").onclick=async()=>{if(!availableCameras.length)return;activeCameraIndex=(activeCameraIndex+1)%availableCameras.length;$("#cameraSelect").value=String(activeCameraIndex);await startScannerCamera()};
$("#torchBtn").onclick=toggleTorch;
$("#applyManualScan").onclick=async()=>{const v=$("#manualScanValue").value.trim();if(v&&activeScanTarget){applyScannedCode(v,activeScanTarget);await closeScanner()}};
$("#closeQrBtn").onclick=()=>$("#qrModal").classList.remove("open");
$("#printQrBtn").onclick=()=>printSection("print-qr","portrait");
setupUsbScanner();

["auditSearch","auditActionFilter","auditUserFilter","auditDateFrom","auditDateTo"].forEach(id=>{
 const e=$("#"+id);
 if(e){
   const handler=()=>{auditPage=1;renderAudit()};
   e.oninput=handler;
   e.onchange=handler;
 }
});

function bindHistoryPagination(prefix,getPage,setPage,getTotal,render){
 const first=$("#"+prefix+"FirstBtn"),prev=$("#"+prefix+"PrevBtn"),next=$("#"+prefix+"NextBtn"),last=$("#"+prefix+"LastBtn"),numbers=$("#"+prefix+"PageNumbers");
 if(first)first.onclick=()=>{setPage(1);render();scrollPageTop(prefix)};
 if(prev)prev.onclick=()=>{if(getPage()>1){setPage(getPage()-1);render();scrollPageTop(prefix)}};
 if(next)next.onclick=()=>{
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   const target=Math.min(pages,getPage()+1);
   if(target!==getPage()){setPage(target);render();scrollPageTop(prefix)}
 };
 if(last)last.onclick=()=>{
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   setPage(pages);render();scrollPageTop(prefix)
 };
 if(numbers)numbers.addEventListener("click",e=>{
   const b=e.target.closest("[data-page]");
   if(!b)return;
   const size=prefix==="stockIn"?stockInPageSize:prefix==="stockOut"?stockOutPageSize:PAGE_SIZE;
   const pages=Math.max(1,Math.ceil(getTotal()/size));
   const target=Math.min(pages,Math.max(1,Number(b.dataset.page)||1));
   setPage(target);render();scrollPageTop(prefix)
 });
}
bindHistoryPagination("stockIn",()=>stockInPage,v=>stockInPage=v,()=>stockHistoryFiltered("IN").length,renderStock);
bindHistoryPagination("stockOut",()=>stockOutPage,v=>stockOutPage=v,()=>stockHistoryFiltered("OUT").length,renderStock);


// Category pagination
if($("#categoryFirstBtn"))$("#categoryFirstBtn").onclick=()=>{categoryPage=1;renderCategories();scrollPageTop("categories")};
if($("#categoryPrevBtn"))$("#categoryPrevBtn").onclick=()=>{if(categoryPage>1){categoryPage--;renderCategories();scrollPageTop("categories")}};
if($("#categoryNextBtn"))$("#categoryNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil((state.categories||[]).length/categoryPageSize));if(categoryPage<pages){categoryPage++;renderCategories();scrollPageTop("categories")}};
if($("#categoryLastBtn"))$("#categoryLastBtn").onclick=()=>{categoryPage=Math.max(1,Math.ceil((state.categories||[]).length/categoryPageSize));renderCategories();scrollPageTop("categories")};
$("#categoryPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){categoryPage=Number(b.dataset.page);renderCategories();scrollPageTop("categories")}});
if($("#categoryPageSize"))$("#categoryPageSize").onchange=e=>{categoryPageSize=Math.max(1,Number(e.target.value)||10);categoryPage=1;localStorage.setItem("sanlian_category_page_size",String(categoryPageSize));renderCategories()};
if($("#auditPageSize"))$("#auditPageSize").onchange=e=>{auditPageSize=Math.max(1,Number(e.target.value)||10);auditPage=1;localStorage.setItem("sanlian_audit_page_size",String(auditPageSize));renderAudit()};
["stockIn","stockOut"].forEach(prefix=>{
 const search=$("#"+prefix+"Search"),size=$("#"+prefix+"PageSize"),refresh=$("#"+prefix+"RefreshBtn");
 if(search)search.oninput=()=>{if(prefix==="stockIn")stockInPage=1;else stockOutPage=1;renderStock()};
 if(size)size.onchange=e=>{const v=Math.max(1,Number(e.target.value)||10);if(prefix==="stockIn"){stockInPageSize=v;stockInPage=1}else{stockOutPageSize=v;stockOutPage=1}localStorage.setItem("sanlian_"+prefix+"_page_size",String(v));renderStock()};
 if(refresh)refresh.onclick=()=>refreshAll().catch(e=>toast(e.message));
});
$("#auditBody")?.addEventListener("click",e=>{const tr=e.target.closest("[data-audit-index]");if(tr)openAuditDetail(tr.dataset.auditIndex)});
const closeAudit=()=>{const modal=$("#auditDetailModal");modal?.classList.remove("open");modal?.setAttribute("aria-hidden","true");document.body.classList.remove("modal-open")};
$("#closeAuditDetail")?.addEventListener("click",closeAudit);
$("#closeAuditDetailBottom")?.addEventListener("click",closeAudit);
$("#auditDetailModal")?.addEventListener("click",e=>{if(e.target===$("#auditDetailModal"))closeAudit()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#auditDetailModal")?.classList.contains("open"))closeAudit()});
document.addEventListener("click",e=>{if(e.target.closest("#closeAuditDetail,#closeAuditDetailBottom"))closeAudit()});


if($("#auditFirstBtn"))$("#auditFirstBtn").onclick=()=>{auditPage=1;renderAudit();scrollPageTop("audit")};
if($("#auditPrevBtn"))$("#auditPrevBtn").onclick=()=>{if(auditPage>1){auditPage--;renderAudit();scrollPageTop("audit")}};
if($("#auditNextBtn"))$("#auditNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(auditFiltered().length/auditPageSize));if(auditPage<pages){auditPage++;renderAudit();scrollPageTop("audit")}};
if($("#auditLastBtn"))$("#auditLastBtn").onclick=()=>{auditPage=Math.max(1,Math.ceil(auditFiltered().length/auditPageSize));renderAudit();scrollPageTop("audit")};
$("#auditPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){auditPage=Number(b.dataset.page);renderAudit();scrollPageTop("audit")}});
$("#productPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){productPage=Number(b.dataset.page);renderProducts();scrollPageTop("products")}});
if($("#productFirstBtn"))$("#productFirstBtn").onclick=()=>{productPage=1;renderProducts();scrollPageTop("products")};
if($("#productPrevBtn"))$("#productPrevBtn").onclick=()=>{if(productPage>1){productPage--;renderProducts();scrollPageTop("products")}};
if($("#productNextBtn"))$("#productNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(filteredProducts().length/productPageSize));if(productPage<pages){productPage++;renderProducts();scrollPageTop("products")}};
if($("#productLastBtn"))$("#productLastBtn").onclick=()=>{productPage=Math.max(1,Math.ceil(filteredProducts().length/productPageSize));renderProducts();scrollPageTop("products")};
if($("#productPageSize"))$("#productPageSize").onchange=e=>{productPageSize=Math.max(1,Number(e.target.value)||10);productPage=1;localStorage.setItem("sanlian_product_page_size",String(productPageSize));renderProducts()};
if($("#reportPageSize"))$("#reportPageSize").onchange=e=>{reportPageSize=Math.max(1,Number(e.target.value)||10);reportPage=1;localStorage.setItem("sanlian_report_page_size",String(reportPageSize));renderReport()};
$("#reportPageNumbers")?.addEventListener("click",e=>{const b=e.target.closest("[data-page]");if(b){reportPage=Number(b.dataset.page);renderReport();scrollPageTop("reports")}});
if($("#reportFirstBtn"))$("#reportFirstBtn").onclick=()=>{reportPage=1;renderReport();scrollPageTop("reports")};
if($("#reportPrevBtn"))$("#reportPrevBtn").onclick=()=>{if(reportPage>1){reportPage--;renderReport();scrollPageTop("reports")}};
if($("#reportNextBtn"))$("#reportNextBtn").onclick=()=>{const pages=Math.max(1,Math.ceil(filteredProducts(true).length/reportPageSize));if(reportPage<pages){reportPage++;renderReport();scrollPageTop("reports")}};
if($("#reportLastBtn"))$("#reportLastBtn").onclick=()=>{reportPage=Math.max(1,Math.ceil(filteredProducts(true).length/reportPageSize));renderReport();scrollPageTop("reports")};
$("#exportAuditBtn").onclick=exportAuditCsv;
$("#clearAuditBtn")?.addEventListener("click",clearAuditLogsAsAdmin);
$("#refreshAuditBtn").onclick=()=>{auditPage=1;refreshAll().catch(e=>toast(e.message))};
$("#archiveMonthlyBtn")?.addEventListener("click",archiveMonthlyTransactions);
$("#createBackupBtn").onclick=async()=>{if(!confirm(t("Create Supabase snapshot now?")))return;try{toast(t("Creating backup..."));await api("createBackup");await refreshAll();toast(t("Backup completed"))}catch(err){toast(err.message)}};
$("#backupBody")?.addEventListener("click",e=>{const b=e.target.closest("[data-delete-backup]");if(b)deleteBackupAsAdmin(b.dataset.deleteBackup)});
$("#downloadSnapshotBtn").onclick=downloadSnapshot;

const installAppBtn=$("#installAppBtn"); if(installAppBtn) installAppBtn.onclick=promptInstall;
const clearCache=$("#clearCacheBtn");if(clearCache)clearCache.onclick=clearOfflineCache;
const applyUpdate=$("#applyUpdateBtn");if(applyUpdate)applyUpdate.onclick=()=>{
  if(serviceWorkerRegistration?.waiting)serviceWorkerRegistration.waiting.postMessage("SKIP_WAITING");
};
// PWA disabled in clean deployment to prevent stale cache freezes.
window.addEventListener("DOMContentLoaded",async()=>{
  productPageSize=Math.max(1,Number(localStorage.getItem("sanlian_product_page_size"))||10);
  reportPageSize=Math.max(1,Number(localStorage.getItem("sanlian_report_page_size"))||10);
  categoryPageSize=Math.max(1,Number(localStorage.getItem("sanlian_category_page_size"))||10);
  auditPageSize=Math.max(1,Number(localStorage.getItem("sanlian_audit_page_size"))||10);
  stockInPageSize=Math.max(1,Number(localStorage.getItem("sanlian_stockIn_page_size"))||10);
  stockOutPageSize=Math.max(1,Number(localStorage.getItem("sanlian_stockOut_page_size"))||10);
  if($("#productPageSize"))$("#productPageSize").value=String(productPageSize);
  if($("#reportPageSize"))$("#reportPageSize").value=String(reportPageSize);
  if($("#categoryPageSize"))$("#categoryPageSize").value=String(categoryPageSize);
  if($("#auditPageSize"))$("#auditPageSize").value=String(auditPageSize);
  if($("#stockInPageSize"))$("#stockInPageSize").value=String(stockInPageSize);
  if($("#stockOutPageSize"))$("#stockOutPageSize").value=String(stockOutPageSize);
  initLanguage();
  // Keep the authenticated view visible during refresh when a cached session exists.
  if(sessionToken && currentUser){
    applyRole();
    showApp();
  }else{
    showLogin();
  }
  const backendEl=document.querySelector("#backendVersion");
  if(backendEl) backendEl.textContent=window.SANLIAN_SUPABASE?.configured?.() ? tl("Backend: Supabase checking...","后端：正在检查 Supabase...") : tl("Backend: Supabase config required","后端：需要 Supabase 配置");
  if(window.SANLIAN_SUPABASE?.configured?.())checkBackendVersion().catch(()=>{});
  window.setTimeout(()=>{
    restoreSession().catch(err=>{
      console.error("Session restore failed:",err);
      if(sessionToken && currentUser){
        applyRole();
        showApp();
        setText("#syncStatus",tl("● Offline","● 离线"));
      }else{
        showLogin();
        setText("#loginError",err?.message||tl("Session restore error","会话恢复错误"));
      }
    });
  },0);
});
