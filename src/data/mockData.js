export const mockShelves = [
  { id: 'A01', products: 18, level: 86, status: 'normal', min: 30, updated: 'Agora' },
  { id: 'A02', products: 15, level: 42, status: 'attention', min: 35, updated: '5 min atrás' },
  { id: 'A03', products: 12, level: 18, status: 'critical', min: 30, updated: '8 min atrás' },
  { id: 'A04', products: 20, level: 91, status: 'normal', min: 30, updated: '10 min atrás' },
  { id: 'B01', products: 16, level: 68, status: 'normal', min: 30, updated: '12 min atrás' },
  { id: 'B02', products: 11, level: 27, status: 'attention', min: 30, updated: '15 min atrás' }
]
export const mockProducts = [
  ['Arroz 5kg','A01',86,'Agora'],['Feijão 1kg','A02',42,'5 min'],['Macarrão','A03',18,'8 min'],['Açúcar 1kg','A04',91,'10 min']
].map(([name,shelf,level,updated])=>({name,shelf,level,updated}))
export const mockAlerts = [
  {id:1, shelf:'A03', message:'Estoque abaixo do nível mínimo', time:'Há 5 minutos', severity:'critical', resolved:false},
  {id:2, shelf:'A02', message:'Reposição recomendada', time:'Há 20 minutos', severity:'attention', resolved:false},
  {id:3, shelf:'A01', message:'Reposição concluída', time:'Há 1 hora', severity:'success', resolved:true},
  {id:4, shelf:'B02', message:'Nível próximo do mínimo', time:'Há 2 horas', severity:'attention', resolved:false}
]
export const mockHistory = Array.from({length: 8}, (_,i)=>({date:`${12+i}/09/2026`,time:`${8+i}:30`,shelf:['A01','A02','A03','A04'][i%4],product:['Arroz 5kg','Feijão 1kg','Macarrão','Açúcar 1kg'][i%4],level:[86,42,18,91][i%4],status:['Normal','Atenção','Crítico','Normal'][i%4]}))
export const mockNotifications = [{title:'Estoque crítico na A03',body:'Macarrão abaixo do mínimo',time:'5 min'},{title:'Reposição recomendada',body:'Prateleira A02 requer atenção',time:'20 min'},{title:'Sensor atualizado',body:'Todos os sensores online',time:'1 h'}]
export const chart7 = [{name:'Seg',value:72},{name:'Ter',value:68},{name:'Qua',value:75},{name:'Qui',value:63},{name:'Sex',value:70},{name:'Sáb',value:76},{name:'Dom',value:72}]
export const chart30 = [{name:'01',value:66},{name:'05',value:71},{name:'10',value:62},{name:'15',value:74},{name:'20',value:69},{name:'25',value:78},{name:'30',value:73}]
