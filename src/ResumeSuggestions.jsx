import React from 'react';

export function ResumeSuggestions({suggestions,selected,setSelected,busy}){
 const count=suggestions.filter(s=>selected.includes(s.id)).length;
 function toggle(id){setSelected(current=>current.includes(id)?current.filter(value=>value!==id):[...current,id]);}
 return <div className="simple-suggestions">
  <p className="suggestion-guide">{count} {count===1?'change':'changes'} chosen. You can also create a tailored resume without choosing any changes.</p>
  {suggestions.length===0&&<p className="suggestion-guide">No individual changes were suggested. You can still create your tailored resume below.</p>}
  {suggestions.map((s,index)=><article className="suggestion simple-suggestion" key={s.id}>
   <div className="suggestion-number" aria-hidden="true">{index+1}</div>
   <div className="suggestion-content"><h3>{s.title}</h3><p><strong>{s.applicable?'Why this helps:':'What you need to add:'}</strong> {s.detail}</p>
    {s.evidence&&<div className="suggestion-before"><span className="rewrite-label">Your current wording</span><p>{s.evidence}</p></div>}
    {s.applicable&&s.addition&&<div className="suggestion-after"><span className="rewrite-label">Suggested wording</span><p>{s.addition}</p></div>}
    <button type="button" className="button secondary" disabled={busy} aria-pressed={selected.includes(s.id)} onClick={()=>toggle(s.id)}>{selected.includes(s.id)?'Chosen ✓ — click to remove':'Use this change'}</button>{!s.applicable&&<p className="suggestion-input-note">We’ll use this as a tailoring priority. If your CV does not contain the needed facts, the tailored resume will include only supported details and flag what you need to confirm. Add this information to your original CV for a fuller change.</p>}
   </div>
  </article>)}
 </div>;
}
