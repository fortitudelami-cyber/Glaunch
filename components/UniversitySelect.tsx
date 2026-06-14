"use client"

import { useEffect, useMemo, useState } from 'react'

const UNIVERSITIES = [
      "Massachusetts Institute of Technology",
      "Stanford University",
      "Harvard University",
      "California Institute of Technology",
      "University of Chicago",
      "Princeton University",
      "Columbia University",
      "Yale University",
      "University of Pennsylvania",
      "Cornell University",
      "Duke University",
      "Northwestern University",
      "Johns Hopkins University",
      "University of Michigan",
      "New York University",
      "University of California Berkeley",
      "UCLA",
      "University of Texas Austin",
      "Georgia Institute of Technology",
      "Carnegie Mellon University",
      "University of Oxford",
      "University of Cambridge",
      "Imperial College London",
      "University College London",
      "London School of Economics",
      "University of Edinburgh",
      "University of Manchester",
      "King's College London",
      "University of Bristol",
      "University of Warwick",
      "University of Toronto",
      "University of British Columbia",
      "McGill University",
      "University of Alberta",
      "McMaster University",
      "University of Waterloo",
      "Western University",
      "Queen's University",
      "University of Melbourne",
      "Australian National University",
      "University of Sydney",
      "University of Queensland",
      "Monash University",
      "UNSW Sydney",
      "University of Adelaide",
      "ETH Zurich",
      "Technical University of Munich",
      "University of Amsterdam",
      "KU Leuven",
      "Delft University of Technology",
      "University of Copenhagen",
      "Uppsala University",
      "University of Helsinki",
      "Sorbonne University",
      "Sciences Po Paris",
      "Bocconi University",
      "University of Bologna",
      "Complutense University of Madrid",
      "University of Tokyo",
      "Kyoto University",
      "National University of Singapore",
      "Nanyang Technological University",
      "Peking University",
      "Tsinghua University",
      "Seoul National University",
      "KAIST",
      "Indian Institute of Technology Bombay",
      "Indian Institute of Technology Delhi",
      "University of Hong Kong",
      "Chinese University of Hong Kong",
      "University of Cape Town",
      "University of the Witwatersrand",
      "Stellenbosch University",
      "University of Pretoria",
      "University of Nairobi",
      "Makerere University",
      "University of Ghana",
      "University of Lagos",
      "Obafemi Awolowo University",
      "American University in Cairo",
      "University of Ibadan",
      "University of Dar es Salaam",
      "Addis Ababa University",
      "University of Khartoum",
      "American University of Beirut",
      "King Abdullah University of Science and Technology",
      "Tel Aviv University",
      "Hebrew University of Jerusalem",
      "Qatar University",
      "University of São Paulo",
      "National Autonomous University of Mexico",
      "University of Buenos Aires",
      "Pontifical Catholic University of Chile",
      "University of the Andes Colombia",
]

export function UniversitySelect({ value, onChange, id, placeholder }:{
  value: string
  onChange: (v: string) => void
  id?:string
  placeholder?:string
}){
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [customMode, setCustomMode] = useState(false)

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase()
    if(!q) return UNIVERSITIES
    return UNIVERSITIES.filter(u=>u.toLowerCase().includes(q))
  },[query])

  useEffect(()=>{
    if(value && !UNIVERSITIES.includes(value)) setCustomMode(true)
  },[value])

  return (
    <div className="relative">
      {!customMode ? (
        <>
          <input
            id={id}
            value={query || value}
            onChange={(e)=>{ setQuery(e.target.value); setOpen(true) }}
            onFocus={()=>setOpen(true)}
            placeholder={placeholder || 'Search your university'}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
          />
          {open && (
            <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1">
              {filtered.map((u)=> (
                <div key={u} className="px-3 py-2 hover:bg-muted-foreground/5 cursor-pointer" onMouseDown={()=>{ onChange(u); setOpen(false); setQuery('') }}>
                  {u}
                </div>
              ))}
              <div className="px-3 py-2 border-t text-sm text-muted-foreground">
                <button type="button" className="underline" onMouseDown={()=>{ setCustomMode(true); setOpen(false) }}>Other — type your university</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <input
          id={id}
          value={value}
          onChange={(e)=>onChange(e.target.value)}
          placeholder={placeholder || 'Type your university'}
          className="h-11 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none"
        />
      )}
    </div>
  )
}

export default UniversitySelect
