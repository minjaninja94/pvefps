"""Rebuild the browser/headless catalog from the checked-in JSON source."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
rows=json.loads((ROOT/'skin-catalog.json').read_text())
text="""/* Cosmetic catalog. Gameplay statistics live in the combat rules. */
(function(global){'use strict';
const SKINS=Object.freeze(DATA.map(s=>Object.freeze(s)));
const byId=new Map(SKINS.map(s=>[s.id,s]));
const api=Object.freeze({VERSION:'skin100-recovery-20261031',SKINS,get:id=>byId.get(id),validFor:(id,faction)=>byId.get(id)?.status==='ready'&&byId.get(id).faction===faction});
global.DesertSkinCatalog=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
""".replace('DATA',json.dumps(rows,ensure_ascii=False,separators=(',',':')))
(ROOT/'skin-catalog.js').write_text(text)
