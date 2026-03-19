// LEONA — Event Data
export const EVENTS = [
  { id:'ev1', title:'Los Angeles Wildfire Complex', type:'wildfire', severity:'critical', location:'Los Angeles, CA, United States', lat:34.05, lng:-118.24, area:'47,200 acres', population:'128,000', containment:'8%', wind:'62 km/h', synthetic:true, description:'Palisades wildfire complex expanding under Santa Ana winds. Mandatory evacuations in 7 communities. Air quality hazardous.' },
  { id:'ev2', title:'Hurricane Elara', type:'hurricane', severity:'critical', location:'Caribbean Sea / Yucatan', lat:19.5, lng:-87.3, wind:'185 km/h', category:'Cat 2', landfall:'78% (72h)', surge:'2.4m', synthetic:true, description:'Category 2 intensity intensifying. 78% probability of Yucatan landfall within 72 hours.' },
  { id:'ev3', title:'Ukraine Conflict Escalation', type:'conflict', severity:'critical', location:'Sumy Oblast, Ukraine', lat:50.9, lng:34.8, synthetic:true, description:'Active conflict escalation with increased civilian exposure. Cross-border movements tracked via OSINT correlation.' },
  { id:'ev4', title:'Brahmaputra River Flooding', type:'flood', severity:'high', location:'Sylhet Division, Bangladesh', lat:24.9, lng:91.87, displaced:'2,100,000', synthetic:true, description:'River has crested danger level. Early displacement estimates at 340,000. Sentinel-1 SAR imagery monitoring.' },
  { id:'ev5', title:'Horn of Africa Drought Crisis', type:'drought', severity:'high', location:'Somalia / Ethiopia / Kenya', lat:4.0, lng:42.0, affected:'22,000,000', synthetic:true, description:'22M require urgent intervention. WFP activated emergency food pipelines. Risk Diffusion 91/100.' },
  { id:'ev6', title:'Turkey Earthquake Swarm', type:'earthquake', severity:'high', location:'Erzincan Province, Turkey', lat:39.75, lng:39.5, magnitude:'M5.8', aftershocks:12, synthetic:true, description:'M5.8 with NE migration pattern. Stress transfer models suggest elevated risk for Erzincan segment.' },
  { id:'ev7', title:'Rhine Valley Flooding', type:'flood', severity:'elevated', location:'Germany / Netherlands', lat:50.9, lng:6.96, synthetic:true, description:'River levels rising. Flood watch active across Rhine-Ruhr basin.' },
  { id:'ev8', title:'Kimberley Bushfire', type:'wildfire', severity:'high', location:'Western Australia', lat:-15.8, lng:128.7, area:'101,360 sq mi', synthetic:true, description:'Massive fire front progressing westward. AHI-H8 satellite confirms active progression.' },
  { id:'ev9', title:'M6.2 Mindanao Earthquake', type:'earthquake', severity:'elevated', location:'Davao del Sur, Philippines', lat:6.9, lng:125.5, magnitude:'M6.2', synthetic:true, description:'Shallow event at 12km depth. Tsunami advisory cleared.' },
  { id:'ev10', title:'Sahel Food Crisis', type:'drought', severity:'high', location:'Niger / Burkina Faso / Mali', lat:14.0, lng:2.0, affected:'4,700,000', synthetic:true, description:'Acute food insecurity across 3 countries. Seasonal harvest failure compounding existing crisis.' },
  { id:'ev11', title:'Mediterranean Heat Dome', type:'drought', severity:'elevated', location:'Southern Europe', lat:38.0, lng:14.0, synthetic:true, description:'Extreme heat event. Temperatures 8-12°C above seasonal average across Italy, Greece, Spain.' },
  { id:'ev12', title:'Cyclone Preparation — Bay of Bengal', type:'hurricane', severity:'monitoring', location:'Bay of Bengal', lat:14.0, lng:88.0, synthetic:true, description:'Low pressure system developing. 35% chance of cyclone formation within 96h.' },
  { id:'ev13', title:'Jakarta Flooding', type:'flood', severity:'elevated', location:'Jakarta, Indonesia', lat:-6.2, lng:106.85, displaced:'45,000', synthetic:true, description:'Seasonal flooding affecting 12 sub-districts. Emergency shelters activated.' },
  { id:'ev14', title:'Alaska Volcanic Activity', type:'volcano', severity:'monitoring', location:'Mount Spurr, Alaska', lat:61.3, lng:-152.25, synthetic:true, description:'Elevated seismicity. Aviation color code raised to YELLOW. No eruption imminent.' },
  { id:'ev15', title:'North Sea Storm Surge', type:'storm', severity:'monitoring', location:'North Sea / UK / Netherlands', lat:54.0, lng:3.0, synthetic:true, description:'Winter storm tracking across North Sea. Surge forecast 0.8-1.2m above normal tide levels.' },
];

export const GRI_COUNTRIES = [
  { name: 'Yemen', code: 'YE', gri: 91, trend: '↑', flag: '🇾🇪' },
  { name: 'Somalia', code: 'SO', gri: 89, trend: '↑', flag: '🇸🇴' },
  { name: 'South Sudan', code: 'SS', gri: 87, trend: '→', flag: '🇸🇸' },
  { name: 'Syria', code: 'SY', gri: 85, trend: '↓', flag: '🇸🇾' },
  { name: 'Afghanistan', code: 'AF', gri: 84, trend: '↑', flag: '🇦🇫' },
  { name: 'Sudan', code: 'SD', gri: 82, trend: '↑', flag: '🇸🇩' },
  { name: 'D.R. Congo', code: 'CD', gri: 79, trend: '→', flag: '🇨🇩' },
  { name: 'Haiti', code: 'HT', gri: 76, trend: '↑', flag: '🇭🇹' },
  { name: 'Myanmar', code: 'MM', gri: 75, trend: '↑', flag: '🇲🇲' },
  { name: 'Ukraine', code: 'UA', gri: 74, trend: '↑', flag: '🇺🇦' },
];

