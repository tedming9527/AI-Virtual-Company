// Explicit interface aliases only; never infer a capability from task keywords.
const aliases={
  'functions.exec_command':'Bash','functions.write_stdin':'Bash','functions.apply_patch':'apply_patch',
  ...Object.fromEntries(['spawn_agent','send_message','followup_task','list_agents','wait_agent','interrupt_agent'].map(name=>['collaboration.'+name,'collaboration'+name])),
};
const capabilities={shell:['Bash'],edit:['apply_patch'],delegation:['collaborationspawn_agent','collaborationsend_message','collaborationfollowup_task','collaborationlist_agents','collaborationwait_agent','collaborationinterrupt_agent']};
export function registerNativeTools(tools,requested=[]) {
  if(!Array.isArray(tools)||!Array.isArray(requested)||requested.some(c=>!Object.hasOwn(capabilities,c)))throw Error('Invalid explicit tool capabilities');
  const names=[...tools,...requested.flatMap(c=>capabilities[c])];
  if(!names.length||names.length>128||names.some(n=>typeof n!=='string'||!/^[a-zA-Z0-9_.:-]+$/.test(n)))throw Error('allowedTools must be exact native tool names, without wildcards');
  return {allowedTools:[...new Set(names.map(n=>aliases[n]||n))].sort(),mappings:names.filter(n=>aliases[n]).map(name=>({requested:name,native:aliases[name]}))};
}