export const USER_AOIS = ['Los Angeles, CA', 'Ukraine', 'Horn of Africa', 'Bangladesh'];

export const COMMUNITY_POSTS = [
  { id: 'cp1', author: 'Dr. R. Chen', role: 'Seismologist · USGS', badge: 'VERIFIED', badgeColor: '#9B78FF', avatar: 'RC', text: 'M5.8 aftershock series in eastern Turkey shows clear NE migration pattern. Stress transfer models suggest elevated risk for the Erzincan segment over the next 72h.', tags: [{ label: '🌍 Earthquake', color: '#ff9800' }, { label: 'Turkey', color: null }], votes: 42, comments: 8, time: '2h ago' },
  { id: 'cp2', author: 'M. Watkins', role: 'Hurricane Specialist · NHC', badge: 'ANALYST', badgeColor: '#00E676', avatar: 'MW', text: 'Updated trajectory model for Elara. The trough interaction at 72h is now looking more likely to pull the track NW. Category 3 at landfall is my current call.', tags: [{ label: '🌀 Hurricane', color: '#f44336' }], votes: 89, comments: 24, time: '4h ago' },
  { id: 'cp3', author: 'K. Park', role: 'EMS Director · Seoul Metro', badge: null, badgeColor: null, avatar: 'KP', text: 'Sharing our updated flood response SOP after the monsoon season. We ran 4 tabletop exercises this quarter — DM if your agency wants to compare notes or share templates.', tags: [{ label: '🌊 Flood', color: '#4FC3F7' }], votes: 31, comments: 5, time: '6h ago' },
  { id: 'cp4', author: 'S. Okafor', role: 'Climate Analyst · AU', badge: 'VERIFIED', badgeColor: '#9B78FF', avatar: 'SO', text: 'Horn of Africa drought expanding into a 5th consecutive failed rainy season. This is now a climate-driven structural crisis, not a temporary event. Displacement pressure will intensify through Q1.', tags: [{ label: '☀️ Drought', color: '#ff9800' }], votes: 67, comments: 15, time: '8h ago' },
  { id: 'cp5', author: 'Mike S.', role: 'Incident Commander · Guardian Space', badge: 'STAFF', badgeColor: '#FF5722', avatar: 'MS', text: 'Sector 4 update: Air tanker drops completed. Fire line holding at the eastern perimeter. Wind shift at 17:00 remains our main concern — staging an additional Type 1 crew at Porter Ranch.', tags: [{ label: '🔥 Wildfire', color: '#FF6B35' }, { label: '#critical', color: '#FF3B3B' }], votes: 54, comments: 12, time: '31m ago' },
  { id: 'cp6', author: 'Ana S.', role: 'Logistics Coordinator · Guardian Space', badge: 'STAFF', badgeColor: '#FF5722', avatar: 'AS', text: 'Mutual aid from Ventura and San Bernardino Counties confirmed. 3 engines, 1 water tender arriving 15:30. Slotting them into sector 3. Secondary evac routes via SR-118 are now open — directing residents away from the 405 corridor.', tags: [{ label: '🔥 Wildfire', color: '#FF6B35' }], votes: 38, comments: 7, time: '52m ago' },
];

export const INBOX_THREADS = [
  { id: 'th1', type: 'system', name: 'LEONA System', icon: '◆', preview: '🔴 Evacuation Zone 6 activated — LA Wildfire Complex expanding. Wind shift forecast 17:00.', time: '2m', unread: true, pinned: true },
  { id: 'th2', type: 'channel', name: '# ops-critical', icon: '🏢', preview: 'Mike S: Air tanker drops completed. Fire line holding eastern perimeter.', time: '8m', unread: 3, pinned: true },
  { id: 'th3', type: 'channel', name: '# all-hands', icon: '📢', preview: 'Sarah K: Press briefing at 16:00 — Mike is speaking. Prep talking points.', time: '22m', unread: 2, pinned: true },
  { id: 'th4', type: 'dm', name: 'Ana S.', avatar: 'AS', preview: 'Can you share the Elara briefing deck before the 16:00 call?', time: '1h', unread: false, pinned: false },
  { id: 'th5', type: 'channel', name: '# intel-reports', icon: '📊', preview: 'LEONA: Weekly GRI Report — 6 countries flagged, Yemen 91/100', time: '3h', unread: false, pinned: false },
  { id: 'th6', type: 'dm', name: 'Tom J.', avatar: 'TJ', preview: 'Confirmed — field team arriving 14:00 local. Heavy smoke in approach zone.', time: '5h', unread: false, pinned: false },
  { id: 'th7', type: 'dm', name: 'Sarah K.', avatar: 'SK', preview: 'Got the media advisory live. County emergency app pushed. Any updates on zone 6?', time: '6h', unread: false, pinned: false },
  { id: 'th8', type: 'channel', name: '# field-teams', icon: '🧭', preview: 'Tom J: Sector 4 pulling back — visibility 200m. Regrouping at staging.', time: '7h', unread: false, pinned: false },
  { id: 'th9', type: 'system', name: 'LEONA Alerts', icon: '◆', preview: 'Hurricane Elara: Updated landfall probability 82% (↑4%) — 68h window.', time: '9h', unread: false, pinned: false },
];
